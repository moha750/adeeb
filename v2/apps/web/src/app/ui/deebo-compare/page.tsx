import { Container } from "@adeeb/design-system";
import { CompareView } from "./CompareView";
import { missingKeys } from "./actions";

export const metadata = { title: "مقارنة ديبو" };

/**
 * مختبرُ اختيار نموذج ديبو.
 *
 * ليس معرضَ مكوّنٍ كسائر صفحات `/ui`، بل **مِيزانُ قرار**: المالك لم يختر النموذج
 * بعد، والفرق بينها في العربيّة ذوقيٌّ لا يُوصَف بالكلام. فتُعرَض الأجوبةُ جنبًا
 * إلى جنبٍ ويحكم بعينه، كما تقتضي سابقةُ «القرارُ البصريُّ يُعرَض لا يُشرَح».
 *
 * ويُعدَم هذا الملفّ يوم يُقَرّ النموذج. مختبرٌ لا شاشة.
 */
export default async function DeeboComparePage() {
  const missing = await missingKeys();

  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Deebo, Model Comparison
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
          أيُّ نموذجٍ يكون ديبو؟
        </h1>
        <p className="mt-2 text-content-muted">
          السؤالُ نفسُه يُمرَّر على أربعة نماذج بمعرفة أديب نفسِها وتوجيهه نفسِه. اقرأ العربيّة
          واحكم، ثمّ اكشف الأسماء. والتكلفةُ تحت كلّ جوابٍ محسوبةً لألف سؤال.
        </p>

        <div className="mt-12">
          <CompareView missing={missing} />
        </div>
      </Container>
    </main>
  );
}
