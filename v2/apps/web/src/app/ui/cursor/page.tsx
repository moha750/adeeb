"use client";

import { useRef, useState } from "react";
import { Button, Container, Cursor, Input, Switch } from "@adeeb/design-system";

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

export default function CursorPage() {
  const stage = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  return (
    <main className="py-16">
      {/* بلا `scopeRef` يعمّ الوثيقة — وحينها ينسحب مؤشّرُ المسرح فلا يُرسم اثنان */}
      {live ? <Cursor /> : null}

      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Cursor
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">مؤشّر أديب</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          <strong>هالةٌ لزجة تحفّ ريشة، ومنها أثرُ حبرٍ يجفّ.</strong> الهالةُ تلحق المؤشّرَ بتأخّر، وتتمطّط في
          اتّجاه اندفاعك وتنضغط عموديًّا عليه فيثبت حجمُها كالسائل. واللزوجةُ صفةُ الهالة نفسِها — لا قطرةَ في
          مركزها، فالريشةُ هي ما تحفّه.
        </p>
        <p className="mt-2 max-w-2xl text-content-muted">
          <strong>وعند النقر:</strong> تنكمش الهالةُ تحت الضغط ويشتدّ حبرُها، فإذا رفعتَ تفتّحت مرتدّةً إلى
          مقاسها. ويضغط السنُّ معها ما دام الزرُّ مضغوطًا.
        </p>
        <p className="mt-2 max-w-2xl text-content-muted">
          والنغمةُ <strong>تُقرأ ولا تُخترع</strong>: يأخذها المؤشّر من{" "}
          <code className="font-latin">--shadow-tone</code> الذي يعلنه العنصر أصلًا (ق٥)، فيحمرّ فوق «حذف» بلا
          أن يعرف أنّه حذف. مرّ على الأزرار الأربعة أدناه لترى ذلك.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-content-muted">
          اختير من <strong>ثلاثة عشر توجّهًا</strong> جُرّبت هنا في ٢٠٢٦-٠٨-٠٣، وأُعدم ما سواه فلم يبقَ منه سطرٌ
          في المكتبة.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="المؤشّر">
            <Lab>مرّره على الأزرار والروابط والبلاطات · اكتب في الحقل · واضغط</Lab>
            <div ref={stage} className="relative overflow-hidden rounded border border-line bg-surface p-8">
              {live ? null : <Cursor scopeRef={stage} />}

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">فعلٌ رئيس</Button>
                <Button variant="danger" size="sm">حذف</Button>
                <Button variant="success" size="sm">اعتماد</Button>
                <Button variant="ghost" size="sm" disabled>غير متاح</Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-6">
                <a href="#" className="font-bold text-primary underline-offset-4 hover:underline">رابطٌ في نصّ</a>
                <Input className="w-64" placeholder="اكتب هنا — تعود شعرةُ النظام" aria-label="حقل تجربة" />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div
                  className="flex h-24 items-center justify-center rounded bg-surface-2 font-display font-bold text-content"
                  role="button"
                  tabIndex={0}
                >
                  غلافُ كتاب
                </div>
                <div
                  className="flex h-24 items-center justify-center rounded-full bg-surface-2 font-display font-bold text-content"
                  role="button"
                  tabIndex={0}
                >
                  كبسولةٌ دائريّة
                </div>
                {/* `data-cursor` مِقبضٌ يُدخل عنصرًا غير تفاعليٍّ في حساب المؤشّر بلا أن يصير زرًّا */}
                <div
                  className="flex h-24 items-center justify-center rounded bg-surface-2 font-display font-bold text-content"
                  data-cursor=""
                >
                  بلاطةٌ بلا دور
                </div>
              </div>
            </div>
          </Sec>

          <Sec title="على الصفحة كلّها">
            <Lab>يعمّ الوثيقة فتحكم عليه في سياقٍ حقيقيّ</Lab>
            <div className="rounded border border-line bg-surface p-6">
              <Switch
                row
                label="طبّقه على الصفحة كلّها"
                description="ينسحب مؤشّرُ المسرح ما دام يعمل — فلا يُرسم اثنان"
                checked={live}
                onChange={(e) => setLive(e.currentTarget.checked)}
              />
            </div>
          </Sec>

          <Sec title="الحدود المكتوبة في المكوّن">
            <Lab>لا في المراجعة</Lab>
            <div className="rounded border border-line bg-surface p-6">
              <ul className="list-disc space-y-2 pe-5 text-content-muted">
                <li>
                  <strong className="text-content">اللوحة تُستثنى:</strong>{" "}
                  <code className="font-latin">/dashboard</code> أداةُ عملٍ يوميّة، والمؤشّرُ المزخرف فيها ضريبةٌ لا
                  هويّة. الواجهةُ العامّة وحدها.
                </li>
                <li>
                  <strong className="text-content">الفأرةُ وحدها:</strong>{" "}
                  <code className="font-latin">pointer: fine</code> — على اللمس لا طبقةَ تُرسَم ولا مستمعَ يُركَّب.
                </li>
                <li>
                  <strong className="text-content">تقليلُ الحركة:</strong> يُلغي التأخّرَ والتمطّطَ والأثر — لا
                  تُحسَب أصلًا، فيبقى الشكلُ وتذهب الحركة.
                </li>
                <li>
                  <strong className="text-content">دلالةُ النظام تبقى:</strong> الحقلُ يردّ شعرةَ الكتابة، والمعطَّلُ
                  يردّ «ممنوع» — تنسحب الطبقةُ فيهما.
                </li>
                <li>
                  <strong className="text-content">ولا ميلَ للريشة:</strong> جُرّب فكان يهتزّ، ولم تُجدِ ثلاثُ
                  معالجاتٍ للحساب حتى أُطفئ الميلُ نفسُه فسكنت. لا يُعاد إلّا ببناءٍ مختلفٍ كلّيًّا.
                </li>
              </ul>
            </div>
          </Sec>
        </div>
      </Container>
    </main>
  );
}
