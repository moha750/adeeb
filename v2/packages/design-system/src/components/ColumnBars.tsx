import type { CSSProperties } from "react";

export type ColumnBar = {
  value: number;
  /** نصّ التلميح عند المرور (الافتراضي القيمة). */
  title?: string;
  /** تسمية أسفل العمود — لبعض الأعمدة فقط (مثل كلّ ٦ ساعات). */
  tick?: string;
};

export interface ColumnBarsProps {
  bars: ColumnBar[];
  /** أقصى قيمةٍ للمقياس — الافتراضي أكبر قيمة. */
  max?: number;
  /** لون الأعمدة (من --chart-*). الافتراضي --chart-1. */
  tone?: string;
  /** ارتفاع منطقة الأعمدة (px). الافتراضي 120. */
  height?: number;
  /** أقصى عرضٍ للعمود (px). الافتراضي 16 (مدرّجٌ نحيل)؛ ارفعه لأعمدةٍ عريضة (فترات مجمّعة). */
  barMaxWidth?: number;
}

const nf = (n: number) => n.toLocaleString("en-US");

/**
 * مدرّج أعمدة — أعمدةٌ رأسيّة ارتفاعها من الأقصى، بلونٍ **صلبٍ** واحد من اللوحة (لا تدرّج
 * شارد). تسمياتٌ اختياريّة أسفل بعض الأعمدة. المصدر: التوزيع الساعيّ (٢٤ عمودًا) — والمستهلك
 * يبني الأعمدة، فيصلح المكوّن لأيّ تقطيعٍ زمنيّ.
 */
export function ColumnBars({ bars, max, tone = "var(--chart-1)", height = 120, barMaxWidth = 16 }: ColumnBarsProps) {
  const top = max ?? Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="chart-cols" style={{ "--chart-cols-h": `${height}px`, "--chart-col-max": `${barMaxWidth}px` } as CSSProperties}>
      {bars.map((b, i) => (
        <div key={i} className="chart-col" title={b.title ?? nf(b.value)}>
          <span className="chart-col-bar" style={{ height: `${(b.value / top) * 100}%`, background: tone }} />
          {b.tick != null ? <span className="chart-col-tick">{b.tick}</span> : null}
        </div>
      ))}
    </div>
  );
}
