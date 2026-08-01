"use client";

import { useState } from "react";
import { Container, CarouselNav } from "@adeeb/design-system";

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

const SLIDES = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة"];

export default function CarouselNavPage() {
  const [i, setI] = useState(0);
  const [j, setJ] = useState(0);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · CarouselNav
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">أسهم التنقّل</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          زوجُ سهمَين يقودان عارضًا — لا زرٌّ مفرد: الاتّجاه والتسمية وترتيب الزوج كلّها من المكوّن، فلا يقرّرها كلّ
          مستعمِل. <strong>موضعه وسط الشاشة دائمًا</strong> (القاعدة ١١) — لا خيار محاذاة يُمرَّر. يستعمله اليوم كاروسيل
          أهل الدفّة وكاروسيل الفعاليات و<code className="font-latin">Carousel</code> المكتبة.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="الافتراضيّ">
            <Lab>عارضٌ دائريّ — لا حافّة ولا تعطيل</Lab>
            <div className="rounded border border-line bg-surface p-8">
              <p className="mb-6 text-center font-display text-xl font-bold text-content">
                الشريحة {SLIDES[i]}
              </p>
              <CarouselNav
                onPrev={() => setI((v) => (v - 1 + SLIDES.length) % SLIDES.length)}
                onNext={() => setI((v) => (v + 1) % SLIDES.length)}
              />
            </div>
          </Sec>

          <Sec title="عند الحافّة — عارضٌ لا يدور">
            <Lab>prevDisabled / nextDisabled · «غير متاح» طبقةٌ رماديّة بلا ظلّ (ق٧)</Lab>
            <div className="rounded border border-line bg-surface p-8">
              <p className="mb-6 text-center font-display text-xl font-bold text-content">
                الشريحة {SLIDES[j]}{" "}
                <span className="font-latin text-sm text-content-muted">({j + 1}/{SLIDES.length})</span>
              </p>
              <CarouselNav
                onPrev={() => setJ((v) => Math.max(0, v - 1))}
                onNext={() => setJ((v) => Math.min(SLIDES.length - 1, v + 1))}
                prevDisabled={j === 0}
                nextDisabled={j === SLIDES.length - 1}
              />
            </div>
          </Sec>

          <Sec title="التباعد عن العارض">
            <Lab>className = &quot;mt-*&quot; وحدها — تباعدٌ لا محاذاة</Lab>
            <div className="rounded border border-line bg-surface p-8">
              <div className="grid h-24 place-items-center rounded border border-dashed border-line text-content-muted">
                العارض
              </div>
              <CarouselNav className="mt-7" onPrev={() => {}} onNext={() => {}} />
            </div>
          </Sec>

          <Sec title="ما يحمله المكوّن">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-right text-content-muted">
                    <th className="p-3 font-normal">البند</th>
                    <th className="p-3 font-normal">من أين</th>
                  </tr>
                </thead>
                <tbody className="text-content">
                  {[
                    ["الموضع", "وسط الشاشة دائمًا (ق١١)"],
                    ["الزاوية", "var(--radius) — زاويةُ الأساس لا دائرة (ق٢)"],
                    ["الحدّ", "--card-stroke-w · --card-stroke (ق٤)"],
                    ["الظلّ", "sm ساكنًا · md عند المرور (ق٥)"],
                    ["التركيز", "outline فولاذيّ كسائر أزرار الهوية"],
                    ["السهم", "SVG بمقاسٍ ثابت — «السابق» يمينًا و«التالي» يسارًا"],
                    ["المقاس", "44px — هدفُ لمسٍ في صفحةٍ عامّة"],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-line/60 align-top">
                      <td className="p-3 font-bold">{k}</td>
                      <td className="p-3 text-content-muted">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sec>
        </div>
      </Container>
    </main>
  );
}
