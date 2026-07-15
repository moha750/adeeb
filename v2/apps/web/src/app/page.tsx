import { Header, Footer, Container, Button, SectionHeading, Reveal } from "@adeeb/design-system";
import { WorksGallery } from "./_components/WorksGallery";
import { AchievementsTreemap } from "./_components/AchievementsTreemap";
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
      <Header />
      <main>
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
              <Button size="lg">انضمّ إلينا</Button>
              <Button size="lg" variant="ghost">تصفّح الأعمال</Button>
            </div>
          </Container>
        </section>

        {/* (2) معرض الأعمال — حيّ (carousel) */}
        <section id="works" className="py-20 md:py-28">
          <Container>
            <Reveal>
              <SectionHeading eyebrow="معرض" title="إبداعاتنا" />
              <WorksGallery />
            </Reveal>
          </Container>
        </section>

        {/* (3) ملخص المسيرة — بلاطة الهوية (تدرّج فولاذي↔كحلي) بالباترن على الحافتين */}
        <section id="achievements" className="relative overflow-hidden bg-brand-strong py-20 text-white md:py-28">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-repeat-x opacity-30"
            style={{ backgroundImage: "url(/brand/pattern-white.svg)", backgroundSize: "auto 48px", backgroundPosition: "center top" }}
            aria-hidden="true"
          />
          <Container>
            <Reveal>
              <SectionHeading eyebrow="أرقامنا" title="ملخص المسيرة" align="center" tone="onDark" />
              <AchievementsTreemap />
            </Reveal>
          </Container>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-repeat-x opacity-30"
            style={{ backgroundImage: "url(/brand/pattern-white.svg)", backgroundSize: "auto 48px", backgroundPosition: "center bottom" }}
            aria-hidden="true"
          />
        </section>

        {/* (5) أهل الدفّة — المجلس (بيانات حيّة عبر RPC آمن) */}
        <section id="board" className="py-20 md:py-28">
          <Container>
            <Reveal>
              <SectionHeading eyebrow="فريقنا" title="أهل الدفّة" align="center" />
              <BoardMembers />
            </Reveal>
          </Container>
        </section>

        {/* (6) برامجنا وأنشطتنا — حيّ */}
        <section id="activities" className="bg-surface-2 py-20 md:py-28">
          <Container>
            <Reveal>
              <SectionHeading title="برامجنا وأنشطتنا" />
              <LatestActivities />
            </Reveal>
          </Container>
        </section>

        {/* (7) آخر الأخبار — حيّ */}
        <section id="news" className="py-20 md:py-28">
          <Container>
            <Reveal>
              <SectionHeading eyebrow="منصّة أديب الإخبارية" title="آخر الأخبار" />
              <LatestNews />
            </Reveal>
          </Container>
        </section>

        {/* (8) الأسئلة الشائعة */}
        <section id="faq" className="bg-surface-2 py-20 md:py-28">
          <Container className="max-w-3xl">
            <Reveal>
              <SectionHeading eyebrow="مساعدة" title="الأسئلة الشائعة" align="center" />
              <FaqSection />
            </Reveal>
          </Container>
        </section>

        {/* (9) تواصل معنا — نموذج حيّ */}
        <section id="contact" className="py-20 md:py-28">
          <Container className="max-w-2xl">
            <Reveal>
              <SectionHeading eyebrow="نحن هنا" title="تواصل معنا" align="center" />
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
                <Button size="lg" variant="inverse">سجّل عضويتك</Button>
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
