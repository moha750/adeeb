import Link from "next/link";
import { Header, Footer, Container, LandingHeading, Reveal, Ambient } from "@adeeb/design-system";
import { StoryOpening } from "./_story/StoryOpening";
import { WorksGallery } from "./_components/WorksGallery";
import { BoardMembers } from "./_components/BoardMembers";
import { LatestActivities } from "./_components/LatestActivities";
import { LatestNews } from "./_components/LatestNews";
import { FaqSection } from "./_components/FaqSection";
import { ContactForm } from "./_components/ContactForm";

// يُعاد توليد الصفحة كل 60 ثانية بأحدث البيانات من Supabase (ISR)
export const revalidate = 60;

export default function Home() {
  return (
    <>
      {/* قصة أديب الافتتاحية — طبقة تسبق الموقع وتسلّم إليه، مرّةً واحدة لكل دخولٍ
          للموقع (تخطٍّ: ?story=skip · فرض إعادتها: ?story=force) */}
      <StoryOpening />
      <Header />
      {/* الخلفيّة تُعلَّق على المحتوى لا على المستند: القصّة تشغل آلاف البكسلات حين تعمل
          وتُخفى عند التخطّي، فتعليقُها على `body` يجعل تركيبتها تتبدّل بين الحالين. */}
      <main className="amb-host">
        <Ambient />
        {/* (1) قصة أديب — الافتتاحية (النسخة القصصية بالأنيميشن تُبنى لاحقًا) */}
        <section id="story" className="py-20 text-center md:py-28">
          <Container>
            <p className="mb-4 font-latin text-sm font-bold tracking-[0.2em] text-secondary">
              ADEEB CLUB · KFU
            </p>
            <h1 className="mx-auto max-w-3xl font-display text-5xl font-black leading-tight text-content md:text-6xl">
              حيثُ تُولَدُ الكلمة
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-content-muted">
              نادٍ ثقافي إبداعي بجامعة الملك فيصل، يدعم المواهب الشابة عبر ورشٍ وبرامج ومحتوى متميّز.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/login" className="abtn abtn-primary abtn-lg">تسجيل الدخول</Link>
              <a href="#works" className="abtn abtn-ghost abtn-lg">تصفّح الأعمال</a>
            </div>
          </Container>
        </section>

        {/* (2) معرض الأعمال — حيّ (carousel) */}
        <section id="works" className="py-20 md:py-28">
          <Container>
            <Reveal>
              <LandingHeading eyebrow="معرض" title="أعمال وإبداعات" deck="نعرض ما تصنعه مواهبنا — من القصّة إلى اللوحة والتصميم." />
              <WorksGallery />
            </Reveal>
          </Container>
        </section>

        {/* (3) أهل الدفّة — المجلس (بيانات حيّة عبر RPC آمن) */}
        <section id="board" className="py-20 md:py-28">
          <Container>
            <Reveal>
              <LandingHeading eyebrow="فريق" title="أهل الدفّة" deck="المجلس الذي يقود النادي ويرعى مسيرته." align="center" />
              <BoardMembers />
            </Reveal>
          </Container>
        </section>

        {/* (6) برامجنا وأنشطتنا — حيّ */}
        <section id="activities" className="py-20 md:py-28">
          <Container>
            <Reveal>
              <LandingHeading eyebrow="فعاليات" title="برامجنا وأنشطتنا" deck="ورشٌ وبرامجُ نوعيّة على مدار العام." />
              <LatestActivities />
            </Reveal>
          </Container>
        </section>

        {/* (7) آخر الأخبار — حيّ */}
        <section id="news" className="py-20 md:py-28">
          <Container>
            <Reveal>
              <LandingHeading eyebrow="أخبار" title="آخر الأخبار" deck="مستجدّاتُ النادي أوّلًا بأوّل من منصّته الإعلاميّة." />
              <LatestNews />
            </Reveal>
          </Container>
        </section>

        {/* (8) الأسئلة الشائعة */}
        <section id="faq" className="py-20 md:py-28">
          <Container className="max-w-3xl">
            <Reveal>
              <LandingHeading eyebrow="أسئلة" title="الأسئلة الشائعة" deck="إجاباتٌ عن أكثر ما يُسأل عن العضويّة والمشاركة." align="center" />
              <FaqSection />
            </Reveal>
          </Container>
        </section>

        {/* (9) تواصل معنا — نموذج حيّ */}
        <section id="contact" className="py-20 md:py-28">
          <Container className="max-w-2xl">
            <Reveal>
              <LandingHeading eyebrow="راسلنا" title="تواصل معنا" deck="نحن هنا للإجابة عن سؤالك واستقبال اقتراحك." align="center" />
              <ContactForm />
            </Reveal>
          </Container>
        </section>

        {/* دعوة الانضمام + الباترن */}
        <section id="join" className="relative overflow-hidden bg-brand text-white">
          <Container className="py-20 md:py-28 text-center">
            <Reveal>
              <h2 className="font-display text-3xl font-bold">كُن جزءًا من مجتمع أَدِيب</h2>
              <p className="mx-auto mt-3 max-w-lg text-navy-100">
                انضمّ إلى نادٍ يحتفي بالكلمة ويصنع المبدعين.
              </p>
              <div className="mt-6 flex justify-center">
                <Link href="/join" className="abtn abtn-inverse abtn-lg">سجّل عضويتك</Link>
              </div>
            </Reveal>
          </Container>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-repeat-x opacity-80"
            style={{
              backgroundImage: "url(/brand/pattern-white.svg)",
              backgroundSize: "auto 64px",
              backgroundPosition: "center bottom",
            }}
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
