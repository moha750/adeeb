"use client";

// معرضُ رأس الموقع — الرأسُ المعتمَد (المالك ٢٠٢٦-٠٨-٠١) حيًّا في إطارٍ يُمرَّر، فتُرى
// حالتا «فوق» و«بعد النزول»: **الجزيرةُ** هيئةً (من خمسٍ عُرِضت) و**الخطّيّةُ المتكيّفة**
// خلفيّةً (من ستٍّ) — وأُعدم المرفوضُ كلُّه ومعه الشريطُ القديم، فلا اتّجاهَ ميّتٌ يبقى.
import { useState } from "react";
import {
  Ambient,
  Card,
  CardBody,
  CardHeader,
  Container,
  Header,
  LandingHeading,
} from "@adeeb/design-system";
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
          <p className="mb-3 font-latin text-xs font-bold tracking-[0.2em] text-secondary">ADEEB CLUB, KFU</p>
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-black leading-tight text-content">حيثُ تُولَدُ الكلمة</h2>
          <p className="mx-auto mt-4 max-w-lg text-content-muted">
            نادٍ ثقافي إبداعي بجامعة الملك فيصل، يدعم المواهب الشابة عبر ورشٍ وبرامج ومحتوى متميّز.
          </p>
        </Container>
      </section>
      <section className="pb-16">
        <Container>
          <LandingHeading eyebrow="معرض" title="أعمال وإبداعات" deck="نعرض ما تصنعه مواهبنا، من القصّة إلى اللوحة والتصميم." />
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

/**
 * إطارُ المعاينة — الرأسُ **حيٌّ لا مُبحِر**: يُضغط ويُمرَّر ويُفتَح لوحُه، ولا ينقلك
 * إلى صفحةٍ فتُغادر المعرض. الاعتراضُ في **مرحلة الالتقاط** على الحاوية: أيّ ضغطةٍ
 * أصلُها رابطٌ يُلغى فعلُها الافتراضيّ قبل أن تبلغه — فلا يُمسّ `Header` نفسُه ولا
 * تُزوَّر روابطُه بـ`#`. والأزرارُ (زرّ القائمة) تعمل كما هي — الحارسُ لا يمسّ إلّا `<a>`.
 *
 * **والإطارُ يُحاكي التنقّل بدل أن يقتله:** منعُ الإبحار وحدَه يجمّد «الصفحةَ الحاليّة»
 * على قيمةٍ محفورة، فتضغط «المكتبة» ويبقى المؤشّرُ على «الأخبار» — فيبدو عطبًا وهو
 * معاينةٌ ناقصة. فالإطارُ يمسك المسارَ في حالةٍ محلّيّة: ضغطةُ الرابط تنقله إليه،
 * فتُختبر **الوجهةُ الحقيقيّة للتوجّه**: كيف ينتقل المؤشّرُ وكيف يستقرّ.
 */
function PreviewFrame({
  nav = NAV,
  headerClass,
  phone,
}: {
  nav?: { label: string; href: string }[];
  headerClass?: string;
  /** إطارٌ بعرض الجوّال — الرأسُ يقيس نفسَه فينطوي، فيُرى اللوحُ بلا تضييق النافذة. */
  phone?: boolean;
}) {
  const [active, setActive] = useState("/news");
  return (
    <div
      className={`shdr-demo mt-4${phone ? " shdr-demo-phone" : ""}`}
      onClickCapture={(e) => {
        const link = (e.target as HTMLElement).closest("a");
        if (!link) return;
        e.preventDefault();
        const href = link.getAttribute("href");
        /* الشعارُ وزرّ الدخول ليسا من التنقّل، فلا ينقلان «الصفحةَ الحاليّة» */
        if (href && nav.some((n) => n.href === href)) setActive(href);
      }}
    >
      <main className="amb-host">
        <Ambient />
        <Header nav={nav} activeHref={active} className={headerClass} ctaHref="#" />
        <Body />
      </main>
    </div>
  );
}


export default function HeaderGalleryPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Header</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">رأس الموقع</h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
          <b>الجزيرة:</b> الرأسُ كرتٌ من عائلة الكروت: الحدُّ 1.75px (ق٤) والظلُّ من السلّم (ق٥) والزاويةُ
          من الأساس (ق٢)، عائمٌ عن الحافّة يقرب منها بالنزول، ولوحُ جوّاله (دون ٩٠٠px) كبسولةٌ ثانية لا
          امتدادُ شريط. وخلفيّتُه <b>خطّيّةٌ متكيّفة بفرقٍ يسير</b>: عند القمّة حدٌّ وحدَه على زجاجٍ رقيق
          (30%، ضباب 6px) فيمرّ الشفقُ من تحته ولا يزاحم البطلَ سطحٌ؛ وبالنزول يشتدّ قليلًا (45%، 
          ضباب 10px) ويقرب من الحافّة، <b>قريبًا من حاله في القمّة</b>، والحدُّ والظلُّ ثابتان فالهيئةُ
          لا تتزحزح. أمّا لوحُ الجوّال فسطحُه ممتلئ (86%) لأنّه يقع فوق متن الصفحة لا فوق فراغ الرأس.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          <b>مرِّر داخل الإطار</b> لترى الحالة الثانية، واضغط ما شئت، <b>الإطارُ للعرض فقط فلا تُبحر
          روابطُه</b> (وزرّ القائمة يعمل). والروابطُ هنا مساراتٌ حقيقيّة والمؤشّرُ تحت «الأخبار» يريك
          شكلَ الصفحة الحاليّة. أمّا الرأسُ الحيّ فما زال على مراسي الهبوط (
          <code className="font-latin">#news</code>) التي تكسر خارج الصفحة الرئيسة.
        </p>

        <h2 className="mt-12 font-display text-2xl font-black text-content">رابطُ التنقّل: تظليلُ القارئ</h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
          <b>مرِّر المؤشّرَ على الروابط، اضغط رابطًا فيصير هو الصفحةَ الحاليّة، تنقّل بـ
          <code className="font-latin">Tab</code></b>. (الإطارُ يُحاكي التنقّلَ ولا يُبحر بك، فتُختبر
          وجهةَ العلامة لا صورتَها الساكنة.)
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          أثرُ قلمٍ مُظلِّل يمرّ على الكلمة <b>من اليمين</b> كما يُقرأ العربيّ: مائلٌ 8° وأقصرُ من السطر
          ويغطّي 42% من ارتفاع النصّ، يدُ قارئٍ لا مستطيلَ واجهة. واللمسُ والنشطُ <b>علامةٌ واحدةٌ
          بشدّتين</b> لا لغتان: يمرّ القلمُ عند اللمس، ويبقى أثرُه في الصفحة الحاليّة. واللونُ من
          الهوية وحدها (<code className="font-latin">--steel-400</code>) بشدّاتٍ هادئة: <b>28%</b> لمسًا، {" "}
          <b>46%</b> للنشط، <b>58%</b> عند الضغط.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          <b>والضغطُ والتركيزُ لغةٌ واحدةٌ لكلّ عناصر الرأس</b> (الرابط، دخول، زرّ القائمة): الضغطُ
          انكماشةٌ خاطفة (0.96) تقول «وصلَت يدُك»، والتركيزُ حلقةُ الهوية{" "}
          <code className="font-latin">--ring</code> بدل خطّ المتصفّح. و<b>لوحُ الجوّال يقرأ القاعدة
          نفسَها</b>: التظليلُ على <b>الكلمة</b> لا على الرابط، فيصحّ في الشريط (رابطٌ بمقاس كلمته)
          وفي اللوح (صفٌّ يملأ العرض) بقاعدةٍ واحدةٍ بلا استثناء.
        </p>

        <PreviewFrame />

        <h2 className="mt-16 font-display text-2xl font-black text-content">السعة: الرأسُ لا يزدحم</h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
          الرأسُ <b>يقيس ما يتّسع له</b> قبل الرسم: فإن لم يبقَ للرابط موضعُه كاملًا <b>لم يُقبَل في
          الصفّ</b> وانسحب إلى منسدلة «المزيد»، لا ضغطَ ولا قصَّ ولا التفافَ سطرٍ ثانٍ. و
          <b>الأفعالُ أولى من الروابط</b>: «انضمّ إلينا» و«دخول» لا ينزويان أبدًا (هما غايةُ الرأس)،
          فتُطرح عرضًا كاملًا ثمّ يُقسَّم الباقي على الروابط. ومعنى ذلك أنّ <b>إضافة زرٍّ جديدٍ تُضيّق
          حصّةَ الروابط تلقائيًّا</b> فتنسحب أواخرُها، بلا نقطةِ انكسارٍ محفورة ولا قرارٍ منك.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          الإطارُ التالي محشوٌّ بثمانية روابط عمدًا. <b>ضيِّق نافذةَ المتصفّح ووسِّعها</b> وراقب أواخرَ
          الروابط تدخل «المزيد» وتخرج منها.
        </p>
        <h2 className="mt-16 font-display text-2xl font-black text-content">لوحُ الجوّال: بعرضه الحقيقيّ</h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
          الإطارُ عرضُه <b>420px</b>، والرأسُ فيه <b>يقيس نفسَه</b> لا شاشتَك (<code className="font-latin">@container</code>{" "}
          بدل <code className="font-latin">@media</code>)، فيجد نفسَه ضيّقًا فينطوي. اضغط زرَّ القائمة
          هنا لترى اللوحَ على شاشة الحاسوب بلا أدواتِ مطوّرٍ ولا تضييقِ نافذة. وصفوفُه على
          <b> تظليل القارئ</b> نفسِه الذي في الشريط، قاعدةٌ واحدةٌ للموضعين.
        </p>
        <PreviewFrame phone />
        <div className="pb-10" />
      </Container>
    </main>
  );
}
