import { Container, LandingHeading } from "@adeeb/design-system";

/* ============================================================
   معرض «الرأس المُذهّب» — يستهلك مكوّن LandingHeading الحقيقيّ (لا نسخة).
   يوثّق السياقات: بدايةً · متراكزًا · على الكحليّ · وبلا فئة/جملة.
   ============================================================ */

function Light({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[var(--radius)] border border-steel-200 bg-surface px-10 py-14">{children}</div>;
}
function Dark({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] px-10 py-14" style={{ backgroundImage: "var(--grad-primary)" }}>
      {children}
    </div>
  );
}
function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>;
}

export default function LandingHeadingsPage() {
  return (
    <main className="py-16">
      <Container className="max-w-4xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Landing, Section Heading</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">الرأس المُذهّب، LandingHeading</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          فئةٌ كبيرة تتلاشى (يخرج منها العنوان)، عنوانٌ بتدرّج الهوية على تظليلٍ مستدير، شعرة، جملةٌ واصفة اختياريّة. بلا أرقام
          ولا باترن. الفئة قصيرةٌ لأنّها كبيرة. المصدر الوحيد: مكوّن <span className="font-latin" dir="ltr">LandingHeading</span>.
        </p>

        <div className="mt-12 space-y-8">
          <section>
            <Lab>محاذاة البداية: قسمان متتاليان (الإيقاع)</Lab>
            <div className="space-y-4">
              <Light>
                <LandingHeading eyebrow="معرض" title="أعمال وإبداعات" deck="نعرض ما تصنعه المواهب، من القصّة إلى التصميم." />
              </Light>
              <Light>
                <LandingHeading eyebrow="أنشطة" title="برامجنا وأنشطتنا" deck="ورشٌ وبرامجُ نوعيّة على مدار الموسم." />
              </Light>
            </div>
          </section>

          <section>
            <Lab>متراكز: للأقسام المتمركزة</Lab>
            <Light>
              <LandingHeading eyebrow="فريق" title="أهل الدفّة" deck="المجلس الذي يقود النادي ويرعى مسيرته." align="center" />
            </Light>
          </section>

          <section>
            <Lab>على البلاطة الكحليّة (tone=onDark)</Lab>
            <Dark>
              <LandingHeading eyebrow="أرقام" title="ملخص المسيرة" deck="أثرٌ نقيسه على مدى المواسم." align="center" tone="onDark" />
            </Dark>
          </section>

          <section>
            <Lab>بلا فئة وبلا جملة (يبقى العنوان بتدرّجه والشعرة)</Lab>
            <Light>
              <LandingHeading title="آخر الأخبار" />
            </Light>
          </section>
        </div>
      </Container>
    </main>
  );
}
