"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";

export type AreaSeries = {
  /** اسم السلسلة — للأسطورة والتلميح. */
  name: string;
  /** قيمها بترتيب `labels` نفسه (الناقصُ يُقرأ صفرًا). */
  values: number[];
  /** لونها (من `--chart-*`) — بلا قيمةٍ تأخذ ترتيبَها من لوحة السلاسل أدناه. */
  color?: string;
};

export interface AreaChartProps {
  /** تسميات المحور الزمنيّ (تاريخٌ مُنسّق) — طولُها يحكم عدد النقاط. */
  labels: string[];
  /** سلسلةٌ أو أكثر بمقياسٍ **مشترك** (ق١٠·١: لا محورين بمقياسين مختلفين). */
  series: AreaSeries[];
  /** تنسيق القيم في التلميح (الافتراضي toLocaleString en-US). */
  formatValue?: (n: number) => string;
}

const nf = (n: number) => n.toLocaleString("en-US");
const cf = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
// سقفٌ «جميل» (1 · 2 · 2.5 · 5 · 10 × عشرة أُسّ) — بلا هذا تخرج علاماتُ المحور أرقامًا شاردة.
const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const f = v / 10 ** exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * 10 ** exp;
};

/**
 * لوحةُ سلاسل الزمنيّ — تبدأ بالزوج **المُقَرّ** (فولاذيّ + أخضر، ق١٠)، ثمّ الذهبيّ فالبنفسجيّ
 * فالبرتقاليّ، و**الكحليّ آخرًا** لأنّه أقربُ الألوان إلى الفولاذيّ (تحفّظ اللوحة المكتوب في ق١٠).
 */
const SERIES_COLORS = ["var(--chart-1)", "var(--chart-4)", "var(--chart-3)", "var(--chart-5)", "var(--chart-6)", "var(--chart-2)"];
/** تمييزٌ بالشكل مع اللون (ق١٠·٧): الأولى متّصلة ثمّ أنماطُ تقطيعٍ مختلفة، فلا تُقرأ الهويّة باللون وحده. */
const SERIES_DASH = ["", "6 5", "2 4", "10 4 2 4", "1 5", "8 3 2 3"];

/**
 * انزلاقُ رقمٍ إلى هدفه (easeOutCubic بمدّة `--dur-chart`) — يُستعمل لسقف المحور: حين تُخفى سلسلةٌ يتغيّر المقياس،
 * فبلا هذا يقفز المنحنى قفزةً واحدة. والأرقامُ على المحور تتبع القيمة المنزلقة نفسها، فلا يكذب
 * الرسمُ على تسميته لحظةً واحدة. ويُحترَم `prefers-reduced-motion` فيقع الانتقال فورًا.
 */
// المدّةُ تُقرأ من الرمز `--dur-chart` لا تُكتب رقمًا هنا: **مصدرٌ واحد** يضبط خفوتَ السلسلة
// (CSS) وانزلاقَ المقياس (JS) معًا، فلا يفترق أحدهما عن الآخر عند التعديل.
const chartDur = () => {
  if (typeof getComputedStyle === "undefined") return 850;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--dur-chart").trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? (v.endsWith("ms") ? n : n * 1000) : 850;
};

function useEased(target: number) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);
  useEffect(() => {
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setV(target); return; }
    from.current = v;
    const ms = chartDur();
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - (1 - p) ** 3;
      setV(from.current + (target - from.current) * e);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return v;
}

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
 * مخطّط زمنيّ (مساحة + خطّ) بمحورٍ **واحد**، و**الزمنُ يسير يمينًا ← يسارًا** كاتّجاه القراءة:
 * منحنًى ناعمٌ انسيابيّ، تعبئةٌ متدرّجةٌ تتلاشى للأسفل، ورسمٌ **بالبكسل الحقيقيّ** (ResizeObserver)
 * فلا يُشوّه المطُّ دائرةً ولا يكذب ميلٌ باختلاف الشاشة. تمرير الفأرة يُظهر شعرةً ونقاطًا وتلميحًا.
 *
 * **يقبل سلسلةً أو أكثر** بمقياسٍ مشترك: لكلٍّ لونٌ من لوحة السلاسل ونمطُ تقطيعٍ يميّزها بالشكل.
 *
 * **والأسطورة تفرد بانسياب:** الضغطُ على بندٍ فيها يُخفي سلسلته **خفوتًا لا اختفاءً فجائيًّا**،
 * ويُعاد المقياسُ على الظاهر وحده **منزلقًا** إلى سقفه الجديد فتتّضح تفاصيلُ السلسلة الصغيرة بلا
 * قفزة. ولا تُخفى آخرُ سلسلةٍ ظاهرة. (كأسطورة الحلقة سواءً بسواء.)
 */
export function AreaChart({ labels, series, formatValue = nf }: AreaChartProps) {
  const gid = useId();
  const [hi, setHi] = useState<number | null>(null);
  const [off, setOff] = useState<Set<number>>(() => new Set());
  // عرض الرسم = عرض الحاوية الحقيقيّ. viewBox يساوي العرضَ المعروض فيصير المقياس 1:1 أفقيًّا ورأسيًّا:
  // الدائرة دائرةٌ على كلّ شاشة (كانت تُمطّ إلى بيضاويّة، ثمّ إلى شظيّة على الجوّال)، والميل صادق.
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [W, setW] = useState(780);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // PB صغيرةٌ عمدًا: خطّ القاع يلتصق بأسفل الرسم فتقع تحته تسمياتُ التاريخ مباشرةً (لا تطفو بفجوة).
  const H = 240, PL = 8, PR = 8, PT = 16, PB = 8;
  const n = labels.length;
  const plotW = W - PL - PR, plotH = H - PT - PB, base = PT + plotH;

  const shown = series.map((_, i) => !off.has(i));
  const toggle = (i: number) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (series.length - next.size > 1) next.add(i); // آخرُ سلسلةٍ ظاهرةٍ لا تُخفى
      return next;
    });

  const maxTarget = niceMax(Math.max(1, ...series.flatMap((s, i) => (shown[i] ? s.values : []))));
  const max = useEased(maxTarget);
  // **الزمن يسير يمينًا ← يسارًا** (مُقَرّ ٢٠٢٦-٠٨-١٠): الواجهة عربيّةٌ والعينُ تبدأ من اليمين،
  // وأخواتُه (الخريطة والأشرطة والمدرّج) تقرأ هكذا. فأقدمُ نقطةٍ عند اليمين مع عدّاد الأرقام،
  // والأحدثُ عند اليسار. والحاوية تبقى `dir="ltr"` لأنّ الحساب بالبكسل من الحافّة اليسرى.
  const x = (i: number) => PL + plotW - (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PT + plotH - (v / max) * plotH;

  const paths = series.map((s) => {
    const pts: Pt[] = labels.map((_, i) => [x(i), y(s.values[i] ?? 0)]);
    const line = smooth(pts);
    // الإغلاق يعود إلى **أوّل نقطةٍ** لا إلى حافّة الرسم: بعد قلب الاتّجاه صارت أوّلُ نقطةٍ يمينًا،
    // وإغلاقٌ على الحافّة اليسرى يقطع المضلّع قطرًا فيظهر مثلّثٌ شاذّ تحت المنحنى.
    return { line, area: n ? `${line} L ${x(n - 1)},${base} L ${x(0)},${base} Z` : "" };
  });

  // علاماتُ المقياس: الصفر خطُّ قاعٍ أغلظ، وما فوقه شبكة. القيمة مكتوبةٌ بإزاء كلّ خطّ على اليمين.
  const gy = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ f, y: PT + plotH - f * plotH, v: max * f }));
  // التسميات كما هي، إلّا أن يضيق العرض فتُنخَل نخلًا متساويًا (الطرفان يبقيان) بدل أن تتراكب.
  const wanted = n <= 8 ? labels.map((_, i) => i) : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
  const room = Math.max(2, Math.floor(plotW / 62));
  const labelIdx =
    wanted.length <= room ? wanted : Array.from({ length: room }, (_, i) => Math.round((i * (n - 1)) / (room - 1)));

  // الالتقاط يُقاس من **الرسم نفسه** لا من الحاوية: الحاوية تحمل حشوة عدّاد الأرقام (يمينًا)،
  // فقياسٌ عليها يزحف بالمؤشّر ويمنع بلوغَ آخر نقطةٍ إلّا بالدخول في حيّز الأرقام.
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = svgRef.current;
    if (!el || n < 1) return;
    const r = el.getBoundingClientRect();
    const rel = Math.min(1, Math.max(0, (e.clientX - r.left - PL) / Math.max(1, plotW)));
    setHi(Math.round((1 - rel) * (n - 1))); // معكوسٌ: يمينُ الرسم أقدمُ نقطة
  };
  // انزياحٌ عند الحواف: الطرفان يلتصقان بالحافة بدل أن يُقصّا (الكرت يقصّ لزوايا الرأس).
  const anchor = (i: number) => { const rel = x(i) / W; return rel > 0.9 ? "translateX(-100%)" : rel < 0.1 ? "translateX(0)" : "translateX(-50%)"; };
  const color = (i: number) => series[i]?.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
  const dash = (i: number) => SERIES_DASH[i % SERIES_DASH.length];

  return (
    <div
      className="chart-area" ref={wrapRef} dir="ltr" tabIndex={0} role="img"
      aria-label={`${series.map((s) => s.name).join(" و")} عبر الزمن، الأقصى ${formatValue(max)}`}
      onMouseMove={onMove} onMouseLeave={() => setHi(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          // السهمُ يمشي مع الزمن لا مع الشاشة: يسارٌ = أحدث، يمينٌ = أقدم.
          setHi((p) => Math.min(n - 1, Math.max(0, (p ?? 0) + (e.key === "ArrowLeft" ? 1 : -1))));
        } else if (e.key === "Escape") setHi(null);
      }}
    >
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <defs>
          {series.map((_, i) => (
            <linearGradient key={i} id={`${gid}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color(i)} stopOpacity="0.34" />
              <stop offset="55%" stopColor={color(i)} stopOpacity="0.12" />
              <stop offset="100%" stopColor={color(i)} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {gy.filter((g) => g.f > 0).map((g) => (
          <line key={g.f} x1={PL} x2={W - PR} y1={g.y} y2={g.y} className="chart-area-grid" />
        ))}
        {series.map((s, i) => (
          <g key={`s${i}`} className={"chart-area-s" + (shown[i] ? "" : " off")}>
            {paths[i].area ? <path d={paths[i].area} fill={`url(#${gid}-${i})`} /> : null}
            {n > 1 ? (
              <path d={paths[i].line} fill="none" stroke={color(i)} strokeWidth={i === 0 ? 2.6 : 2}
                strokeDasharray={dash(i) || undefined} strokeLinejoin="round" strokeLinecap="round" />
            ) : null}
            {n > 1 ? labels.map((_, j) => (
              <circle key={j} cx={x(j)} cy={y(s.values[j] ?? 0)} r={2.6} fill={color(i)} stroke="var(--color-surface)" strokeWidth={1.4} />
            )) : null}
          </g>
        ))}
        {/* خطّ القاع يُرسم **بعد** المساحات لا قبلها: التعبئة تبتلعه إن سبقها. */}
        <line x1={PL} x2={W - PR} y1={base} y2={base} className="chart-area-axis" />
        {hi != null ? (
          <>
            <line x1={x(hi)} x2={x(hi)} y1={PT} y2={PT + plotH} className="chart-area-cross" />
            {series.map((s, i) => (
              <circle key={`h${i}`} className={"chart-area-s" + (shown[i] ? "" : " off")}
                cx={x(hi)} cy={y(s.values[hi] ?? 0)} r={4} fill={color(i)} stroke="var(--color-surface)" strokeWidth={1.5} />
            ))}
          </>
        ) : null}
      </svg>

      {/* عدّاد الأرقام: نصٌّ **HTML** لا SVG — المقياسُ الرأسيّ 1:1 فتقع كلّ علامةٍ على خطّها. */}
      <div className="chart-area-yaxis" aria-hidden>
        {/* تُقرَّب أثناء الانزلاق: كسورٌ عشريّة تتراقص على المحور ضجيجٌ لا معلومة. */}
        {gy.map((g) => <span key={g.f} style={{ top: `${g.y}px` }}>{cf.format(Math.round(g.v))}</span>)}
      </div>
      <div className="chart-area-xaxis">
        {labelIdx.map((i) => <span key={i} dir="rtl" style={{ left: `${x(i)}px`, transform: anchor(i) }}>{labels[i] ?? ""}</span>)}
      </div>

      {hi != null ? (
        <div className="chart-tip" dir="rtl" style={{ left: `${x(hi)}px`, transform: anchor(hi) }}>
          <b>{labels[hi]}</b>
          {series.map((s, i) => (shown[i] ? (
            <span key={i}><i style={{ background: color(i) }} /> {s.name}: {formatValue(s.values[hi] ?? 0)}</span>
          ) : null))}
        </div>
      ) : null}

      <div className="chart-legend" dir="rtl">
        {series.map((s, i) => (
          <button key={i} type="button" className={"chart-legend-item" + (shown[i] ? "" : " off")}
            aria-pressed={shown[i]} onClick={() => toggle(i)}>
            <i style={{ background: color(i) }} /> {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
