// مفردات الفعاليّات النقيّة المشتركة — تخدم لوحة التحكّم (dashboard/events) والصفحة العامّة
// (/activities) معًا، فلا تُنسَخ في موضعين. لا شيء خادميّ هنا، فيستوردها الخادم والعميل بأمان.
// كلّ قيمة يحرسها قيدٌ في القاعدة (activities_activity_type_check ·
// activity_reservations_gender_at_booking_check). لا تُضِف قيمة قبل توسيع القيد بترحيل.

export type ActivityType = "activity" | "program" | "workshop" | "course" | "camp" | "exhibition" | "dialogue";

/** النوع تصنيفٌ لا حالة — يحمله أيقونةٌ ونصٌّ لا لونُ نغمة (اللون للدورة الحياتيّة وحدها). */
export const TYPE_META: Record<ActivityType, { label: string }> = {
  activity: { label: "نشاط" },
  program: { label: "برنامج" },
  workshop: { label: "ورشة" },
  course: { label: "دورة تدريبية" },
  camp: { label: "معسكر" },
  exhibition: { label: "معرض" },
  dialogue: { label: "جلسة حوارية" },
};
export const TYPE_VALUES = Object.keys(TYPE_META) as ActivityType[];
export const TYPE_OPTIONS: { value: ActivityType; label: string }[] =
  TYPE_VALUES.map((v) => ({ value: v, label: TYPE_META[v].label }));

export const GENDER_LABEL: Record<"male" | "female", string> = { male: "رجل", female: "امرأة" };

/* توجيه الفعاليّة: "" = للجنسين (يُخزَّن NULL) · male = للرجال · female = للنساء. */
export const AUDIENCE_OPTIONS: { value: "" | "male" | "female"; label: string }[] = [
  { value: "", label: "للجنسين" },
  { value: "male", label: "للرجال" },
  { value: "female", label: "للنساء" },
];
export const AUDIENCE_LABEL: Record<"male" | "female", string> = { male: "للرجال", female: "للنساء" };
export const GENDER_OPTIONS: { value: "male" | "female"; label: string }[] = [
  { value: "male", label: "رجل" },
  { value: "female", label: "امرأة" },
];

/**
 * تقسيم المقاعد من الإجمالي والنسبة — مصدرٌ واحد للمعاينة (العميل) وللتخزين (الخادم)،
 * مطابقٌ لعُرف القاعدة: `male = round(total × pct/100)` و`female = total − male`.
 */
export function deriveSeats(totalSeats: number, malePercentage: number): { male: number; female: number } {
  const male = Math.round((totalSeats * malePercentage) / 100);
  return { male, female: totalSeats - male };
}

/* ══ الجهة المنظِّمة (قسم أو لجنة أو النادي) ═══════════════════════════ */

// المنظِّم متعدّد الشكل: عمودان في القاعدة (organizing_committee_id / organizing_department_id)،
// وواحدٌ فقط يُضبَط. القيمة النصّيّة في الواجهة تُرمِّز النوع: "comm:<id>" · "dept:<id>" · "" (النادي).

/** القيمة النصّيّة الموحّدة من عمودَي القاعدة (للقائمة والتحرير). */
export function organizerValue(committeeId: number | null, departmentId: number | null): string {
  if (committeeId != null) return `comm:${committeeId}`;
  if (departmentId != null) return `dept:${departmentId}`;
  return "";
}

/** يفكّ القيمة النصّيّة إلى عمودَي القاعدة (للحفظ) — أحدهما أو كلاهما null. */
export function parseOrganizer(v: string): { committeeId: number | null; departmentId: number | null } {
  if (v.startsWith("comm:")) return { committeeId: Number(v.slice(5)) || null, departmentId: null };
  if (v.startsWith("dept:")) return { committeeId: null, departmentId: Number(v.slice(5)) || null };
  return { committeeId: null, departmentId: null };
}
