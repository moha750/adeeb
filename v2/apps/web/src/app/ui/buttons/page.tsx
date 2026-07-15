"use client";

import { Button, Container } from "@adeeb/design-system";
import { PaperPlaneTilt, Plus } from "@phosphor-icons/react";

const VARIANTS = ["primary", "ghost", "danger", "inverse"] as const;
const SIZES = ["sm", "md", "lg"] as const;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">
      {children}
    </p>
  );
}

/** صفحة مرجعية حيّة لكل الأزرار — تُبنى بمكوّن Button الحقيقي. */
export default function ButtonsPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Buttons
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض الأزرار</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          كل الأنماط والأحجام والحالات بالمكوّن الحقيقي. أشِر لأي تعديل تريده.
        </p>

        <div className="mt-12 space-y-14">
          {/* الأنماط — بأيقونة */}
          <section>
            <Label>الأنماط (متوسط · بأيقونة)</Label>
            <div className="flex flex-wrap items-center gap-4">
              {VARIANTS.map((v) => (
                <Button key={v} variant={v}>
                  <PaperPlaneTilt aria-hidden /> إرسال
                </Button>
              ))}
            </div>
          </section>

          {/* الأنماط — بلا أيقونة */}
          <section>
            <Label>الأنماط (بلا أيقونة)</Label>
            <div className="flex flex-wrap items-center gap-4">
              {VARIANTS.map((v) => (
                <Button key={v} variant={v}>
                  {{ primary: "أساسي", ghost: "شبحي", danger: "خطر", inverse: "معكوس" }[v]}
                </Button>
              ))}
            </div>
          </section>

          {/* الأحجام */}
          <section>
            <Label>الأحجام (أساسي)</Label>
            <div className="flex flex-wrap items-center gap-4">
              {SIZES.map((s) => (
                <Button key={s} size={s}>
                  <PaperPlaneTilt aria-hidden /> {{ sm: "صغير", md: "متوسط", lg: "كبير" }[s]}
                </Button>
              ))}
            </div>
          </section>

          {/* الحالات */}
          <section>
            <Label>الحالات (أساسي)</Label>
            <div className="flex flex-wrap items-center gap-4">
              <Button>
                <PaperPlaneTilt aria-hidden /> عادي
              </Button>
              <Button loading>جارٍ الحفظ…</Button>
              <Button disabled>
                <PaperPlaneTilt aria-hidden /> معطّل
              </Button>
              <Button variant="ghost" disabled>
                شبحي معطّل
              </Button>
            </div>
          </section>

          {/* أزرار أيقونة فقط */}
          <section>
            <Label>أيقونة فقط</Label>
            <div className="flex flex-wrap items-center gap-4">
              <Button aria-label="إضافة" className="!px-3">
                <Plus aria-hidden />
              </Button>
              <Button variant="ghost" aria-label="إضافة" className="!px-3">
                <Plus aria-hidden />
              </Button>
            </div>
          </section>

          {/* على خلفية كحلية */}
          <section>
            <Label>على خلفية الهوية</Label>
            <div className="flex flex-wrap items-center gap-4  bg-brand-strong p-6">
              <Button variant="inverse">
                <Plus aria-hidden /> معكوس
              </Button>
              <Button variant="primary">
                <PaperPlaneTilt aria-hidden /> أساسي
              </Button>
              <Button variant="ghost" className="!text-white !border-white/40 hover:!bg-white/10">
                شبحي
              </Button>
            </div>
          </section>

          {/* مصفوفة كاملة: نمط × حجم */}
          <section>
            <Label>مصفوفة كاملة (نمط × حجم)</Label>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="text-sm text-content-muted">
                    <th className="p-3 text-start font-bold">النمط \\ الحجم</th>
                    {SIZES.map((s) => (
                      <th key={s} className="p-3 text-start font-bold">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {VARIANTS.map((v) => (
                    <tr key={v} className="border-t border-line">
                      <td className="p-3 text-sm font-bold text-content">{v}</td>
                      {SIZES.map((s) => (
                        <td key={s} className={v === "inverse" ? "bg-brand-strong p-3" : "p-3"}>
                          <Button variant={v} size={s}>
                            <PaperPlaneTilt aria-hidden /> إرسال
                          </Button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
