import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";

export interface HeatGridProps {
  /** تسميات الصفوف (مثل أيّام الأسبوع). */
  rows: string[];
  /** تسميات الأعمدة (مثل الساعات). */
  cols: string[];
  /** المصفوفة: `values[صفّ][عمود]` = القيمة. */
  values: number[][];
  /** أقصى قيمةٍ للمقياس — الافتراضي أكبر قيمةٍ في المصفوفة. */
  max?: number;
  /** لون الأساس (من --chart-*)؛ تتدرّج كثافته بالقيمة. الافتراضي --chart-1. */
  tone?: string;
  /** تنسيق قيمة الخليّة والتلميح. */
  formatValue?: (n: number) => ReactNode;
  /** أسطورة مقياس اللون أسفل الشبكة (درجاتٌ من أقلّ إلى أكثر). الافتراضي true. */
  legend?: boolean;
  /** وصفا طرفَي المقياس (لا رقم — الوصف أوضح). */
  legendLow?: string;
  legendHigh?: string;
  empty?: ReactNode;
}

const nf = (n: number) => n.toLocaleString("en-US");
// الفارغ أخفّ من أقلّ القيَم: القيَم تُخطَّط إلى [VALUE_FLOOR..100] فتكون كلّها أشدّ لونًا من الفارغ (EMPTY_PCT).
const EMPTY_PCT = 15;
const VALUE_FLOOR = 26;
// نسبة الخليّة: الفارغ ثابتٌ خفيف، والقيمة تبدأ من الأرضيّة صعودًا.
const cellPct = (v: number, top: number) => (v <= 0 ? EMPTY_PCT : VALUE_FLOOR + Math.round((v / top) * (100 - VALUE_FLOOR)));
// درجات الأسطورة: من أرضيّة القيمة (أقلّ ازدحامًا) إلى الأقصى — كلّها أغمق من الفارغ.
const GRADES = [VALUE_FLOOR, 41, 56, 70, 85, 100];
const mix = (tone: string, pct: number) => `color-mix(in oklab, ${tone} ${pct}%, var(--color-surface))`;

/**
 * خريطة حراريّة ثنائيّة — صفوفٌ × أعمدة، كثافةُ **لونٍ واحد** (تدرّجٌ متتابع) تُشفّر القيمة في كلّ
 * خليّة، والرقم مكتوبٌ فيها (أبيض على الغامق). تكشف نمطًا في بُعدين معًا (يوم × ساعة نموذجًا).
 * تحمل **أسطورةَ مقياس** (لا لونَ بلا مفتاح) وتُحلِّق **خليّةَ الذروة** بحلقةٍ ليقع عليها البصر.
 */
export function HeatGrid({
  rows, cols, values, max, tone = "var(--chart-1)", formatValue = nf,
  legend = true, legendLow = "أقلّ نشاطًا", legendHigh = "أكثر نشاطًا", empty,
}: HeatGridProps) {
  if (!rows.length || !cols.length) return <p className="chart-empty">{empty ?? "لا بيانات."}</p>;
  const top = max ?? Math.max(1, ...values.flat());

  // الذروة — أكبر خليّةٍ (لإبرازها ولوصف aria).
  let pR = -1, pC = -1, pV = -1;
  values.forEach((row, ri) => row.forEach((v, ci) => { if (v > pV) { pV = v; pR = ri; pC = ci; } }));
  const peakLabel = pV > 0 ? `الذروة: ${rows[pR]} · ${cols[pC]} — ${nf(pV)}` : "";

  return (
    <div className="chart-heatgrid-wrap" role="img" aria-label={`خريطة حرارة: النشاط حسب ${rows.length} صفًّا و${cols.length} عمودًا${peakLabel ? "؛ " + peakLabel : ""}`}>
      <div className="chart-heatgrid" style={{ "--hg-cols": cols.length } as CSSProperties}>
        <span className="chart-heatgrid-corner" aria-hidden="true" />
        {cols.map((c, i) => <span key={`c${i}`} className="chart-heatgrid-colh">{c}</span>)}
        {rows.map((r, ri) => (
          <Fragment key={ri}>
            <span className="chart-heatgrid-rowh">{r}</span>
            {cols.map((_, ci) => {
              const v = values[ri]?.[ci] ?? 0;
              const pct = cellPct(v, top);
              const cls = "chart-heatgrid-cell" + (pct >= 62 ? " hot" : "") + (ri === pR && ci === pC && pV > 0 ? " peak" : "");
              return (
                <span key={ci} className={cls} title={`${r} · ${cols[ci]} — ${nf(v)}`} style={{ background: mix(tone, pct) }}>
                  {v ? formatValue(v) : ""}
                </span>
              );
            })}
          </Fragment>
        ))}
      </div>

      {legend && (
        <div className="chart-heatgrid-legend">
          <span>{legendLow}</span>
          <span className="chart-heatgrid-grades" aria-hidden="true">
            {GRADES.map((p, i) => <span key={i} style={{ background: mix(tone, p) }} />)}
          </span>
          <span>{legendHigh}</span>
        </div>
      )}
    </div>
  );
}
