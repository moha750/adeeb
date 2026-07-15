"use client";

import { Accordion, Container } from "@adeeb/design-system";

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-6 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}

function Lab({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>
  );
}

export default function AccordionPage() {
  return (
    <main className="py-16">
      <Container className="max-w-2xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Accordion
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض الأكورديون</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          طيّ وفتح مبنيّ على عنصر <span className="font-latin">&lt;details&gt;</span> الأصليّ — سهل الوصول بلا
          جافاسكربت. انقر أيّ بند لفتحه أو إغلاقه؛ تبدأ كلّ البنود مغلقة.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="مجموعة أساسيّة">
            <Lab>الأسئلة الشائعة</Lab>
            <Accordion
              items={[
                {
                  q: "ما هو نادي أديب؟",
                  a: "نادٍ طلّابيّ يُعنى بالأدب واللغة، يجمع المهتمّين بالكتابة والقراءة تحت مظلّة واحدة.",
                },
                {
                  q: "كيف أنضمّ إلى النادي؟",
                  a: "قدّم عبر نموذج التسجيل في موسم الانضمام، ثمّ اجتَز المقابلة القصيرة مع لجنة القبول.",
                },
                {
                  q: "هل العضويّة مجّانيّة؟",
                  a: "نعم، العضويّة مجّانيّة تمامًا لجميع الطلّاب المنتسبين.",
                },
              ]}
            />
          </Sec>

          <Sec title="محتوى غنيّ">
            <Lab>الإجابة تقبل عناصر React لا نصًّا فقط</Lab>
            <Accordion
              items={[
                {
                  q: "ما اللجان المتاحة داخل النادي؟",
                  a: (
                    <ul className="list-disc space-y-1 pr-5">
                      <li>لجنة الفعاليّات</li>
                      <li>لجنة الإعلام والتصميم</li>
                      <li>لجنة الموارد البشريّة</li>
                      <li>لجنة ضمان الجودة</li>
                    </ul>
                  ),
                },
                {
                  q: "كيف أتواصل مع الإدارة؟",
                  a: (
                    <p>
                      راسلنا عبر البريد الرسميّ أو زُر صفحتنا على{" "}
                      <a href="https://adeeb.club" className="font-bold text-primary hover:underline">
                        adeeb.club
                      </a>{" "}
                      للاطّلاع على آخر المستجدّات.
                    </p>
                  ),
                },
                {
                  q: "ما مواعيد الاجتماعات الأسبوعيّة؟",
                  a: (
                    <p>
                      تُعقد الاجتماعات كلّ أسبوع، ويُعلَن الموعد الدقيق مسبقًا عبر{" "}
                      <span className="font-bold text-content">قناة الإعلانات</span> الرسميّة.
                    </p>
                  ),
                },
              ]}
            />
          </Sec>

          <Sec title="بند مفرد">
            <Lab>أبسط استخدام — عنصر واحد</Lab>
            <Accordion
              items={[
                {
                  q: "هل يُشترط أن أكون كاتبًا محترفًا؟",
                  a: "إطلاقًا — النادي يرحّب بكلّ المستويات، ويوفّر ورشًا لتطوير المهارات من الصفر.",
                },
              ]}
            />
          </Sec>
        </div>
      </Container>
    </main>
  );
}
