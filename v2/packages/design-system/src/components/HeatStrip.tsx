import type { ReactNode } from "react";

export type HeatCell = {
  value: number;
  /** نصّ التلميح (الافتراضي القيمة). */
  title?: string;
  /** تسمية أسفل الخليّة — لبعضها فقط (مثل كلّ ٦ ساعات). */
  tick?: string;
};

export interface HeatStripProps {
  cells: HeatCell[];
  /** أقصى قيمةٍ للمقياس — الافتراضي أكبر قيمة. */
  max?: number;
  /** لون الأساس (من --chart-*)؛ تتدرّج كثافته بالقيمة. الافتراضي --chart-1. */
  tone?: string;
  empty?: ReactNode;
}

const nf = (n: number) => n.toLocaleString("en-US");

/**
 * شريط حراريّ — صفٌّ من خلايا، كثافةُ **لونٍ واحد** (تدرّجٌ متتابع، لا ألوان فئات) تُشفّر القيمة:
 * الهادئ فاتحٌ والمزدحم غامق. يُقرأ «متى تزدحم» بلمحة. مناسبٌ للبيانات الدوريّة (٢٤ ساعة).
 */
export function HeatStrip({ cells, max, tone = "var(--chart-1)", empty }: HeatStripProps) {
  if (!cells.length) return <p className="chart-empty">{empty ?? "لا بيانات."}</p>;
  const top = max ?? Math.max(1, ...cells.map((c) => c.value));
  return (
    <div className="chart-heat">
      {cells.map((c, i) => {
        const pct = 12 + Math.round((c.value / top) * 88); // 12%..100% كي يبقى الصفر مرئيًّا خافتًا
        return (
          <div key={i} className="chart-heat-cell" title={c.title ?? nf(c.value)}
            style={{ background: `color-mix(in oklab, ${tone} ${pct}%, var(--color-surface-2))` }}>
            {c.tick != null ? <span className="chart-heat-tick">{c.tick}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
