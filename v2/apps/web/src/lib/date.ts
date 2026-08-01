// تنسيق التواريخ العربيّ — **مصدرٌ واحد** يخدم الخادم والعميل معًا.
// بلا "server-only" عمدًا: المكوّنات العميليّة تستورده، فلا تُعاد كتابة أسماء الشهور في كلّ ملفّ.
// (رُقّي إلى `lib/` من `dashboard/surveys/format.ts` — الصيغة عامّة لا تخصّ الاستبيانات، وبقي
//  ذاك الملفّ بابًا يُعيد التصدير فلا يُكسَر استيرادٌ قائم.)
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** «١٥ أغسطس ٢٠٢٦» — الصيغة العامّة لقيمةٍ تحمل وقتًا (`timestamptz`). */
export const fmtDate = (iso: string | null | undefined): string => {
  const d = parse(iso);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "";
};

/**
 * «١٦ يناير ٢٠٢٦» من عمود **`date`** (بلا وقت) — ولا يمرّ بـ`Date` عمدًا:
 * `new Date("2026-01-16")` يُفسَّر منتصفَ ليلٍ **بتوقيت غرينتش**، ثمّ `getDate()` يقرؤه بالتوقيت
 * المحلّي — فينقص التاريخ يومًا في كلّ منطقةٍ خلف غرينتش. الشطر النصّيّ يُنجيه من ذلك.
 */
export const fmtDateOnly = (iso: string | null | undefined): string => {
  const [y, m, d] = (iso ?? "").split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : "";
};

/** «١٥ أغسطس» — بلا سنة، للمساحات الضيّقة. */
export const fmtDayMonth = (iso: string | null | undefined): string => {
  const d = parse(iso);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : "";
};

/** «١٥ أغسطس ٢٠٢٦ · ١٤:٣٠» — حين تلزم الساعة (تلميحات المواعيد). */
export const fmtDateAndTime = (iso: string | null | undefined): string => {
  const d = parse(iso);
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fmtDate(iso)} · ${p(d.getHours())}:${p(d.getMinutes())}`;
};
