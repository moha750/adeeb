import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { getSessionAdmin, type CurrentAdmin } from "@/lib/auth";
import { SECTION_CAP } from "@/lib/capabilities";
import { QR_FILE_BUCKET, isQrFilePath } from "@/lib/qrLinks";

/**
 * **حارسُ كلّ فعلٍ في غرفة الباركود** — في موضعٍ واحدٍ لا في ملفَّي أفعال.
 *
 * ومحلُّه هنا لا في `actions.ts`: ملفُّ `"use server"` **لا يُصدِّر إلّا دوالَّ غير متزامنة**،
 * فثابتٌ أو نوعٌ فيه يُسقط تصديرَ الملفّ كلِّه (أُمسك في البناء ٢٠٢٦-٠٩-٠٥). فلمّا وُلد ملفُّ
 * أفعالٍ ثانٍ للحملات كان الحارسُ سيُنسَخ نسختين، والمنسوخُ يفترق: تُشدَّد إحداهما وتبقى أختُها.
 *
 * **وصاحبُ الجلسة لا المُعايَن**: الصفُّ يُنسَب إلى `auth.uid()` في القاعدة على كلّ حال
 * (سياسةُ own-row)، فلو صدّقنا هويّةً مستعارةً لأذِنّا بفعلٍ باسمِ من لا يملكه ثمّ كتبناه
 * باسمِ من يملكه. والحدُّ الموصوف في `lib/view-as`: المعاينةُ رؤيةٌ لا سلطة.
 */
export const QR_CAP = SECTION_CAP["/dashboard/tools/qr"];

type Denial = { ok: false; message: string };

export async function qrActor(): Promise<{ me: CurrentAdmin; deny: null } | { me: null; deny: Denial }> {
  const me = await getSessionAdmin();
  if (!me) return { me: null, deny: { ok: false, message: "جلستك غير صالحة." } };
  if (!me.caps.includes(QR_CAP)) {
    return { me: null, deny: { ok: false, message: "لا تملك صلاحية مولّد الباركود." } };
  }
  return { me, deny: null };
}

/** جوابُ من طلب صفًّا ليس له أو لم يعد موجودًا. لا يفرّق بين المعدوم وملكِ غيرِه. */
export const NOT_FOUND = "لم يُعثر على الباركود.";

/** ونظيرُها للحاوية. */
export const CAMPAIGN_NOT_FOUND = "لم يُعثر على الحملة.";

/**
 * **دلوُ ملفّات الباركود بمفتاح الخدمة — للمخزن وحدَه.**
 *
 * الصفوفُ تُقرأ وتُكتب بعميل الجلسة (سياسةُ own-row هي الحارس، انظر `data.ts`)، أمّا الدلو
 * فلا سياسةَ كتابةٍ فيه لأحد: الرفعُ برابطٍ موقَّعٍ يُصكّ هنا بعد حارس الغرفة، والمحوُ هنا بعد
 * أن تقبل القاعدةُ الفعل (سابقةُ `library`). و`null` حين ينقص مفتاحُ الخدمة، فيُردّ الفعلُ
 * ولا يُفترَض (عُرفُ المستودع).
 */
function qrService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export function qrStorage() {
  return qrService()?.storage.from(QR_FILE_BUCKET) ?? null;
}

/**
 * **محوُ ملفٍّ لم يعد يشير إليه صفّ** — بعد الاستبدال والتحويل إلى رابطٍ والحذف، أو بعد إنشاءٍ تعثّر.
 *
 * **ولا يُمحى ملفٌّ يشير إليه صفّ** — يُسأل الجدولُ قبل الدلو. فالمحوُ لا يثق بمن ناداه: مسارٌ
 * مُرِّر خطأً (أو عمدًا) وهو صورةُ باركودٍ حيّ لا يُذهَب به. والسؤالُ بمفتاح الخدمة لأنّ الصفَّ
 * قد يكون لغير صاحب الجلسة (شريكٌ استبدل ملفَّ مالك).
 *
 * وصامتٌ عند الفشل عمدًا: الفعلُ الأصليُّ قد تمّ (أو رُدّ)، وملفٌّ يتيمٌ في الدلو لا يؤذي أحدًا،
 * أمّا رسالةُ «تعذّر» عن فعلٍ نجح فتكذب.
 */
export async function dropQrFile(path: string | null | undefined): Promise<void> {
  if (!path || !isQrFilePath(path)) return;
  const sb = qrService();
  if (!sb) return;
  try {
    const { data, error } = await sb.from("qr_links").select("id").eq("file_path", path).limit(1);
    if (error || (data ?? []).length) return;
    await sb.storage.from(QR_FILE_BUCKET).remove([path]);
  } catch {
    // يتيمٌ يبقى، ولا يُسقط الفعلَ الذي قبله
  }
}
