// مفردات الأخبار العامّة المشتركة — تخدم غرفةَ التحرير (dashboard/news) والصفحةَ العامّة
// (/news) **وتطبيقَ الجوّال** معًا، فلا تُنسَخ في ثلاثة مواضع. لا شيء خادميّ هنا ولا إطار،
// فيستوردها الخادمُ والمتصفّحُ وReact Native بأمان.
//
// وما بقي في `apps/web/src/app/dashboard/news/vocab.ts` تحريريٌّ محض (الحالةُ والتكليفُ
// وحقولُ الكاتب) لا يعرفه زائرٌ ولا تطبيق، فلا موضعَ له هنا.
//
// وكلُّ قيمةٍ هنا يحرسها قيدُ `news_category_check`. لا تُضِف قيمةً قبل توسيع القيد بترحيل.
//
// و«تحقيق» (`feature`) أُزيلت بأمر المالك ٢٠٢٦-٠٩-١٨، ولم يكن يستعملها خبرٌ واحد.
// والأربعةُ الباقيةُ **وقائعُ** كلُّها: فعاليّةٌ أُقيمت · اتفاقيّةٌ وُقّعت · جائزةٌ نِيلت ·
// بيانٌ صدر. وكانت هي وحدَها مادّةً تحريريّةً لا يلزمها حدث.

export type Category = "coverage" | "partnership" | "achievement" | "announcement";

export const CATEGORY_META: Record<Category, { label: string; hint: string }> = {
  coverage: { label: "تغطية", hint: "فعاليّةٌ أقامها أدِيب أو شارك فيها" },
  partnership: { label: "شراكة", hint: "اتفاقيّة أو مذكّرة تفاهم" },
  achievement: { label: "إنجاز", hint: "تكريمٌ أو جائزة" },
  announcement: { label: "إعلان", hint: "بيانٌ من النادي" },
};

export const CATEGORY_VALUES = Object.keys(CATEGORY_META) as Category[];
export const CATEGORY_OPTIONS = CATEGORY_VALUES.map((v) => ({ value: v, label: CATEGORY_META[v].label }));

/** دقائقُ القراءة بمعدّل مئتَي كلمةٍ في الدقيقة، والحدُّ الأدنى دقيقةٌ واحدة. */
export function readingMinutes(content: string | null | undefined): number {
  const words = wordCount(content);
  return Math.max(1, Math.round(words / 200));
}

export const wordCount = (content: string | null | undefined): number =>
  (content ?? "").trim().split(/\s+/).filter(Boolean).length;
