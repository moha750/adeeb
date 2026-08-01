"use client";

import { useState, type ReactNode } from "react";

export type DonutItem = { label: string; value: number };

export interface DonutProps {
  items: DonutItem[];
  /** تسمية أسفل الرقم المركزيّ (وحدة القياس، مثل «زيارة»). */
  centerLabel?: string;
  /** رسالة القائمة الفارغة. */
  empty?: ReactNode;
}

// ألوان الفئات بترتيبٍ ثابت — لا تدوير (منهيّ مهارة المخطّطات). الزائد على الستّة يُطوى في «أخرى».
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
const OTHER = "var(--neutral-400)";
const nf = (n: number) => n.toLocaleString("en-US");
const pct = (v: number, total: number) => Math.round((v / total) * 100);

/**
 * حلقة (دونات) — قطاعات نسبتها من المجموع، ورقمٌ مركزيّ. فجوة سطح 2px بين القطاعات، وسقف ٦ فئات
 * ملوّنة يُطوى ما بعدها في «أخرى». **أسطورةٌ تفاعليّة:** الضغط على فئةٍ يُخفي قطاعها ويشطبها، وتُعاد
 * النسب والرقم المركزيّ على الظاهر. الهوية نصٌّ لا لونٌ وحده، ووصفُ aria للتوزيع.
 */
export function Donut({ items, centerLabel, empty }: DonutProps) {
  const [hidden, setHidden] = useState<Set<number>>(() => new Set());
  if (!items.length) return <p className="chart-empty">{empty ?? "لا بيانات."}</p>;

  const slices =
    items.length <= COLORS.length
      ? items.map((it, i) => ({ label: it.label, value: it.value, color: COLORS[i] }))
      : [
          ...items.slice(0, COLORS.length - 1).map((it, i) => ({ label: it.label, value: it.value, color: COLORS[i] })),
          { label: "أخرى", value: items.slice(COLORS.length - 1).reduce((s, it) => s + it.value, 0), color: OTHER },
        ];

  const toggle = (i: number) => setHidden((prev) => {
    const next = new Set(prev);
    // لا يُخفى آخرُ قطاعٍ ظاهر (حلقةٌ فارغة بلا معنى).
    if (next.has(i)) next.delete(i);
    else if (slices.length - next.size > 1) next.add(i);
    return next;
  });

  const rawTotal = slices.reduce((s, it, i) => (hidden.has(i) ? s : s + it.value), 0);
  const total = rawTotal || 1;
  const visibleCount = slices.length - hidden.size;
  const R = 54, C = 2 * Math.PI * R, GAP = visibleCount > 1 ? 2 : 0;
  let acc = 0;

  return (
    <div className="chart-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={`توزيع: ${slices.filter((_, i) => !hidden.has(i)).map((s) => `${s.label} ${pct(s.value, total)}٪`).join("، ")}`}>
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth="18" />
          {slices.map((s, i) => {
            // المخفيّ يبقى في DOM بطولٍ صفر (لا يُحذَف) كي ينكمش/ينمو بسلاسة عبر transition.
            const len = hidden.has(i) ? 0 : (s.value / total) * C;
            const vis = Math.max(0, len - GAP);
            const el = (
              <circle key={i} className="chart-donut-arc" cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="18"
                strokeDasharray={`${vis} ${C - vis}`} strokeDashoffset={-acc} />
            );
            acc += len;
            return el;
          })}
        </g>
        <text x="70" y="66" textAnchor="middle" className="chart-donut-n">{nf(rawTotal)}</text>
        {centerLabel ? <text x="70" y="84" textAnchor="middle" className="chart-donut-l">{centerLabel}</text> : null}
      </svg>
      <div className="chart-donut-leg">
        {slices.map((s, i) => {
          const off = hidden.has(i);
          return (
            <button key={i} type="button" className={"chart-donut-legitem" + (off ? " off" : "")} onClick={() => toggle(i)} aria-pressed={!off}>
              <i style={{ background: s.color }} />
              <span>{s.label}</span>
              <b>{off ? "—" : `${pct(s.value, total)}٪`}</b>
            </button>
          );
        })}
      </div>
    </div>
  );
}
