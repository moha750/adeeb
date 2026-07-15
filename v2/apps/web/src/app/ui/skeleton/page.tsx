"use client";

import { Container } from "@adeeb/design-system";
import { Skeleton } from "../../dashboard/_components/Skeleton";

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

const CIRCLES = [
  { size: 28, label: "دقيق" },
  { size: 40, label: "صغير" },
  { size: 56, label: "متوسط" },
  { size: 72, label: "كبير" },
] as const;

const HEIGHTS = [
  { h: 8, label: "8px" },
  { h: 12, label: "12px · افتراضيّ" },
  { h: 18, label: "18px" },
  { h: 28, label: "28px" },
] as const;

const RADII = [
  { r: 0, label: "0 · حادّ" },
  { r: 7, label: "7 · افتراضيّ" },
  { r: 16, label: "16 · ناعم" },
  { r: 999, label: "999 · كبسولة" },
] as const;

export default function SkeletonPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Skeleton
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
          معرض هياكل التحميل
        </h1>
        <p className="mt-2 max-w-xl text-content-muted">
          لبنة تحميل بلمعان منزلق، تُشكَّل بالعرض والارتفاع والاستدارة — سطر أو دائرة أو بطاقة، بلا أنماط ثابتة.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="الأشكال الأساسيّة">
            <Lab>سطر · دائرة · بطاقة</Lab>
            <div className="flex flex-wrap items-end gap-10">
              <div className="flex flex-col items-start gap-2">
                <Skeleton width={220} />
                <span className="font-latin text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  سطر
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Skeleton width={56} height={56} radius={999} />
                <span className="font-latin text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  دائرة
                </span>
              </div>
              <div className="flex flex-col items-start gap-2">
                <Skeleton width={180} height={120} radius={16} />
                <span className="font-latin text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  بطاقة
                </span>
              </div>
            </div>
          </Sec>

          <Sec title="أسطر النصّ">
            <Lab>عرض نسبيّ لمحاكاة فقرة — width كنسبة مئويّة</Lab>
            <div className="max-w-md space-y-3">
              <Skeleton width="100%" />
              <Skeleton width="92%" />
              <Skeleton width="96%" />
              <Skeleton width="60%" />
            </div>
          </Sec>

          <Sec title="الدوائر">
            <Lab>width = height مع radius = 999</Lab>
            <div className="flex flex-wrap items-end gap-8">
              {CIRCLES.map((c) => (
                <div key={c.size} className="flex flex-col items-center gap-2">
                  <Skeleton width={c.size} height={c.size} radius={999} />
                  <span className="font-latin text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                    {c.size}px · {c.label}
                  </span>
                </div>
              ))}
            </div>
          </Sec>

          <Sec title="الارتفاعات">
            <Lab>height متغيّر — من الأسطر الرفيعة إلى الكتل</Lab>
            <div className="max-w-md space-y-6">
              {HEIGHTS.map((row) => (
                <div key={row.h} className="flex flex-col gap-2">
                  <Skeleton width="100%" height={row.h} />
                  <span className="font-latin text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>
          </Sec>

          <Sec title="الاستدارة">
            <Lab>radius من الحادّ إلى الكبسولة</Lab>
            <div className="flex flex-wrap items-end gap-8">
              {RADII.map((row) => (
                <div key={row.r} className="flex flex-col items-start gap-2">
                  <Skeleton width={120} height={64} radius={row.r} />
                  <span className="font-latin text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>
          </Sec>

          <Sec title="البطاقات">
            <Lab>كتل بأحجام واستدارات مختلفة</Lab>
            <div className="flex flex-wrap items-start gap-6">
              <Skeleton width={160} height={100} radius={16} />
              <Skeleton width={240} height={140} radius={20} />
              <Skeleton width={120} height={180} radius={16} />
            </div>
          </Sec>

          <Sec title="الصنف المساعد">
            <Lab>className=&quot;sk-av&quot; — لبنة صورة رمزيّة جاهزة (‏36×36)</Lab>
            <div className="flex flex-wrap items-center gap-6">
              <Skeleton className="sk-av" />
              <Skeleton className="sk-av" />
              <Skeleton className="sk-av" />
            </div>
          </Sec>

          <Sec title="تركيب واقعيّ — بطاقة عضو">
            <Lab>دائرة + أسطر تُحاكي بطاقة تحميل</Lab>
            <div className="max-w-sm  border border-line bg-surface p-5">
              <div className="flex items-center gap-4">
                <Skeleton width={56} height={56} radius={999} />
                <div className="flex-1 space-y-3">
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="45%" />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <Skeleton width="100%" />
                <Skeleton width="94%" />
                <Skeleton width="80%" />
              </div>
              <div className="mt-5">
                <Skeleton width="100%" height={96} radius={16} />
              </div>
            </div>
          </Sec>
        </div>
      </Container>
    </main>
  );
}
