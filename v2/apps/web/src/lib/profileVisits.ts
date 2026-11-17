import { fmtMonthYear } from "@/lib/dates";
import { arCount, type ArForms } from "@/lib/arabicCount";

/**
 * **زوّارُ الصفحة العلنيّة** (محمد ٢٠٢٦-١١-١٧): ما تُرجعه `my_profile_views` — أشخاصٌ لا مرّاتُ فتح، بلا صاحبها ولا الروبوتات، ولا أسماء.
 * مصدرٌ واحدٌ لجملتها: ملاحظةُ صاحب الصفحة (`MemberPublicRoom`) وسطرُ «صفحتك العلنيّة» في «حسابي».
 */
export type ProfileVisits = { month: number; total: number; since: string | null };

const AR_PERSON: ArForms = ["شخصٌ واحد", "شخصان", "أشخاص", "شخصًا"];

/** «منذ بدأ العدّ في أغسطس 2026»: الموقعُ بدأ يسجّل صفحاتِ الأعضاء يومها، فما قبله لا يُعرف */
const sinceText = (v: ProfileVisits) => (v.since ? `منذ بدأ العدّ في ${fmtMonthYear(v.since)}` : "منذ نُشرت");

/** جملةٌ واحدة: «زارها 12 شخصًا هذا الشهر، و20 شخصًا منذ بدأ العدّ في أغسطس 2026.» */
export function visitsSentence(v: ProfileVisits): string {
  if (!v.total) return `لم يزرها أحدٌ بعد ${sinceText(v)}.`;
  const month = v.month ? `زارها ${arCount(v.month, AR_PERSON)} هذا الشهر` : "لم يزرها أحدٌ هذا الشهر";
  return `${month}، و${arCount(v.total, AR_PERSON)} ${sinceText(v)}.`;
}

/** قيمةُ السطر وما تحته: «12 شخصًا هذا الشهر» ثمّ «و20 شخصًا منذ بدأ العدّ في أغسطس 2026» */
export function visitsLine(v: ProfileVisits): { v: string; sub: string } {
  if (!v.total) return { v: "لم يزرها أحدٌ بعد", sub: sinceText(v) };
  return { v: v.month ? `${arCount(v.month, AR_PERSON)} هذا الشهر` : "لا أحد هذا الشهر", sub: `و${arCount(v.total, AR_PERSON)} ${sinceText(v)}` };
}
