"use client";

// معرضُ رأس الموقع — الرأسُ المعتمَد (المالك ٢٠٢٦-٠٨-٠١) حيًّا في إطارٍ يُمرَّر، فتُرى
// حالتا «فوق» و«بعد النزول»: **الجزيرةُ** هيئةً (من خمسٍ عُرِضت) و**الخطّيّةُ المتكيّفة**
// خلفيّةً (من ستٍّ) — وأُعدم المرفوضُ كلُّه ومعه الشريطُ القديم، فلا اتّجاهَ ميّتٌ يبقى.
import { Ambient, Card, CardBody, CardHeader, Container, Header, LandingHeading } from "@adeeb/design-system";
import { BookOpen, CalendarBlank, PenNib } from "@phosphor-icons/react";

const NAV = [
  { label: "الفعاليات", href: "/activities" },
  { label: "الأخبار", href: "/news" },
  { label: "المكتبة", href: "/library" },
  { label: "الأعمال", href: "/works" },
];

/** متنٌ واقعيّ تحت الرأس — طويلٌ عمدًا ليُمرَّر الإطار فينكشف سلوكُ التمرير. */
function Body() {
  return (
    <>
      <section className="py-14 text-center">
        <Container>
          <p className="mb-3 font-latin text-xs font-bold tracking-[0.2em] text-secondary">ADEEB CLUB · KFU</p>
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-black leading-tight text-content">حيثُ تُولَدُ الكلمة</h2>
          <p className="mx-auto mt-4 max-w-lg text-content-muted">
            نادٍ ثقافي إبداعي بجامعة الملك فيصل، يدعم المواهب الشابة عبر ورشٍ وبرامج ومحتوى متميّز.
          </p>
        </Container>
      </section>
      <section className="pb-16">
        <Container>
          <LandingHeading eyebrow="معرض" title="أعمال وإبداعات" deck="نعرض ما تصنعه مواهبنا — من القصّة إلى اللوحة والتصميم." />
          <div className="card-grid mt-8">
            <Card>
              <CardHeader icon={<PenNib aria-hidden />} title="قصّةٌ قصيرة" subtitle="أدب" />
              <CardBody>
                <p className="text-content-muted">نصٌّ من ورشة السرد، كُتب في جلسةٍ واحدة ونُقّح في ثلاث.</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader icon={<BookOpen aria-hidden />} title="إصدارٌ سنويّ" subtitle="مكتبة" />
              <CardBody>
                <p className="text-content-muted">مختاراتٌ من نتاج الأعضاء، تُطبع وتُقرأ في «إرثٌ يُروى».</p>
              </CardBody>
            </Card>
            <Card tone="brand">
              <CardHeader icon={<CalendarBlank aria-hidden />} title="ورشة السرد" subtitle="ثلاثة لقاءات" />
              <CardBody>
                <p className="text-content-muted">ورشةٌ تفتح بابَها مرّتين في الموسم لمن يكتب أوّل نصٍّ له.</p>
              </CardBody>
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
}

export default function HeaderGalleryPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Header</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">رأس الموقع</h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
          <b>الجزيرة:</b> الرأسُ كرتٌ من عائلة الكروت — الحدُّ 1.75px (ق٤) والظلُّ من السلّم (ق٥) والزاويةُ
          من الأساس (ق٢)، عائمٌ عن الحافّة يقرب منها بالنزول، ولوحُ جوّاله (دون ٩٠٠px) كبسولةٌ ثانية لا
          امتدادُ شريط. وخلفيّتُه <b>خطّيّةٌ متكيّفة</b>: عند القمّة حدٌّ وحدَه على زجاجٍ رقيق (30% · ضباب
          6px) فيمرّ الشفقُ من تحته ولا يزاحم البطلَ سطحٌ؛ فإذا نزل القارئُ اكتسب سطحَه الزجاجيّ كاملًا
          (86% · ضباب 16px) فيُقرأ فوق أيّ محتوًى — والحدُّ والظلُّ ثابتان، فالمتبدّلُ الامتلاءُ وحده.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          <b>مرِّر داخل الإطار</b> لترى الحالة الثانية. والروابطُ هنا مساراتٌ حقيقيّة والمؤشّرُ تحت
          «الأخبار» يريك شكلَ الصفحة الحاليّة — أمّا الرأسُ الحيّ فما زال على مراسي الهبوط (
          <code className="font-latin">#news</code>) التي تكسر خارج الصفحة الرئيسة.
        </p>

        <div className="shdr-demo mt-8">
          <main className="amb-host">
            <Ambient />
            <Header nav={NAV} activeHref="/news" />
            <Body />
          </main>
        </div>

        <div className="pb-10" />
      </Container>
    </main>
  );
}
