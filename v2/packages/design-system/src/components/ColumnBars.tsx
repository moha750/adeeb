"use client";

import { useState, type CSSProperties } from "react";

export type ColumnBar = {
  value: number;
  /** اسمُ العمود في سطر القراءة (مثل «الساعة 13:00») — يُغني عن `title` المحتجب على اللمس. */
  label?: string;
  /** تسمية أسفل العمود — لبعضها فقط (مثل كلّ ٦ ساعات). */
  tick?: string;
};

export interface ColumnBarsProps {
  bars: ColumnBar[];
  /** أقصى قيمةٍ للمقياس — الافتراضي سقفٌ «جميل» فوق أكبر قيمة. */
  max?: number;
  /** ارتفاع منطقة الأعمدة (px). الافتراضي 132. */
  height?: number;
  /** أقصى عرضٍ للعمود (px) — بلا قيمةٍ يملأ خانته. ارفعه لأعمدةٍ قليلةٍ عريضة. */
  barMaxWidth?: number;
  /** تنسيق القيمة في سطر القراءة. */
  formatValue?: (n: number) => string;
}

const nf = (n: number) => n.toLocaleString("en-US");
const cf = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
// سقفٌ «جميل» (1 · 2 · 2.5 · 5 · 10 × عشرة أُسّ) — بلا هذا تخرج علامات المحور أرقامًا شاردة.
const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const f = v / 10 ** exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * 10 ** exp;
};

/**
 * مدرّج أعمدة — **أُقِرّ شكله ٢٠٢٦-٠٨-٠٩** بعد عرض ثلاث كسوات:
 *
 * - **محورٌ مرقّم وخطّ قاع:** العمود يقف على أرضٍ ولا يطفو، وثلاثُ علاماتٍ تكفي لقراءة أيّ عمودٍ
 *   تقريبًا بلا تحويم (كان بلا مقياسٍ البتّة، والقيمةُ مخبوءةٌ في `title` الميّت على اللمس).
 * - **تعبئةٌ رأسيّة من الهوية** (`--grad-chart-col`: فولاذيّ ٤٠٠ ← كحليّ ٨٠٠) بقمّةٍ مضيئة في
 *   رأس كلّ عمود — لا لونًا مسطّحًا صامتًا. وخلفها خطوطُ الشبكة وحدها: **لا أنبوبَ ولا صندوق**.
 * - **التحويم يُخفت الإخوة ويُبقي المقصود ساطعًا** (كان يُبهت المقصودَ نفسَه، والبهتانُ لغة
 *   التعطيل)، **بلا ظلٍّ يتوهّج**: الإشارةُ في السطوع لا في الهالة.
 * - **القراءة في سطرٍ ثابتٍ أعلى المدرّج** (`aria-live`) فتعمل باللمس ولقارئ الشاشة.
 *
 * المصدر الواحد: التوزيع الساعيّ (تحليلات) · توزيع أوقات الإجابة (استبيانات).
 */
export function ColumnBars({ bars, max, height = 132, barMaxWidth, formatValue = nf }: ColumnBarsProps) {
  const [act, setAct] = useState<number | null>(null);
  const top = niceMax(max ?? Math.max(1, ...bars.map((b) => b.value)));
  const cur = act != null ? bars[act] : null;

  return (
    <div
      className="chart-cols-wrap"
      style={{ "--chart-cols-h": `${height}px`, ...(barMaxWidth ? { "--chart-col-max": `${barMaxWidth}px` } : null) } as CSSProperties}
    >
      <div className="chart-readout" aria-live="polite">
        {cur ? <><b>{cur.label ?? cur.tick ?? ""}</b> <em>{formatValue(cur.value)}</em></> : <span>مرّر أو المس عمودًا لقراءته</span>}
      </div>
      <div className="chart-cols-grid">
        <div className="chart-cols-axis">
          {[1, 0.5, 0].map((f) => <span key={f}>{cf.format(top * f)}</span>)}
        </div>
        <div className="chart-cols" onPointerLeave={() => setAct(null)}>
          {[1, 0.5].map((f) => <span key={f} className="chart-cols-line" style={{ bottom: `calc(${f * 100}% - 1px)` }} aria-hidden />)}
          {bars.map((b, i) => (
            <div
              key={i}
              className={"chart-col" + (act === i ? " act" : "")}
              onPointerEnter={() => setAct(i)}
              onPointerDown={() => setAct(i)}
            >
              <span className="chart-col-bar" style={{ height: `${(b.value / top) * 100}%` }} />
              {b.tick != null ? <span className="chart-col-tick">{b.tick}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
