"use client";

import { Ambient, Container, Footer, Header } from "@adeeb/design-system";
import { Hero, type HeroSlide } from "@/app/_components/Hero";

/**
 * متنٌ فاتحٌ تحت الصدر — **وطولُه مقصود**: الصدرُ يملأ الشاشة، فقسمٌ قصيرٌ تحته لا
 * يُخرجه من تحت الرأس أصلًا فلا تُرى **عودةُ الجلد**، وهي نصفُ السلوك لا زينتُه.
 */
function Tail() {
  return (
    <>
      <section className="py-28 text-center">
        <Container>
          <h2 className="font-display text-2xl font-black text-content">أوّلُ قسمٍ بعد الصدر</h2>
          <p className="mx-auto mt-3 max-w-lg text-content-muted">
            ههنا تنتهي سيطرةُ اللوح الكحليّ. مرِّر حتّى يبلغ هذا القسمُ الرأسَ، وراقب الكبسولةَ وهي
            ترجع إلى جلدها الفاتح في مكانها بلا قفزة.
          </p>
        </Container>
      </section>
      <section className="py-28 text-center">
        <Container>
          <h2 className="font-display text-2xl font-black text-content">وما بعده</h2>
          <p className="mx-auto mt-3 max-w-lg text-content-muted">
            وهذا هو حالُ الرأس في بقيّة الموقع كلِّه: صفحاتٌ فاتحةٌ يمرّ من تحت كبسولته شفقُها، وهو
            الجلدُ الذي اعتُمد سنةَ بُني.
          </p>
        </Container>
      </section>
    </>
  );
}

/**
 * إطارُ المعاينة — الرأسُ والصدرُ **الحيّان** لا نسخةٌ ترسمهما: أيُّ تبدّلٍ في أحدهما
 * يظهر ههنا بلا نقلٍ بيد (درسُ `/ui/hero`: بنيةٌ مكتوبةٌ مرّتين تفترق بعد أسبوع).
 * والحارسُ في **مرحلة الالتقاط** يمنع الإبحار ولا يمسّ الأزرار (زرّ القائمة يعمل).
 */
function Frame({ slides, phone }: { slides: HeroSlide[]; phone?: boolean }) {
  return (
    <div
      className={`shdr-demo shdr-demo-tall mt-4${phone ? " shdr-demo-phone" : ""}`}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("a")) e.preventDefault();
      }}
    >
      <main className="amb-host">
        <Ambient />
        {/* العقدُ نفسُه الذي في الإنتاج (`SiteHeader`) لا نسخةٌ تشبهه */}
        <Header skin="inverse" skinOver='[data-head-skin="inverse"]' ctaHref="#" />
        <Hero slides={slides} standing="guest" />
        <Tail />
        {/* والتذييلُ في الإطار كما هو في الصفحة: هو السطحُ الملوّنُ الثاني، وآخرُ
            تمريرةٍ في كلّ صفحةٍ تضع الرأسَ عليه — فمعاينةٌ بلا تذييلٍ تُخفي نصفَ
            الحالات. مرِّر إلى القاع لترى الجلدَ يُلبَس مرّةً أخرى. */}
        <Footer />
      </main>
    </div>
  );
}

export function OverHeroDemo({ slides }: { slides: HeroSlide[] }) {
  return (
    <>
      <h2 className="mt-12 font-display text-2xl font-black text-content">في السعة</h2>
      <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
        <b>مرِّر داخل الإطار</b> حتّى يخرج الصدرُ من تحت الرأس، فترى <b>لحظةَ العودة</b> إلى الجلد
        الفاتح: الكبسولةُ لا تتزحزح ولا تقفز، يتبدّل سطحُها وحبرُها وشعارُها ووجهُ فعلَيها في
        مكانها. وراقب الكبسولةَ وهي تعبر <b>الحدَّ المائل</b> بين الصورة واللوح: أصعبُ ما تحتها
        النصفُ الفاتحُ من الصورة، وشرائحُ الصدر أخبارٌ حيّةٌ لا نملك ألوانَها.
      </p>
      <Frame slides={slides} />

      <h2 className="mt-16 font-display text-2xl font-black text-content">وعلى الجوّال</h2>
      <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
        <b>ههنا يُرى الجلدُ على حقيقته</b>: أكثرُ من يفتح أَدِيب يفتحه من جوّاله، والرأسُ في العمود
        الضيّق كبسولةٌ عريضةٌ فيها شعارٌ وزرُّ قائمةٍ وحدهما، فالصبغةُ تشغل عرضَ الشاشة كلَّه. افتح
        لوحَ القائمة: هو كبسولةٌ ثانيةٌ تقرأ الجلدَ نفسَه وتشتدّ درجةً فوق الشريط، لأنّه يقع فوق
        متن الصفحة لا فوق فراغ الرأس.
      </p>
      <Frame slides={slides} phone />
    </>
  );
}
