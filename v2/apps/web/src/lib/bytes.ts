/**
 * حجمُ ملفٍّ مقروءًا — **مصدرٌ واحد** لكلّ من يعرض حجمًا (الإذاعة · مرفقُ الترشّح · ما يأتي).
 * كان يسكن `dashboard/radio/vocab.ts` وحده، فنُقل إلى هنا يوم احتاجه بابٌ ثانٍ : لا نسختان
 * تفترقان يومًا في التقريب أو في التسمية.
 *
 * والتقريبُ واحدٌ لكلتا الصيغتين: رقمٌ بعد الفاصلة تحت العشرة، وصحيحٌ فوقها — التدقيقُ فوق
 * ذلك لا يقرؤه أحد.
 */
const mbRounded = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? String(Math.round(mb)) : mb.toFixed(1);
};

/** خانةُ عرضٍ مضغوطة (شارةٌ أو `title`): أرقامٌ لاتينيّة واختصارٌ — «7.4 م.ب». */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  return `${mbRounded(bytes)} م.ب`;
}

/**
 * جملةٌ منثورةٌ يقرؤها العضو — «٧٫٤ ميغابايت»: أرقامٌ عربيّة كي لا يختلط الرقمان في سطرٍ
 * واحد، والاسمُ كاملًا لا مختصرًا، وبلا صفرٍ زائدٍ بعد الفاصلة (٦ لا ٦٫٠).
 */
export function formatBytesAr(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  const n = mbRounded(bytes).replace(/\.0$/, "");
  const arabic = n.replace(/[0-9.]/g, (c) => (c === "." ? "٫" : "٠١٢٣٤٥٦٧٨٩"[Number(c)]));
  return `${arabic} ميغابايت`;
}
