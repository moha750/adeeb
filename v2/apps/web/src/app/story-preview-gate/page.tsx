import type { Metadata } from "next";
import { Container, Header } from "@adeeb/design-system";
import { StoryOpening } from "../_story-gate/StoryOpening";

/* معاينة معزولة لنسخة «بوابة العارض» من القصة الافتتاحية — توأمُ /story-preview
   بالضبط، إلا أنها تركّب _story-gate بدل _story. النسختان لا تلتقيان في صفحة
   واحدة، فتُقارَنان جنبًا إلى جنب، وإسقاط المجرَّب حذفُ مجلّدين لا أكثر. */

export const metadata: Metadata = {
  title: "معاينة قصة أدِيب — بوابة العارض",
  robots: { index: false, follow: false },
};

export default function StoryPreviewGatePage() {
  return (
    <>
      <StoryOpening />
      <Header />
      <main>
        <section className="py-20 text-center md:py-28">
          <Container>
            <p className="mb-4 font-latin text-sm font-bold tracking-[0.2em] text-secondary">ADEEB CLUB · KFU</p>
            <h1 className="mx-auto max-w-3xl font-display text-5xl font-black leading-tight text-content md:text-6xl">
              حيثُ تُولَدُ الكلمة
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-content-muted">
              محتوى بديل للمعاينة — هنا يبدأ الموقع الطبيعي بعد انتهاء القصة.
            </p>
          </Container>
        </section>
        <section className="bg-surface-2 py-20 md:py-28">
          <Container>
            <p className="text-center text-content-muted">قسم بديل ثانٍ للتحقق من استمرار التمرير بلا قفزة.</p>
          </Container>
        </section>
        <section className="py-20 md:py-28">
          <Container>
            <p className="text-center text-content-muted">نهاية المعاينة.</p>
          </Container>
        </section>
      </main>
    </>
  );
}
