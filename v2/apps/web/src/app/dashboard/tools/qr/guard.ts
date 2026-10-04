import "server-only";
import { getSessionAdmin, type CurrentAdmin } from "@/lib/auth";
import { SECTION_CAP } from "@/lib/capabilities";

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
