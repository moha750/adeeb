"use server";

import { revalidatePath } from "next/cache";
import { getSessionAdmin } from "@/lib/auth";
import { SECTION_CAP } from "@/lib/capabilities";
import { createClient } from "@/lib/supabase/server";
import { QR_TITLE_MAX, checkTarget, newQrCode, qrShortUrl } from "@/lib/qrLinks";
import type { QrSpec } from "@/lib/qr";

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
const SPEC_MAX = 1_200_000;

function packSpec(spec: QrSpec, code: string): { ok: true; spec: QrSpec } | { ok: false; message: string } {
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
export async function createQrLink(input: { title: string; target: string; spec: QrSpec }): Promise<QrLinkResult> {
  const { me, deny } = await authorized();
  if (!me) return deny!;

  const title = checkTitle(input.title);
  if (!title.ok) return { ok: false, message: title.message };
  const target = checkTarget(input.target);
  if (!target.ok) return { ok: false, message: target.message };

  const sb = await createClient();
  for (let attempt = 0; attempt < 7; attempt++) {
    const code = newQrCode();
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
  if (!data) return { ok: false, message: "لم يُعثر على الباركود." };

  refresh();
  return { ok: true, message: "حُدّثت الوجهة، ومن يمسح الباركود الآن يصل إليها." };
}

/**
 * إيقافُ الرمز وإحياؤه.
 *
 * **والإيقافُ لا الحذفُ هو الجواب** حين ينتهي غرضُ ملصقٍ: الورقةُ في الشارع لا تُسحب،
 * ورمزٌ موقوفٌ يردّ قاصدَه بأدبٍ ويُبقي أثرَه. والمحذوفُ يذهب بمسحاته كلِّها.
 */
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
  if (!row) return { ok: false, message: "لم يُعثر على الباركود." };

  const packed = packSpec(spec, (row as { code: string }).code);
  if (!packed.ok) return { ok: false, message: packed.message };

  const { error } = await sb.from("qr_links").update({ spec: packed.spec }).eq("id", id);
  if (error) return { ok: false, message: error.message };

  refresh();
  revalidatePath(`/dashboard/tools/qr/${id}`);
  return { ok: true, message: "حُفظ التصميم." };
}

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
  if (!data) return { ok: false, message: "لم يُعثر على الباركود." };

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
  if (!data) return { ok: false, message: "لم يُعثر على الباركود." };

  refresh();
  return { ok: true, message: "حُذف الباركود ومسحاتُه." };
}
