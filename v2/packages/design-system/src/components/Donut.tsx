"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { unitWord, type ChartUnit } from "../lib/units";

export type DonutItem = { label: string; value: number };

export interface DonutProps {
  items: DonutItem[];
  /**
   * وحدةُ العدّ أسفل الرقم المركزيّ — **المصدر نفسه الذي تستعمله قائمة الأشرطة** (`ChartUnit`)،
   * تُصرَّف عربيًّا على الرقم المعروض: «2,940 زيارة» و«2 زيارتان».
   * وتظهر في القلب وفي **كلّ سطرٍ من الأسطورة** (مصرَّفةً على قيمة سطرها)، طِبقًا لقائمة الأشرطة.
   */
  unit?: ChartUnit;
  /** رسالة القائمة الفارغة. */
  empty?: ReactNode;
}

// ألوان الفئات بترتيبٍ ثابت — لا تدوير (ق١٠·٢). الزائد على الستّة يُطوى في «أخرى».
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
const OTHER = "var(--neutral-400)";
const nf = (n: number) => n.toLocaleString("en-US");

/**
 * حلقة (دونات) — **أُقِرّ تخطيطها وحركتها في ٢٠٢٦-٠٨-٠٨** بعد مقارنةٍ حيّة لثلاثة تخطيطات:
 *
 * - **الحلقة تكبر بكِبَر الكرت** (مقاسٌ من الحاوية لا ١٤٨px ثابتة، فلا يبقى ثلثا الكرت فارغًا).
 * - **أسطورةٌ بأشرطة:** كلّ سطرٍ يحمل التسمية والعدد والنسبة **مكتوبةً**، وتحته شريطُ نسبته.
 *   فالفراغ يمتلئ بمعلومة، والفئات تُقارَن **بالطول** لا بالزاوية (والزاوية أضعف ما تُقارَن به)،
 *   وهو ترميزٌ ثانويّ مع اللون (ق١٠·٤) يفصل الأزرقين المتجاورين.
 * - **التحويم** على قطاعٍ أو سطرٍ يُفرده في القلب ويُخفت إخوته (أوقعُ من الضغط، بكلمة المالك).
 * - **الضغط** يُخفي الفئة، و**النسبة من المجموع الكامل دائمًا** فلا تقفز حين تُخفى أختها
 *   (كانت ٣٢٪ تصير ٨٤٪ فتُقرأ عطلًا لا تصفية)، والمخفيّ يبقى مشطوبًا بنسبته.
 */
export function Donut({ items, unit, empty }: DonutProps) {
  const [hidden, setHidden] = useState<Set<number>>(() => new Set());
  const [act, setAct] = useState<number | null>(null);

  const slices = useMemo(
    () =>
      items.length <= COLORS.length
        ? items.map((it, i) => ({ label: it.label, value: it.value, color: COLORS[i] }))
        : [
            ...items.slice(0, COLORS.length - 1).map((it, i) => ({ label: it.label, value: it.value, color: COLORS[i] })),
            { label: "أخرى", value: items.slice(COLORS.length - 1).reduce((s, it) => s + it.value, 0), color: OTHER },
          ],
    [items],
  );
  if (!items.length) return <p className="chart-empty">{empty ?? "لا بيانات."}</p>;

  const fullTotal = slices.reduce((s, it) => s + it.value, 0) || 1;
  const visible = slices.reduce((s, it, i) => (hidden.has(i) ? s : s + it.value), 0);
  const filtered = hidden.size > 0;
  const pct = (v: number) => Math.round((v / fullTotal) * 100);

  const toggle = (i: number) =>
    setHidden((prev) => {
      const next = new Set(prev);
      // لا يُخفى آخرُ قطاعٍ ظاهر (حلقةٌ فارغة بلا معنى).
      if (next.has(i)) next.delete(i);
      else if (slices.length - next.size > 1) next.add(i);
      return next;
    });

  const R = 56, C = 2 * Math.PI * R, GAP = slices.length - hidden.size > 1 ? 2.5 : 0;
  let acc = 0;
  const shown = act != null ? slices[act] : null;

  return (
    // القطر يتبع عدد الصفوف (السياسة في الأنماط، والعدد وحده يُمرَّر) — والصفوف تنضغط متى كثرت.
    <div className={"chart-donut" + (slices.length >= 5 ? " many" : "")} style={{ "--donut-rows": slices.length } as CSSProperties}>
      <div className="chart-donut-ring">
        <svg
          viewBox="0 0 148 148" role="img"
          aria-label={`توزيع: ${slices.filter((_, i) => !hidden.has(i)).map((s) => `${s.label} ${pct(s.value)}٪`).join("، ")}`}
        >
          <g transform="rotate(-90 74 74)">
            <circle cx="74" cy="74" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth="17" />
            {slices.map((s, i) => {
              // المخفيّ يبقى في DOM بطولٍ صفر (لا يُحذَف) كي ينكمش/ينمو بسلاسة عبر transition.
              const len = hidden.has(i) ? 0 : (s.value / (visible || 1)) * C;
              const vis = Math.max(0, len - GAP);
              const el = (
                <circle
                  key={i}
                  className={"chart-donut-arc" + (act != null && act !== i ? " dim" : "")}
                  cx="74" cy="74" r={R} fill="none" stroke={s.color} strokeWidth="17"
                  strokeDasharray={`${vis} ${C - vis}`} strokeDashoffset={-acc}
                  onPointerEnter={() => setAct(i)} onPointerLeave={() => setAct(null)}
                />
              );
              acc += len;
              return el;
            })}
          </g>
          <text x="74" y={shown ? 68 : 70} textAnchor="middle" className="chart-donut-n">
            {nf(shown ? shown.value : visible)}
          </text>
          <text x="74" y={shown ? 86 : 88} textAnchor="middle" className="chart-donut-l">
            {shown ? `${shown.label}، ${pct(shown.value)}٪` : filtered ? `من أصل ${nf(fullTotal)}` : unitWord(visible, unit)}
          </text>
        </svg>
      </div>

      <div className="chart-donut-leg">
        {slices.map((s, i) => {
          const off = hidden.has(i);
          return (
            <button
              key={i} type="button" aria-pressed={!off}
              className={"chart-donut-legitem" + (off ? " off" : "") + (act === i ? " act" : "")}
              onClick={() => toggle(i)}
              onPointerEnter={() => setAct(i)}
              onPointerLeave={() => setAct(null)}
            >
              <i style={{ background: s.color }} />
              <span className="chart-donut-lbl">{s.label}</span>
              {/* العدد ووحدتُه **ذرّةٌ واحدة** بفرجةٍ ضيّقة (لا عمودان تفصلهما فرجةُ الجدول). */}
              <b>{nf(s.value)}{unit ? <span className="chart-unit">{unitWord(s.value, unit)}</span> : null}</b>
              {/* النسبة في **نهاية الشريط** لا في سطر العدد — كقائمة الأشرطة سواءً (٢٠٢٦-٠٨-١٠). */}
              <span className="chart-line">
                <span className="chart-donut-bar">
                  <span style={{ width: `${off ? 0 : Math.max(1, (s.value / fullTotal) * 100)}%`, background: s.color }} />
                </span>
                <em className="chart-pct">{pct(s.value)}٪</em>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
