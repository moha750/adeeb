"use client";

import { useId, useState, type MouseEvent } from "react";

export type AreaPoint = {
  /** تسمية النقطة على المحور الأفقيّ (وفي التلميح) — مثل تاريخٍ مُنسّق. */
  label: string;
  /** قيمة السلسلة الأولى (تُرسم مساحةً). */
  a: number;
  /** قيمة السلسلة الثانية (تُرسم خطًّا متقطّعًا) — إن وُجدت السلسلة. */
  b?: number;
};

export interface AreaChartProps {
  data: AreaPoint[];
  /** اسم السلسلة الأولى (المساحة) — للأسطورة والتلميح. */
  seriesA: string;
  /** اسم السلسلة الثانية (الخطّ) — تُرسم إن مُرّرت. */
  seriesB?: string;
  /** تنسيق القيم في التلميح (الافتراضي toLocaleString en-US). */
  formatValue?: (n: number) => string;
}

const nf = (n: number) => n.toLocaleString("en-US");
type Pt = [number, number];
// منحنى ناعم (Catmull-Rom → Bézier) يمرّ بكلّ النقاط — انسيابٌ لا زوايا حادّة.
const smooth = (pts: Pt[]) => {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0]},${pts[0][1]}` : "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1] ?? pts[i];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const [x3, y3] = pts[i + 2] ?? pts[i + 1];
    d += ` C ${x1 + (x2 - x0) / 6},${y1 + (y2 - y0) / 6} ${x2 - (x3 - x1) / 6},${y2 - (y3 - y1) / 6} ${x2},${y2}`;
  }
  return d;
};

/**
 * مخطّط زمنيّ (مساحة + خطّ) بمحورٍ **واحد**: منحنًى ناعمٌ انسيابيّ، تعبئةٌ متدرّجةٌ غنيّة تتلاشى للأسفل،
 * وخطوطٌ **ثابتة العرض** (non-scaling) فلا تُشوّهها مطّاطيّةُ العرض. تمرير الفأرة يُظهر شعرةً ونقاطًا
 * وتلميحًا. السلسلة الثانية متقطّعةٌ (تمييزٌ بالشكل)، والأسطورة دائمة الحضور.
 */
export function AreaChart({ data, seriesA, seriesB, formatValue = nf }: AreaChartProps) {
  const gid = useId();
  const [hi, setHi] = useState<number | null>(null);
  const W = 780, H = 240, PL = 8, PR = 8, PT = 16, PB = 26;
  const n = data.length;
  const hasB = seriesB != null;
  const max = Math.max(1, ...data.map((d) => d.a), ...(hasB ? data.map((d) => d.b ?? 0) : []));
  const plotW = W - PL - PR, plotH = H - PT - PB, base = PT + plotH;
  const x = (i: number) => PL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PT + plotH - (v / max) * plotH;

  const ptsA: Pt[] = data.map((d, i) => [x(i), y(d.a)]);
  const ptsB: Pt[] = hasB ? data.map((d, i) => [x(i), y(d.b ?? 0)]) : [];
  const lineAD = smooth(ptsA);
  const lineBD = hasB ? smooth(ptsB) : "";
  const areaD = n ? `${lineAD} L ${x(n - 1)},${base} L ${PL},${base} Z` : "";
  const areaBD = hasB && n ? `${lineBD} L ${x(n - 1)},${base} L ${PL},${base} Z` : "";

  const gy = [0.25, 0.5, 0.75, 1].map((f) => PT + plotH - f * plotH);
  const labelIdx = n <= 8 ? data.map((_, i) => i) : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHi(Math.round(rel * (n - 1)));
  };
  const hd = hi != null ? data[hi] : null;
  // انزياحٌ عند الحواف: الطرفان يلتصقان بالحافة بدل أن يُقصّا (الكرت يقصّ لزوايا الرأس).
  const anchor = (i: number) => { const rel = x(i) / W; return rel > 0.9 ? "translateX(-100%)" : rel < 0.1 ? "translateX(0)" : "translateX(-50%)"; };

  return (
    <div className="chart-area" dir="ltr" onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${seriesA}${hasB ? ` و${seriesB}` : ""} عبر الزمن`}>
        {gy.map((yy, i) => <line key={i} x1={PL} x2={W - PR} y1={yy} y2={yy} className="chart-area-grid" />)}
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.42" />
            <stop offset="55%" stopColor="var(--chart-1)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${gid}b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-4)" stopOpacity="0.30" />
            <stop offset="60%" stopColor="var(--chart-4)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--chart-4)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaD ? <path d={areaD} fill={`url(#${gid})`} /> : null}
        {hasB && areaBD ? <path d={areaBD} fill={`url(#${gid}b)`} /> : null}
        {n > 1 ? <path d={lineAD} fill="none" stroke="var(--chart-1)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : null}
        {hasB && n > 1 ? <path d={lineBD} fill="none" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.9" /> : null}
        {n > 1 ? data.map((d, i) => <circle key={`pa${i}`} cx={x(i)} cy={y(d.a)} r={2.6} fill="var(--chart-1)" stroke="var(--color-surface)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />) : null}
        {hasB && n > 1 ? data.map((d, i) => <circle key={`pb${i}`} cx={x(i)} cy={y(d.b ?? 0)} r={2.4} fill="var(--chart-4)" stroke="var(--color-surface)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />) : null}
        {hi != null && hd ? (
          <>
            <line x1={x(hi)} x2={x(hi)} y1={PT} y2={PT + plotH} className="chart-area-cross" vectorEffect="non-scaling-stroke" />
            <circle cx={x(hi)} cy={y(hd.a)} r={4} fill="var(--chart-1)" stroke="var(--color-surface)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            {hasB ? <circle cx={x(hi)} cy={y(hd.b ?? 0)} r={4} fill="var(--chart-4)" stroke="var(--color-surface)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" /> : null}
          </>
        ) : null}
      </svg>
      <div className="chart-area-xaxis">
        {labelIdx.map((i) => <span key={i} dir="rtl" style={{ left: `${(x(i) / W) * 100}%`, transform: anchor(i) }}>{data[i]?.label ?? ""}</span>)}
      </div>
      {hi != null && hd ? (
        <div className="chart-tip" dir="rtl" style={{ left: `${(x(hi) / W) * 100}%`, transform: anchor(hi) }}>
          <b>{hd.label}</b>
          <span><i style={{ background: "var(--chart-1)" }} /> {seriesA}: {formatValue(hd.a)}</span>
          {hasB ? <span><i style={{ background: "var(--chart-4)" }} /> {seriesB}: {formatValue(hd.b ?? 0)}</span> : null}
        </div>
      ) : null}
      <div className="chart-legend" dir="rtl">
        <span><i style={{ background: "var(--chart-1)" }} /> {seriesA}</span>
        {hasB ? <span><i style={{ background: "var(--chart-4)" }} /> {seriesB}</span> : null}
      </div>
    </div>
  );
}
