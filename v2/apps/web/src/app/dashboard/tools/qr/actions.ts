"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NOT_FOUND, dropQrFile, qrActor, qrStorage } from "./guard";
import {
  QR_FILE_EXT, QR_TITLE_MAX, checkCode, checkTarget, isQrFilePath, newQrCode, qrShortUrl, qrViewUrl,
  type QrKind,
} from "@/lib/qrLinks";
import { isHexColor, type QrSpec } from "@/lib/qr";
import { UPLOAD_RULES } from "@/lib/upload";

export type QrLinkResult = { ok: boolean; message: string; id?: string; code?: string };

/**
 * تحديثُ الغرفتين معًا: قائمةُ الباركودات وقائمةُ الحملات تقرآن الصفوفَ نفسَها،
 * فتبديلٌ في إحداهما يُرى في أختها بلا إعادة تحميل.
 */
const refresh = () => {
  revalidatePath("/dashboard/tools/qr/links");
  revalidatePath("/dashboard/tools/qr/campaigns");
};

// والحارسُ موضعُه `./guard` (مصدرٌ واحدٌ يقرؤه ملفّا الأفعال).


/** اسمُ الرمز كما يُقبَل: مقصوصُ الطرفين، غيرُ فارغ، ولا يتجاوز قيدَ القاعدة. */
function checkTitle(raw: string): { ok: true; title: string } | { ok: false; message: string } {
  const title = raw.trim();
  if (!title) return { ok: false, message: "سمِّ الباركود لتعرفه بين باركوداتك." };
  if (title.length > QR_TITLE_MAX) return { ok: false, message: `اسمُ الباركود أطولُ من ${QR_TITLE_MAX} حرفًا.` };
  return { ok: true, title };
}

/**
 * حدُّ حجم الوصفة.
 *
 * الشعارُ يُحفَظ مضمَّنًا (`data:`) عمدًا، فوصفةٌ بشعارٍ ثقيلٍ تبلغ ثلاثةَ أرباع الميغابايت
 * وتصير `jsonb` يُجلَب مع كلّ قراءةِ قائمة. والحدُّ يُقال للمستعمل بلسانٍ يفهمه: خفِّف
 * الشعار، لا «تجاوزتَ الحدّ الأقصى».
 */
const SPEC_MAX = 1_200_000;

/**
 * **الوصفةُ تُصدَّق قبل أن تُحفَظ** (٢٠٢٦-٠٩-٠٥).
 *
 * كانت تُقبَل كما جاءت: أيُّ JSON. وقيمُ الألوان تُقحَم بعدُ في سمات SVG ثمّ يُوضَع الناتجُ
 * في الصفحة، فقيمةٌ ملفّقةٌ تخرج من السمة إلى وسمٍ جديد. واليومَ أثرُها على صاحبها وحدَه
 * (سياسةُ own-row)، وغدًا — حين تُفتَح شاشةُ إشرافٍ تعرض وصفاتِ الناس — تصير ثغرةً مخزَّنة.
 * فتُغلَق قبل أن تُفتَح تلك الشاشة.
 *
 * **والشعارُ مضمَّنٌ لا مُشارٌ إليه**: رابطٌ خارجيٌّ في الوصفة يُلوّث لوحَ الرسم فيمنع تصدير
 * الصورة، ويجعل كلَّ فتحةِ صفحةٍ نداءً لخادمٍ غريبٍ يعدّ من فتحها.
 */
function checkSpec(spec: QrSpec): string | null {
  const colors: (string | null | undefined)[] = [
    spec.bg,
    spec.eye?.color,
    spec.pupil?.color,
    spec.frame?.color,
    spec.frame?.textColor,
    ...(spec.dots?.paint
      ? spec.dots.paint.kind === "solid"
        ? [spec.dots.paint.color]
        : [spec.dots.paint.from, spec.dots.paint.to]
      : []),
  ];
  for (const c of colors) {
    if (c === null || c === undefined) continue;
    if (!isHexColor(c)) return "لونٌ في التصميم غيرُ مفهوم. أعِد اختيار الألوان ثمّ احفظ.";
  }
  if (spec.logo && !/^data:image\//.test(spec.logo.href)) {
    return "الشعارُ يُدرَج ملفًّا لا رابطًا. ارفع الصورة ثمّ احفظ.";
  }
  if (!Number.isFinite(spec.size) || spec.size < 64 || spec.size > 4096) {
    return "مقاسُ الصورة خارج المدى المقبول.";
  }
  return null;
}

function packSpec(spec: QrSpec, code: string): { ok: true; spec: QrSpec } | { ok: false; message: string } {
  const why = checkSpec(spec);
  if (why) return { ok: false, message: why };
  // النصُّ المحفوظ هو الرابطُ القصير نفسُه: الوصفةُ ترسم الرمزَ بعد سنةٍ كما رُسم اليوم.
  const packed = { ...spec, text: qrShortUrl(code) };
  if (JSON.stringify(packed).length > SPEC_MAX) {
    return { ok: false, message: "الشعارُ المضمَّن ثقيل. اختر ملفًّا أخفّ ثمّ احفظ." };
  }
  return { ok: true, spec: packed };
}

/**
 * **حدّا الملفّ المحفوظ** — الـPDF بحدّ الدلو نفسِه (م٢٤)، والصورةُ بحدٍّ أضيق: تصل مصغَّرةً
 * (نحو نصف ميغابايت)، فصورةٌ فوق أربعةٍ لم تمرّ بالتصغير ولا تُقبل.
 */
const FILE_RULE = UPLOAD_RULES.qrFileStored;
const IMAGE_MAX = 4 * 1024 * 1024;

/** ملفٌّ لم يصل أو لم يُختر: جملةٌ واحدةٌ لعيبٍ واحد. */
const NO_FILE = "لم يُرفع الملف. اختره مرّةً أخرى.";

/**
 * **رسائلُ حارس الملفّ في القاعدة تُترجَم هنا** (`qr_file_guard`): رموزٌ لا يقرؤها صاحبُ
 * الشاشة، والتفرّدُ على المسار (ملفٌّ واحدٌ لصفٍّ واحد) يُقال بلسانه.
 */
function fileError(message: string): string {
  if (message.includes("QR_FILE_NOT_YOURS")) return "هذا الملفُّ ليس ممّا رفعتَه.";
  if (message.includes("QR_FILE_MISSING")) return "لم يصل الملفُّ إلى المخزن. اختره مرّةً أخرى.";
  if (message.includes("file_path")) return "هذا الملفُّ مربوطٌ بباركودٍ آخر.";
  return message;
}

export type QrUploadTicket = { ok: boolean; message: string; path?: string; token?: string };

/**
 * **رابطُ رفعٍ موقَّعٌ لملفّ الباركود** — الرفعُ نفسُه يجري من المتصفّح إلى الدلو مباشرةً
 * (`uploadToSignedUrl`)، فيتجاوز حدَّ جسم فعل الخادم (نحو ميغابايت) ولا يمرّ الملفُّ بنا مرّتين.
 * سابقةُ صفحات المكتبة بحرفها.
 *
 * **والمسارُ يصكّه الخادمُ لا المتصفّح**: يبدأ بمعرّف صاحب الجلسة، وبقيّتُه عشوائيّة. فلا يكتب
 * أحدٌ في مجلّد غيره، ولا يُخمَّن مسارُ ملفٍّ لم يُنشَر بعد. والحجمُ والصيغةُ يُسألان هنا قبل
 * الصكّ، والدلوُ يردّ ما يفلت (حدُّه وصيغُه في الترحيل).
 */
export async function prepareQrFileUpload(mime: string, bytes: number): Promise<QrUploadTicket> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const ext = QR_FILE_EXT[mime];
  if (!ext) return { ok: false, message: `الصيغةُ غير مدعومة، المدعوم ${FILE_RULE.formats}` };
  const max = ext === "pdf" ? FILE_RULE.maxBytes : IMAGE_MAX;
  if (!(bytes > 0) || bytes > max) {
    return { ok: false, message: ext === "pdf" ? "ملفُّ PDF أثقلُ ممّا يُحفَظ. اختر أصغرَ منه." : "الصورةُ أثقلُ ممّا يُحفَظ ولو بعد تصغيرها. اختر غيرَها." };
  }

  const store = qrStorage();
  if (!store) return { ok: false, message: "إعدادُ الخادم ناقص (مفتاح الخدمة)." };

  const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await store.createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: `تعذّر تجهيز الرفع: ${error?.message ?? "سببٌ غير معروف"}` };
  return { ok: true, message: "", path: data.path, token: data.token };
}

/**
 * حفظُ رمزٍ جديد.
 *
 * **والرمزُ القصير يُولَّد هنا لا في القاعدة**: التصادمُ يُعالَج بإعادة المحاولة، وقيدُ
 * التفرّد في القاعدة هو الحَكَم لا فحصٌ مسبقٌ يسبق سباقًا. وسبعُ محاولاتٍ من مساحةِ
 * سبعةٍ وعشرين مليارًا تكفي وزيادة.
 */
export async function createQrLink(input: {
  title: string;
  /** الوجهةُ إن كانت رابطًا. وتُهمَل للملفّ: وجهتُه صفحتُه، يكتبها الخادمُ من الرمز. */
  target?: string;
  /**
   * **نوعُ الوجهة** (م٢١ وم٢٤). والملفُّ يأتي بمساره في الدلو بعد أن رُفع برابطٍ صكّه
   * `prepareQrFileUpload`، ويُفحَص أنّ المسارَ مسارُ صاحب الجلسة.
   */
  kind?: QrKind;
  filePath?: string;
  spec: QrSpec;
  /** رمزٌ يختاره صاحبُه (`‎/q/majles`). يُترَك فارغًا فيُقرَع سبعةٌ بلا ملتبِس. */
  code?: string;
  /**
   * حاويتُه إن وُلد داخل حملة (زرُّ «باركود جديد» في غرفتها). وتصديقُها في القاعدة:
   * محفّزُ `qr_campaign_guard` يردّ حاويةً ليست لمالكه، فلا يُفحَص هنا مرّتين.
   */
  campaignId?: string | null;
}): Promise<QrLinkResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const kind: QrKind = input.kind === "file" ? "file" : "link";
  const filePath = kind === "file" ? input.filePath ?? null : null;
  if (kind === "file" && !(filePath && isQrFilePath(filePath, me.id))) return { ok: false, message: NO_FILE };

  /**
   * **وما لم يُنشَأ لا يبقى ملفُّه**: كلُّ ردٍّ بعد هذا السطر يمحو الملفَّ المرفوع، فلا يتراكم في
   * الدلو ما لا يشير إليه صفّ (و`dropQrFile` لا يمحو ملفًّا يشير إليه صفٌّ آخر).
   */
  const fail = async (message: string): Promise<QrLinkResult> => {
    if (filePath) await dropQrFile(filePath);
    return { ok: false, message };
  };

  const title = checkTitle(input.title);
  if (!title.ok) return fail(title.message);
  let targetUrl: string | null = null;
  if (kind === "link") {
    const target = checkTarget(input.target ?? "");
    if (!target.ok) return fail(target.message);
    targetUrl = target.url;
  }

  /**
   * **المختارُ محاولةٌ واحدة، والمقروعُ سبع** (٢٠٢٦-٠٩-٠٥): تصادمُ المقروع حظٌّ يُعاد الرمي
   * له، وتصادمُ المختار خبرٌ يُقال لصاحبه («هذا الرمزُ مأخوذ») — فإعادةُ قرعه تعطيه رمزًا
   * لم يطلبه.
   */
  const wanted = input.code ? checkCode(input.code) : null;
  if (wanted && !wanted.ok) return fail(wanted.message);

  const sb = await createClient();
  const tries = wanted ? 1 : 7;
  for (let attempt = 0; attempt < tries; attempt++) {
    const code = wanted?.ok ? wanted.code : newQrCode();
    const spec = packSpec(input.spec, code);
    if (!spec.ok) return fail(spec.message);

    const { data, error } = await sb
      .from("qr_links")
      .insert({
        code,
        title: title.title,
        // الملفُّ وجهتُه صفحتُه، والرمزُ جزءٌ منها: تُكتب مع كلّ رميةٍ لا مرّةً قبلها
        target_url: kind === "file" ? qrViewUrl(code) : targetUrl,
        kind,
        file_path: filePath,
        spec: spec.spec,
        owner_id: me.id,
        campaign_id: input.campaignId ?? null,
      })
      .select("id, code")
      .single();

    if (!error && data) {
      refresh();
      return { ok: true, message: "حُفظ الباركود، ووجهتُه تُعدَّل بعد الطباعة.", id: data.id, code: data.code };
    }
    // تصادمُ المسار لا الرمز: إعادةُ الرمي لا تنفع.
    if (error?.code === "23505" && error.message.includes("file_path")) return fail(fileError(error.message));
    // 23505 = تصادمُ تفرّد: رمزٌ آخرُ سبقنا إليه، فيُعاد الرمي لا الطلب.
    if (error?.code === "23505" && wanted) {
      return fail(`الرمزُ «${wanted.ok ? wanted.code : ""}» مأخوذٌ لباركودٍ آخر. اختر غيرَه.`);
    }
    if (error?.code !== "23505") return fail(`تعذّر حفظ الباركود: ${fileError(error?.message ?? "سببٌ غير معروف")}`);
  }
  return fail("تعذّر توليد باركودٍ غير مستعمَل. أعِد المحاولة.");
}

/**
 * **تعديلُ الاسم والوجهة — والنوعُ معهما** (م٢٣ وم٢٤). والرمزُ المطبوعُ لا يمسّه هذا بشيء، وتلك
 * علّةُ النظام كلِّه: الملصقُ يحمل ‎/q/<code>‎ رابطًا كان أو ملفًّا، فتحويلُه وجهةٌ كسائر الوجهات.
 *
 * فعلٌ واحدٌ لأربعة: اسمٌ وحدَه، ووجهةُ رابطٍ تتبدّل، وملفٌّ يُستبدَل، ونوعٌ يتحوّل. والصفُّ يُقرأ
 * أوّلًا لأنّ ما يُكتب يتبع ما كان: رابطٌ صار ملفًّا تُكتب وجهتُه صفحتَه من رمزه، وملفٌّ صار رابطًا
 * يُمحى مسارُه. وقيودُ القاعدة (`qr_links_file_shape` و`qr_links_file_target`) تردّ صفًّا نصفُه
 * رابطٌ ونصفُه ملف لو أفلت شيءٌ من هنا.
 *
 * **والترتيبُ ترتيبُ الأفتار**: يُكتب الجديدُ أوّلًا، ثمّ يُمحى القديمُ بعد أن تقبل القاعدة. فلو
 * تعثّرت الكتابةُ بقي الباركودُ على حاله ومُحي المرفوعُ الجديدُ وحدَه، ولو تعثّر المحوُ بقي يتيمٌ
 * لا يؤذي. والعكسُ يترك باركودًا يعرض ملفًّا محذوفًا.
 *
 * والصفُّ يُقرأ ويُكتب بعميل الجلسة: المالكُ والشريكُ المحرِّرُ وحدهما يبلغانه (سياساتُ القاعدة).
 */
export async function updateQrLink(
  id: string,
  input: { title: string; kind?: QrKind; target?: string; filePath?: string },
): Promise<QrLinkResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const newFile = input.filePath ?? null;
  if (newFile && !isQrFilePath(newFile, me.id)) return { ok: false, message: NO_FILE };
  const fail = async (message: string): Promise<QrLinkResult> => {
    if (newFile) await dropQrFile(newFile);
    return { ok: false, message };
  };

  const title = checkTitle(input.title);
  if (!title.ok) return fail(title.message);

  const sb = await createClient();
  const { data: row, error: readErr } = await sb.from("qr_links").select("kind, code, file_path").eq("id", id).maybeSingle();
  if (readErr) return fail(readErr.message);
  if (!row) return fail(NOT_FOUND);
  const was = row as { kind: QrKind; code: string; file_path: string | null };
  const kind: QrKind = input.kind ?? was.kind;

  const patch: { title: string; updated_at: string; kind?: QrKind; target_url?: string; file_path?: string | null } = {
    title: title.title,
    updated_at: new Date().toISOString(),
  };
  if (kind === "link") {
    if (input.target !== undefined || was.kind !== "link") {
      const target = checkTarget(input.target ?? "");
      if (!target.ok) return fail(target.message);
      patch.target_url = target.url;
    }
    if (was.kind !== "link") { patch.kind = "link"; patch.file_path = null; }
    // ملفٌّ رُفع لباركودٍ يبقى رابطًا لا موضعَ له: يُمحى
    if (newFile) await dropQrFile(newFile);
  } else {
    if (newFile) patch.file_path = newFile;
    else if (was.kind !== "file") return fail(NO_FILE);
    if (was.kind !== "file") { patch.kind = "file"; patch.target_url = qrViewUrl(was.code); }
  }

  const { data, error } = await sb.from("qr_links").update(patch).eq("id", id).select("id").maybeSingle();
  if (error) return fail(`تعذّر التعديل: ${fileError(error.message)}`);
  // لا صفَّ أصابه التعديل: إمّا لا وجود له، وإمّا ليس لك. والسياسةُ لا تفرّق فلا نفرّق.
  if (!data) return fail(NOT_FOUND);

  const kept = kind === "file" ? newFile ?? was.file_path : null;
  if (was.file_path && was.file_path !== kept) await dropQrFile(was.file_path);

  refresh();
  revalidatePath(`/dashboard/tools/qr/${id}`);
  const message =
    was.kind !== kind
      ? kind === "file"
        ? "صار الباركود يعرض ملفًّا، والملصقُ المطبوعُ كما هو."
        : "صار الباركود رابطًا، والملصقُ المطبوعُ كما هو."
      : newFile
        ? "استُبدل الملف، ومن يمسح الباركود الآن يراه."
        : patch.target_url
          ? "حُدّثت الوجهة، ومن يمسح الباركود الآن يصل إليها."
          : "حُفظ اسمُ الباركود.";
  return { ok: true, message };
}

/**
 * **حفظُ وصفة الرسم وحدها** — بابُ التصميم (`‎[id]/design`).
 *
 * الاسمُ والوجهةُ لهما فعلُهما (`updateQrLink`)، وهذا للشكل. والنصُّ المحفوظ في الوصفة
 * يُكتَب هنا من **رمز الصفّ نفسِه** لا ممّا أرسله المتصفّح: الوصفةُ تُعيد رسمَ الرمز بعد
 * سنة، فلو حملت نصًّا من العميل لأمكن أن تُرسَم صورةٌ تقود إلى غير ما يقوله الصفّ.
 */
export async function updateQrSpec(id: string, spec: QrSpec): Promise<QrLinkResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  // الرمزُ يُقرأ من الصفّ: سياسةُ own-row هي التي تقول «هذا لك» لا سطرٌ في التطبيق.
  const { data: row, error: readErr } = await sb.from("qr_links").select("code").eq("id", id).maybeSingle();
  if (readErr) return { ok: false, message: readErr.message };
  if (!row) return { ok: false, message: NOT_FOUND };

  const packed = packSpec(spec, (row as { code: string }).code);
  if (!packed.ok) return { ok: false, message: packed.message };

  const { error } = await sb.from("qr_links").update({ spec: packed.spec, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, message: error.message };

  refresh();
  revalidatePath(`/dashboard/tools/qr/${id}`);
  return { ok: true, message: "حُفظ التصميم." };
}

/**
 * إيقافُ الرمز وإحياؤه.
 *
 * **والإيقافُ لا الحذفُ هو الجواب** حين ينتهي غرضُ ملصقٍ: الورقةُ في الشارع لا تُسحب،
 * ورمزٌ موقوفٌ يردّ قاصدَه بأدبٍ ويُبقي أثرَه. والمحذوفُ يذهب بمسحاته كلِّها.
 */
export async function setQrLinkActive(id: string, active: boolean): Promise<QrLinkResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_links")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: `تعذّر تغيير الحالة: ${error.message}` };
  if (!data) return { ok: false, message: NOT_FOUND };

  refresh();
  return { ok: true, message: active ? "عاد الباركود يعمل." : "أُوقف الباركود، ومن يمسحه يجد صفحةَ «غير موجود»." };
}

/**
 * حذفُ الرمز ومسحاته معًا (`on delete cascade`). ولا رجعةَ فيه، فالتأكيدُ في الواجهة.
 *
 * **وملفُّه يُمحى بعده** (م٢١): الحذفُ المتسلسلُ لا يبلغ الدلو. والمسارُ يُقرأ من الصفّ
 * المحذوف نفسِه (`returning`) فلا يُمحى إلّا ما كان له.
 */
export async function deleteQrLink(id: string): Promise<QrLinkResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  const { data, error } = await sb.from("qr_links").delete().eq("id", id).select("id, file_path").maybeSingle();
  if (error) return { ok: false, message: `تعذّر الحذف: ${error.message}` };
  if (!data) return { ok: false, message: NOT_FOUND };
  await dropQrFile((data as { file_path: string | null }).file_path);

  refresh();
  return { ok: true, message: "حُذف الباركود ومسحاتُه." };
}

/**
 * **هل الرمزُ مأخوذ؟** — يُسأل والمستعمِلُ يكتب، فيُقال «متاح» أو «مأخوذ» قبل الضغط.
 *
 * والسؤالُ يمرّ بدالّةٍ في القاعدة لا باستعلامٍ مباشر: سياسةُ own-row تُخفي رموزَ الناس،
 * فاستعلامُ الشاشة يقول «متاح» عن رمزٍ يملكه غيرُك ثمّ يردّه قيدُ التفرّد عند الحفظ.
 * وترجع الدالّةُ وجودًا لا بيانات، وهو معلومٌ أصلًا لمن زار `‎/q/<code>`.
 */
export async function isQrCodeTaken(code: string): Promise<{ ok: boolean; taken?: boolean; message?: string }> {
  const { me, deny } = await qrActor();
  if (!me) return { ok: false, message: deny!.message };

  const checked = checkCode(code);
  if (!checked.ok) return { ok: false, message: checked.message };

  const sb = await createClient();
  const { data, error } = await sb.rpc("qr_code_taken", { p_code: checked.code });
  if (error) return { ok: false, message: error.message };
  return { ok: true, taken: data === true };
}

/**
 * **إضافةُ نافذةِ وجهة** — الملصقُ نفسُه يوصّل إلى شيئين في وقتين.
 *
 * والوقتُ يصل من الشاشة **بتوقيت الرياض** لا بساعة الجهاز: المتصفّح يعطي «٢٠٢٦-٠٩-١٠T١٩:٠٠»
 * بلا منطقة، فلو فُسّرت بمنطقة الجهاز لاختلفت النافذةُ باختلاف من يكتبها. والسعوديّةُ بلا
 * توقيتٍ صيفيّ، فالإزاحةُ ثابتةٌ ‏+03:00 (درسُ `lib/dates`: لا تُحسَب المواقيتُ بساعة الجهاز).
 */
export async function addQrSchedule(
  linkId: string,
  input: { target: string; startsAt: string | null; endsAt: string | null; note: string | null },
): Promise<QrLinkResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const target = checkTarget(input.target);
  if (!target.ok) return { ok: false, message: target.message };

  const at = (local: string | null) => (local ? new Date(`${local}:00+03:00`).toISOString() : null);
  const startsAt = at(input.startsAt);
  const endsAt = at(input.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt) {
    return { ok: false, message: "نهايةُ النافذة قبل بدايتها. راجِع الوقتين." };
  }

  const sb = await createClient();
  const { error } = await sb.from("qr_schedules").insert({
    link_id: linkId,
    target_url: target.url,
    starts_at: startsAt,
    ends_at: endsAt,
    note: input.note?.trim() || null,
  });
  if (error) return { ok: false, message: error.message };

  refresh();
  revalidatePath(`/dashboard/tools/qr/${linkId}`);
  return { ok: true, message: "أُضيفت النافذة، وستعمل في وقتها بلا أن تلمس الملصق." };
}

/** حذفُ نافذة. والمحفّزُ يقيّد الحذفَ في السجلّ كما يقيّد الإضافة. */
export async function deleteQrSchedule(id: string, linkId: string): Promise<QrLinkResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  const { error } = await sb.from("qr_schedules").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  refresh();
  revalidatePath(`/dashboard/tools/qr/${linkId}`);
  return { ok: true, message: "حُذفت النافذة." };
}

/**
 * **مشاركةُ الباركود** — إذنان لا واحد: `read` يقرأ الإحصاء، و`edit` يبدّل الوجهةَ
 * والتصميمَ والحالَ والجدول. والحذفُ والنقلُ والمشاركةُ نفسُها تبقى للمالك وحدَه.
 *
 * والحارسُ في القاعدة: سياسةُ الكتابة على جدول الشركاء تشترط أن يكون الفاعلُ **مالكَ**
 * الباركود، وأن يملك المشارَكُ معه قدرةَ المولّد. فما لم تأذن به السياسةُ يُردّ ههنا بلا
 * صفٍّ متأثّر، لا يقفُ عليه سطرٌ في التطبيق.
 */
export async function shareQrLink(linkId: string, userId: string, access: "read" | "edit"): Promise<QrLinkResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_link_shares")
    .upsert({ link_id: linkId, user_id: userId, access, granted_by: me.id }, { onConflict: "link_id,user_id" })
    .select("user_id")
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      message: error.code === "42501" || error.code === "23514"
        ? "لا تستطيع المشاركة: إمّا أنّك لست مالكَ الباركود، وإمّا أنّ من تشاركه لا يملك صلاحيّة مولّد الباركود."
        : error.message,
    };
  }
  if (!data) return { ok: false, message: NOT_FOUND };

  refresh();
  revalidatePath(`/dashboard/tools/qr/${linkId}/settings`);
  return { ok: true, message: access === "edit" ? "شُورك الباركود بإذن التحرير." : "شُورك الباركود للقراءة." };
}

/**
 * **تبديلُ إذن شريكٍ قائم** — من القراءة إلى التحرير وبالعكس.
 *
 * وفعلٌ مستقلٌّ لا نداءٌ ثانٍ للمشاركة (المالك ٢٠٢٦-٠٩-٠٦): «شُورك الباركود» جوابٌ عن
 * إدخالِ شريكٍ جديد، ومن بدّل إذنَ شريكٍ عنده يريد أن يُقال له ما صار إليه.
 */
export async function setQrShareAccess(
  linkId: string,
  userId: string,
  access: "read" | "edit",
): Promise<QrLinkResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_link_shares")
    .update({ access })
    .eq("link_id", linkId)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: NOT_FOUND };

  refresh();
  revalidatePath(`/dashboard/tools/qr/${linkId}/settings`);
  return {
    ok: true,
    message: access === "edit" ? "صار يحرّر الباركود." : "صار يقرأ الإحصاء ولا يبدّل شيئًا.",
  };
}

/** إخراجُ شريك. للمالك وحدَه، كالإدخال. */
export async function unshareQrLink(linkId: string, userId: string): Promise<QrLinkResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  const { error } = await sb.from("qr_link_shares").delete().eq("link_id", linkId).eq("user_id", userId);
  if (error) return { ok: false, message: error.message };

  refresh();
  revalidatePath(`/dashboard/tools/qr/${linkId}/settings`);
  return { ok: true, message: "أُخرج الشريك." };
}
