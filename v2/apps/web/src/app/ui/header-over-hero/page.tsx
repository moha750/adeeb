import { Container } from "@adeeb/design-system";
import { getHeroSlides } from "@/app/_components/heroSlides";
import { OverHeroDemo } from "./OverHeroDemo";

/**
 * معرضُ **الرأس فوق صدر الهبوط** — الجلدُ المعتمَد (المالك ٢٠٢٦-٠٩-١٦) حيًّا.
 *
 * عُرِضت هيئتان في الجولة الأولى (كبسولةٌ باقيةٌ · وبلا كبسولةٍ ألبتّة) ثمّ ثلاثُ
 * صبغاتٍ للكبسولة في الثانية (فولاذيّ `--steel-700` · كحليّ `--navy-800` · حبريّ
 * `--navy-950`)، **وأُعدم المرفوضُ كلُّه** يوم الاعتماد فلم يبقَ منه سطرٌ في
 * المكتبة — سابقةُ الرأس نفسِها يوم اعتُمدت جزيرتُه، وسابقةُ التذييل.
 *
 * والشرائحُ **الحيّةُ نفسُها** لا صورٌ مختارةٌ للزينة: الكبسولةُ تمرّ على صورةٍ
 * وعلى لوحٍ كحليٍّ في صفٍّ واحد، فمعاينةٌ بصورةٍ مختارةٍ تكذب على الناظر.
 */
export const revalidate = 60;

export default async function HeaderOverHeroPage() {
  const slides = await getHeroSlides();

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Header</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">الرأس فوق الصدر</h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
          الرأسُ بُني زجاجًا <b>فاتحًا</b> يمرّ من تحته شفقُ صفحةٍ فاتحة: سطحُه 30٪ من{" "}
          <code className="font-latin">--color-surface</code>، وحبرُه <code className="font-latin">--color-text-muted</code>،
          وحدُّه <code className="font-latin">--card-stroke</code> الفولاذيُّ الفاتح، وشعارُه كحليّ، وفعلاه{" "}
          <code className="font-latin">abtn-primary</code> (ملءٌ كحليّ) و<code className="font-latin">abtn-ghost</code>{" "}
          (حبرٌ فولاذيّ). ثمّ صار صدرُ الهبوط <b>لوحَ الهويّة نفسَه</b> يبدأ من قمّة الصفحة ويمرّ الرأسُ
          فوقه: فوقع <b>ملوّنٌ على ملوّن</b>، الملءُ الكحليُّ يذوب في الكحليّ والحبرُ الخافتُ يغرق والحدُّ
          الفاتحُ يختفي. والزجاجُ الرقيقُ لا ينقذ شيئًا: كلُّ ما يفعله أنّه يُفتّح الكحليَّ قليلًا ثمّ
          يُترَك الحبرُ الكحليُّ عليه.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          والعلاجُ <b>جلدٌ لا استثناء</b>: ستّةُ رموزٍ في ورقة الأنماط تتبدّل معًا (الحبر، الحدّ، الظلّ،
          السطح، صبغةُ التظليل، تينتُ اللمس) ويتبعها الشعارُ ووجهُ الفعلين، فلا قاعدةَ رابطٍ تُنسَخ ولا
          صنفَ زرٍّ يُخترع. وهو <b>مؤقّتٌ بموضعه لا بالصفحة</b>: يُلبَس ما دام الرأسُ طافيًا على اللوح،
          فإذا جاوزه عاد فاتحًا في مكانه.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          <b>وصبغتُه <code className="font-latin">--navy-800</code></b> بقرار المالك (٢٠٢٦-٠٩-١٦) من ثلاثٍ
          عُرِضت على الشكل نفسِه، وأُعدمت أختاها: لأنّه <b>طرفُ <code className="font-latin">--grad-primary</code>{" "}
          القاتمُ نفسُه</b>، فالكبسولةُ من لون ما تحتها حرفًا لا أعمقَ منه ولا أفتح. و
          <code className="font-latin">--steel-700</code> و<code className="font-latin">--navy-950</code> جارتان
          للتدرّج لا عضوان فيه، فتُدخلان الهويّةَ لونًا رابعًا لأجل زاويةٍ واحدة. وأُعدمت معهما هيئةُ
          «بلا كبسولة»: أجملُ في اللقطة وأضعفُ في التشغيل، إذ يشحب الحبرُ الأبيضُ على شريحةٍ فاتحة
          ويمرّ الشريطُ الجاري في آخر الروابط بلا كبسولةٍ تحجبه.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          واسمُه <code className="font-latin">inverse</code> لا <code className="font-latin">dark</code>: هو الجلدُ
          الذي تلبسه المكتبةُ كلُّها فوق سطحٍ ملوّن، والرأسُ يستدعي{" "}
          <code className="font-latin">abtn-inverse</code> و<code className="font-latin">abtn-inverse-ghost</code>{" "}
          أنفسَهما — لغةٌ واحدةٌ لا اسمان لمعنًى واحد. <b>والإطارُ للعرض فقط فلا تُبحر روابطُه.</b>
        </p>

        <OverHeroDemo slides={slides} />
        <div className="pb-10" />
      </Container>
    </main>
  );
}
