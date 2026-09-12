"use server";

import { revalidatePath } from "next/cache";
import { getSessionAdmin } from "@/lib/auth";
import { SECTION_CAP } from "@/lib/capabilities";
import { createClient } from "@/lib/supabase/server";
import { QR_TITLE_MAX, checkCode, checkTarget, newQrCode, qrShortUrl } from "@/lib/qrLinks";
import { isHexColor, type QrSpec } from "@/lib/qr";

export type QrLinkResult = { ok: boolean; message: string; id?: string; code?: string };

const CAP = SECTION_CAP["/dashboard/tools/qr"];
const refresh = () => revalidatePath("/dashboard/tools/qr");

/**
 * حارسُ كلّ فعلٍ هنا — **صاحبُ الجلسة لا المُعايَن**.
 *
 * لأنّ الصفَّ يُنسَب إلى `auth.uid()` في القاعدة على كلّ حال (سياسةُ own-row)، فلو
 * صدّقنا هويّةً مستعارةً لأذِنّا بفعلٍ باسمِ من لا يملكه ثمّ كتبناه باسمِ من يملكه.
 * والحدُّ الموصوف في `lib/view-as`: المعاينةُ رؤيةٌ لا سلطة.
 */
async function authorized() {
  const me = await getSessionAdmin();
  if (!me) return { me: null, deny: { ok: false, message: "جلستك غير صالحة." } };
  if (!me.caps.includes(CAP)) return { me: null, deny: { ok: false, message: "لا تملك صلاحية مولّد الباركود." } };
  return { me, deny: null };
}

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
/** جوابُ من طلب صفًّا ليس له أو لم يعد موجودًا. لا يفرّق بين المعدوم وملكِ غيرِه. */
const NOT_FOUND = "لم يُعثر على الباركود.";

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
 * حفظُ رمزٍ جديد.
 *
 * **والرمزُ القصير يُولَّد هنا لا في القاعدة**: التصادمُ يُعالَج بإعادة المحاولة، وقيدُ
 * التفرّد في القاعدة هو الحَكَم لا فحصٌ مسبقٌ يسبق سباقًا. وسبعُ محاولاتٍ من مساحةِ
 * سبعةٍ وعشرين مليارًا تكفي وزيادة.
 */
export async function createQrLink(input: {
  title: string;
  target: string;
  spec: QrSpec;
  /** رمزٌ يختاره صاحبُه (`‎/q/majles`). يُترَك فارغًا فيُقرَع سبعةٌ بلا ملتبِس. */
  code?: string;
}): Promise<QrLinkResult> {
  const { me, deny } = await authorized();
  if (!me) return deny!;

  const title = checkTitle(input.title);
  if (!title.ok) return { ok: false, message: title.message };
  const target = checkTarget(input.target);
  if (!target.ok) return { ok: false, message: target.message };

  /**
   * **المختارُ محاولةٌ واحدة، والمقروعُ سبع** (٢٠٢٦-٠٩-٠٥): تصادمُ المقروع حظٌّ يُعاد الرمي
   * له، وتصادمُ المختار خبرٌ يُقال لصاحبه («هذا الرمزُ مأخوذ») — فإعادةُ قرعه تعطيه رمزًا
   * لم يطلبه.
   */
  const wanted = input.code ? checkCode(input.code) : null;
  if (wanted && !wanted.ok) return { ok: false, message: wanted.message };

  const sb = await createClient();
  const tries = wanted ? 1 : 7;
  for (let attempt = 0; attempt < tries; attempt++) {
    const code = wanted?.ok ? wanted.code : newQrCode();
    const spec = packSpec(input.spec, code);
    if (!spec.ok) return { ok: false, message: spec.message };

    const { data, error } = await sb
      .from("qr_links")
      .insert({ code, title: title.title, target_url: target.url, spec: spec.spec, owner_id: me.id })
      .select("id, code")
      .single();

    if (!error && data) {
      refresh();
      return { ok: true, message: "حُفظ الباركود، ووجهتُه تُعدَّل بعد الطباعة.", id: data.id, code: data.code };
    }
    // 23505 = تصادمُ تفرّد: رمزٌ آخرُ سبقنا إليه، فيُعاد الرمي لا الطلب.
    if (error?.code === "23505" && wanted) {
      return { ok: false, message: `الرمزُ «${wanted.ok ? wanted.code : ""}» مأخوذٌ لباركودٍ آخر. اختر غيرَه.` };
    }
    if (error?.code !== "23505") return { ok: false, message: `تعذّر حفظ الباركود: ${error?.message ?? "سببٌ غير معروف"}` };
  }
  return { ok: false, message: "تعذّر توليد باركودٍ غير مستعمَل. أعِد المحاولة." };
}

/** تعديلُ الاسم أو الوجهة. والرمزُ المطبوعُ لا يمسّه هذا بشيء، وتلك علّةُ النظام كلِّه. */
export async function updateQrLink(id: string, input: { title: string; target: string }): Promise<QrLinkResult> {
  const { me, deny } = await authorized();
  if (!me) return deny!;

  const title = checkTitle(input.title);
  if (!title.ok) return { ok: false, message: title.message };
  const target = checkTarget(input.target);
  if (!target.ok) return { ok: false, message: target.message };

  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_links")
    .update({ title: title.title, target_url: target.url, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: `تعذّر التعديل: ${error.message}` };
  // لا صفَّ أصابه التعديل: إمّا لا وجود له، وإمّا ليس لك. والسياسةُ لا تفرّق فلا نفرّق.
  if (!data) return { ok: false, message: NOT_FOUND };

  refresh();
  return { ok: true, message: "حُدّثت الوجهة، ومن يمسح الباركود الآن يصل إليها." };
}

/**
 * **حفظُ وصفة الرسم وحدها** — بابُ التصميم (`‎[id]/design`).
 *
 * الاسمُ والوجهةُ لهما فعلُهما (`updateQrLink`)، وهذا للشكل. والنصُّ المحفوظ في الوصفة
 * يُكتَب هنا من **رمز الصفّ نفسِه** لا ممّا أرسله المتصفّح: الوصفةُ تُعيد رسمَ الرمز بعد
 * سنة، فلو حملت نصًّا من العميل لأمكن أن تُرسَم صورةٌ تقود إلى غير ما يقوله الصفّ.
 */
export async function updateQrSpec(id: string, spec: QrSpec): Promise<QrLinkResult> {
  const { me, deny } = await authorized();
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
  const { me, deny } = await authorized();
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

/** حذفُ الرمز ومسحاته معًا (`on delete cascade`). ولا رجعةَ فيه، فالتأكيدُ في الواجهة. */
export async function deleteQrLink(id: string): Promise<QrLinkResult> {
  const { me, deny } = await authorized();
  if (!me) return deny!;

  const sb = await createClient();
  const { data, error } = await sb.from("qr_links").delete().eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, message: `تعذّر الحذف: ${error.message}` };
  if (!data) return { ok: false, message: NOT_FOUND };

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
  const { me, deny } = await authorized();
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
  const { me, deny } = await authorized();
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
  const { me, deny } = await authorized();
  if (!me) return deny!;

  const sb = await createClient();
  const { error } = await sb.from("qr_schedules").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  refresh();
  revalidatePath(`/dashboard/tools/qr/${linkId}`);
  return { ok: true, message: "حُذفت النافذة." };
}

/**
 * **وسمُ الباركود بحملته.**
 *
 * الوسومُ تُكتَب في الشاشة سطرًا واحدًا تفصله فواصل، فتُشطَر هنا وتُقصّ أطرافُها ويُسقَط
 * المكرَّرُ والفارغ. والفاصلةُ ممنوعةٌ داخل الوسم في القاعدة لهذا بعينه: هي فاصلُ الكتابة.
 */

/**
 * **مشاركةُ الباركود** — إذنان لا واحد: `read` يقرأ الإحصاء، و`edit` يبدّل الوجهةَ
 * والتصميمَ والحالَ والجدول. والحذفُ والنقلُ والمشاركةُ نفسُها تبقى للمالك وحدَه.
 *
 * والحارسُ في القاعدة: سياسةُ الكتابة على جدول الشركاء تشترط أن يكون الفاعلُ **مالكَ**
 * الباركود، وأن يملك المشارَكُ معه قدرةَ المولّد. فما لم تأذن به السياسةُ يُردّ ههنا بلا
 * صفٍّ متأثّر، لا يقفُ عليه سطرٌ في التطبيق.
 */
export async function shareQrLink(linkId: string, userId: string, access: "read" | "edit"): Promise<QrLinkResult> {
  const { me, deny } = await authorized();
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
  const { me, deny } = await authorized();
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
  const { me, deny } = await authorized();
  if (!me) return deny!;

  const sb = await createClient();
  const { error } = await sb.from("qr_link_shares").delete().eq("link_id", linkId).eq("user_id", userId);
  if (error) return { ok: false, message: error.message };

  refresh();
  revalidatePath(`/dashboard/tools/qr/${linkId}/settings`);
  return { ok: true, message: "أُخرج الشريك." };
}
