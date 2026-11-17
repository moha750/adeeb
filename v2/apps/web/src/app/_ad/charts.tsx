"use client";

/**
 * **رسومُ الهويّة** (٢٠٢٦-١١-٠٧، لقالب الإحصاء «اللوحة» الذي اعتمده محمد).
 * أربعُ قطعٍ يقرؤها قالبُ الإحصاء، كلُّها SVG أو HTML بألوان الأدوار (`.ad-ch-*` في `ad.css`) لا بلونٍ مكتوب:
 * - `AdTrend`: خطٌّ ومساحةٌ لسلسلةٍ واحدة على الزمن. والزمنُ يجري من اليمين إلى اليسار (الأقدمُ يمينًا) كما في مخطّط البوّابة القديم.
 * - `AdColumns`: أعمدةٌ لمقاديرَ مرتّبة (ساعاتُ اليوم)، والذروةُ وحدها بلون الهويّة والباقي رماديّ — «التوكيد» لا قوسُ ألوان.
 * - `AdRing`: حلقةٌ لحصص كلٍّ في أجزاءٍ قليلةٍ يغلب أحدُها (الأجهزة)، بطلب محمد كي يختلف شكلُها عن الخطوط حولها.
 * - `AdHeat`: شبكةُ الأيّام في الساعات بدرجاتِ لونٍ واحد، من الأفتح إلى الأغمق.
 * قواعدُها (منهجُ الرسوم): خطٌّ ٢، وعمودٌ لا يزيد على ٢٤ بطرفٍ مدوّر ٤ وقاعدةٍ مربّعة، وشبكةٌ شعرة، ولا رقمَ على كلّ نقطة،
 * والنصُّ بحبر النصّ لا بلون السلسلة، وتلميحٌ لكلّ علامةٍ بالمرور واللوحة معًا، والقيمةُ فيه أوّلًا والتسميةُ بعدها.
 * والإحداثيّاتُ بالبكسل من الحافّة اليسرى (`dir="ltr"` على الإطار)، والتلميحُ يُوضَع بمتغيّرين (`--tx`/`--ty`) يكتبهما المرجع:
 * موضعُ المؤشّر حيٌّ لا يُكتب في ورقة.
 */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";

/* ═══ أدوات ═══ */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // تبويبٌ فُتح في الخلفية يقيس صفرًا ولا يعود مقياسُه حين يظهر (لا يتغيّر حجمٌ فيُبلَّغ): فيُعاد القياسُ في الإطار التالي حتى يصحّ
    let raf = 0;
    const measure = () => {
      const w = el.clientWidth;
      if (w) setW(w);
      else raf = requestAnimationFrame(measure);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return [ref, w] as const;
}

/** خطوةُ المحور مدوّرةً (1، 2، 5 وعشراتها) ولا تقلّ عن واحد: المسحاتُ أعدادٌ صحيحة */
function niceStep(raw: number): number {
  if (raw <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}
function ticksFor(max: number, count = 3): number[] {
  const step = niceStep(Math.max(max, 1) / count);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const out: number[] = [];
  for (let v = 0; v <= top; v += step) out.push(v);
  return out;
}
const NUM = new Intl.NumberFormat("en-US");
const n = (v: number) => NUM.format(v);

/** طرفُ العمود: مربّعٌ عند القاعدة، مدوّرٌ ٤ في رأسه (منهجُ الرسوم) */
function capPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/* ═══ التلميح: واحدٌ لكلّ رسم، يُوضَع فوق علامته ولا يخرج من إطاره ═══ */
type Tip = { x: number; y: number; value: string; label: string } | null;

function ChartTip({ tip, frame }: { tip: Tip; frame: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = frame.current;
    if (!el || !box || !tip) return;
    const half = el.offsetWidth / 2;
    const x = Math.min(Math.max(tip.x, half), box.clientWidth - half);
    el.style.setProperty("--tx", `${x}px`);
    el.style.setProperty("--ty", `${tip.y}px`);
  }, [tip, frame]);
  return (
    // يُعلَن لقارئ الشاشة ما يقوله (والأسهمُ تحرّكه)، فالتلميحُ ليس للعين وحدها
    <div ref={ref} className="ad-ch-tip" dir="rtl" hidden={!tip} role="status" aria-live="polite">
      {tip ? <><b>{tip.value}</b><span>{tip.label}</span></> : null}
    </div>
  );
}

/** الأسهمُ تحرّك التلميحَ بين العلامات: اليسارُ إلى الأحدث (الزمنُ يجري إليه) */
function stepKey(e: KeyboardEvent, i: number | null, len: number): number | null {
  const at = i ?? -1;
  if (e.key === "ArrowLeft") return Math.min(len - 1, at + 1);
  if (e.key === "ArrowRight") return Math.max(0, at - 1);
  if (e.key === "Home") return 0;
  if (e.key === "End") return len - 1;
  return null;
}

/** **القيمُ كلُّها بلا مرور** (منهجُ الرسوم: التلميحُ يزيد ولا يحجب): جدولٌ مخفيٌّ عن العين يقرؤه قارئُ الشاشة */
function SrTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <table className="ad-sr">
      <caption>{caption}</caption>
      <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map(([a, ...rest], i) => <tr key={i}><th scope="row">{a}</th>{rest.map((b, j) => <td key={j}>{b}</td>)}</tr>)}</tbody>
    </table>
  );
}

/** اللمسُ يختار بالنقر ولا يُغلق بخروج الإصبع (كان التلميحُ يومض ويختفي)؛ والفأرةُ تختار بالمرور وتُغلق بالخروج */
const isTouch = (e: PointerEvent) => e.pointerType === "touch" || e.pointerType === "pen";

/* ═══ الخطّ على الزمن ═══ */

/**
 * **درجةُ الجزء من أدوار البيانات** (`--ad-data-1…6`، الأولى أبرزُها): `i` موضعُ الجزء، و`n` عددُ الأجزاء.
 * - `ordered` (سلّمٌ: تقييم، رقم، حجمٌ مرتّب): تتدرّج بانتظامٍ من الأبرز، فيُقرأ الترتيبُ من اللون وحده.
 * - غيرُه (أسماءٌ بلا ترتيب: خياراتٌ، نعم/لا): متباعدةٌ فلا يتجاور جزءان متقاربان — وأربعةٌ فما دونها على الدرجات الأبعد.
 */
const NOMINAL_FEW = [1, 3, 5, 6];
const NOMINAL_MANY = [1, 3, 5, 2, 4, 6];
export function dataStep(i: number, n: number, ordered = false): number {
  if (ordered) return n > 1 ? 1 + Math.round((i * 5) / (n - 1)) : 1;
  return (n <= 4 ? NOMINAL_FEW : NOMINAL_MANY)[Math.min(i, 5)];
}

export type AdPoint = { label: string; value: number };

/** أطولُ ما يُرسم يومًا يومًا؛ وما زاد يُجمع أسابيعَ (كان `groupable` في المخطّط القديم). و`max` لمن يريد حدًّا أقصر (إحصائيّات الزوّار: 45) */
const DAILY_MAX = 92;
export function weekly(points: AdPoint[], name = (first: string) => `أسبوع ${first}`, max = DAILY_MAX): AdPoint[] {
  if (points.length <= max) return points;
  // الأسابيعُ تُعدّ من آخرها: فالناقصُ أقدمُها لا أحدثُها، ولا يُقرأ الأسبوعُ الجاري هبوطًا
  const out: AdPoint[] = [];
  for (let end = points.length; end > 0; end -= 7) {
    const chunk = points.slice(Math.max(0, end - 7), end);
    out.unshift({ label: name(chunk[0].label), value: chunk.reduce((s, p) => s + p.value, 0) });
  }
  return out;
}

/** الخطُّ الثاني في `AdTrend` (إحصائيّات الزوّار: الزوّارُ تحت المشاهدات) */
export type AdTrendAlso = { points: AdPoint[]; unit: (v: number) => string; name: string };

export function AdTrend({ points, unit, label, height = 220, onPlate, name, also }: {
  points: AdPoint[];
  /**
   * **خطّان في رسمٍ واحد** (محمد ٢٠٢٦-١١-١٤: «الرسمتان أجمل بصريًّا» من مبدّلٍ بينهما): الثاني بدرجةٍ أفتح وبلا مساحة، يُقاسان على
   * محورٍ واحد، والتلميحُ يقول العددين معًا، ومفتاحُهما فوق الرسم باسميهما (`name` للأوّل). وبلا `also` الرسمُ كما كان خطًّا واحدًا
   */
  also?: AdTrendAlso;
  name?: string;
  /** القيمةُ بمعدودها في التلميح («12 مسحة») */
  unit: (v: number) => string;
  /** وصفُ الرسم لقارئ الشاشة */
  label: string;
  height?: number;
  /** على مادّة اللوح (الاتّجاه ج): الخطُّ بحبر اللوح */
  onPlate?: boolean;
}) {
  const [frame, W] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const H = height, PT = 12, PB = 28, PL = 8, PR = 48;
  const plotW = Math.max(0, W - PL - PR), plotH = H - PT - PB, base = PT + plotH;
  const len = points.length;
  const max = Math.max(0, ...points.map((p) => p.value), ...(also?.points.map((p) => p.value) ?? []));
  const ticks = ticksFor(max);
  const top = ticks[ticks.length - 1];
  const x = (i: number) => PL + plotW - (len <= 1 ? plotW / 2 : (i / (len - 1)) * plotW);
  const y = (v: number) => PT + plotH - (v / top) * plotH;
  const path = (ps: AdPoint[]) => ps.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const line = path(points);
  const line2 = also ? path(also.points) : "";
  const v2 = (i: number) => also?.points[i]?.value;
  const area = len ? `${line}L${x(len - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z` : "";
  // ثلاثُ تسمياتٍ في العريض، وطرفان في الضيّق (التسمياتُ الأسبوعيّةُ الطويلةُ تتلاصق على الجوّال)
  const marks = len > 2 ? (plotW < 320 ? [0, len - 1] : [0, Math.floor((len - 1) / 2), len - 1]) : points.map((_, i) => i);
  // النصُّ بالعربيّة (`direction="rtl"`)، فبدايتُه يمينُه: الأوّلُ (أقصى اليمين) يمتدّ إلى اليسار من نقطته، والأخيرُ إلى اليمين
  const anchor = (i: number) => (len === 1 ? "middle" : i === 0 ? "start" : i === len - 1 ? "end" : "middle");

  const near = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = len <= 1 ? 0 : Math.round(((PL + plotW - px) / plotW) * (len - 1));
    setHi(Math.min(len - 1, Math.max(0, i)));
  };
  const tip: Tip = hi === null || !points[hi] ? null : {
    x: x(hi),
    y: y(Math.max(points[hi].value, v2(hi) ?? 0)) - 12,
    value: also && v2(hi) !== undefined ? `${unit(points[hi].value)}، ${also.unit(v2(hi)!)}` : unit(points[hi].value),
    label: points[hi].label,
  };

  return (
    <div ref={frame} className="ad-ch" data-plate={onPlate ? "" : undefined} dir="ltr">

      {W > 0 && (
        <svg
          width={W} height={H} role="img" aria-label={label} tabIndex={0}
          onPointerMove={near} onPointerDown={near} onPointerLeave={(e) => { if (!isTouch(e)) setHi(null); }} onBlur={() => setHi(null)}
          onKeyDown={(e) => { const i = stepKey(e, hi, len); if (i !== null) { e.preventDefault(); setHi(i); } }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className={t ? "ad-ch-grid" : "ad-ch-axis"} x1={PL} x2={PL + plotW} y1={y(t)} y2={y(t)} />
              <text className="ad-ch-tick" x={PL + plotW + 8} y={y(t)} dominantBaseline="middle">{n(t)}</text>
            </g>
          ))}
          <path className="ad-ch-area" d={area} />
          {also ? <path className="ad-ch-line" data-also="" d={line2} /> : null}
          <path className="ad-ch-line" d={line} />
          {marks.map((i) => (
            <text key={i} className="ad-ch-tick" x={x(i)} y={H - 8} textAnchor={anchor(i)} direction="rtl">{points[i]?.label}</text>
          ))}
          {len > 0 && hi === null && <circle className="ad-ch-dot" cx={x(len - 1)} cy={y(points[len - 1].value)} r={4} />}
          {len > 0 && hi === null && v2(len - 1) !== undefined && <circle className="ad-ch-dot" data-also="" cx={x(len - 1)} cy={y(v2(len - 1)!)} r={4} />}
          {hi !== null && points[hi] && (
            <>
              <line className="ad-ch-cross" x1={x(hi)} x2={x(hi)} y1={PT} y2={base} />
              {v2(hi) !== undefined ? <circle className="ad-ch-dot" data-also="" cx={x(hi)} cy={y(v2(hi)!)} r={4} /> : null}
              <circle className="ad-ch-dot" cx={x(hi)} cy={y(points[hi].value)} r={4} />
            </>
          )}
        </svg>
      )}
      {/* مفتاحُ الخطّين **تحت الرسم** (محمد ٢٠٢٦-١١-١٤: «لتمييز النوع المفروض تحت مو فوق») وبعيّنةٍ من كلّ خطٍّ لا بمربّع:
          المصمتُ والمتقطّع يُفرَّقان بالشكل قبل اللون — كانا خطّين مصمتين بدرجتين من كحليٍّ واحد فلم يُميَّزا */}
      {also ? (
        <ul className="ad-ch-keys" data-row="" dir="rtl" role="list" aria-hidden>
          <li><span className="ad-ch-sample" /><span className="ad-ch-key-l">{name}</span></li>
          <li><span className="ad-ch-sample" data-also="" /><span className="ad-ch-key-l">{also.name}</span></li>
        </ul>
      ) : null}
      <ChartTip tip={tip} frame={frame} />
      {also ? (
        <SrTable caption={label} head={["الفترة", name ?? "الأوّل", also.name]} rows={points.map((p, i) => [p.label, unit(p.value), also.unit(v2(i) ?? 0)])} />
      ) : (
        <SrTable caption={label} head={["الفترة", "العدد"]} rows={points.map((p) => [p.label, unit(p.value)])} />
      )}
    </div>
  );
}

/* ═══ الأعمدة ═══ */

export type AdBar = { tick: string; label: string; value: number };

export function AdColumns({ bars, unit, label, peak, height = 168, every = 3 }: {
  bars: AdBar[];
  unit: (v: number) => string;
  label: string;
  /** العمودُ المؤكَّد بلون الهويّة (الذروة)؛ والباقي رماديّ */
  peak?: number | null;
  height?: number;
  /** تسميةٌ تحت كلّ كذا عمودٍ لا تحت كلّها */
  every?: number;
}) {
  const [frame, W] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const H = height, PT = 8, PB = 26, PL = 0, PR = 48;
  const plotW = Math.max(0, W - PL - PR), plotH = H - PT - PB, base = PT + plotH;
  const len = bars.length;
  const max = Math.max(0, ...bars.map((b) => b.value));
  const ticks = ticksFor(max, 2);
  const top = ticks[ticks.length - 1];
  const slot = len ? plotW / len : 0;
  const bw = Math.max(2, Math.min(24, slot - 2));
  // تسميةٌ تحت كلّ كذا عمود، وتتباعد الضعفَ إن ضاق بها الجوّال فلا تتلاصق («12ص3ص»)
  const ev = slot * every < 32 ? every * 2 : every;
  // العمودُ الأوّل يمينًا كالزمن في جاره
  const cx = (i: number) => PL + plotW - slot * (i + 0.5);
  const tip: Tip = hi === null || !bars[hi] ? null : { x: cx(hi), y: base - (bars[hi].value / top) * plotH - 10, value: unit(bars[hi].value), label: bars[hi].label };

  return (
    <div ref={frame} className="ad-ch" dir="ltr">
      {W > 0 && (
        <svg
          width={W} height={H} role="img" aria-label={label} tabIndex={0}
          onPointerLeave={(e) => { if (!isTouch(e)) setHi(null); }} onBlur={() => setHi(null)}
          onKeyDown={(e) => { const i = stepKey(e, hi, len); if (i !== null) { e.preventDefault(); setHi(i); } }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className={t ? "ad-ch-grid" : "ad-ch-axis"} x1={PL} x2={PL + plotW} y1={base - (t / top) * plotH} y2={base - (t / top) * plotH} />
              <text className="ad-ch-tick" x={PL + plotW + 8} y={base - (t / top) * plotH} dominantBaseline="middle">{n(t)}</text>
            </g>
          ))}
          {bars.map((b, i) => {
            const h = (b.value / top) * plotH;
            return (
              <g key={i} onPointerEnter={() => setHi(i)} onPointerDown={() => setHi(i)}>
                {/* الهدفُ أكبرُ من العلامة: الخانةُ كلُّها من رأسها إلى قاعدتها */}
                <rect className="ad-ch-hit" x={cx(i) - slot / 2} y={PT} width={slot} height={plotH} />
                {h > 0 && (
                  <path
                    className="ad-ch-col"
                    data-peak={i === peak ? "" : undefined}
                    data-on={i === hi ? "" : undefined}
                    d={capPath(cx(i) - bw / 2, base - h, bw, h)}
                  />
                )}
                {i % ev === 0 && <text className="ad-ch-tick" x={cx(i)} y={H - 8} textAnchor="middle" direction="rtl">{b.tick}</text>}
              </g>
            );
          })}
        </svg>
      )}
      <ChartTip tip={tip} frame={frame} />
      <SrTable caption={label} head={["الخانة", "العدد"]} rows={bars.map((b) => [b.label, unit(b.value)])} />
    </div>
  );
}

/* ═══ الشبكة: صفوفٌ في أعمدة بدرجات لونٍ واحد ═══ */

/** خمسُ درجاتٍ فوق الصفر — `data-l` في `ad.css` */
const LEVELS = 5;

export function AdHeat({ rows, cols, values, unit, label, every = 3, low = "أهدأ", high = "أزحم", colName = (c) => c }: {
  rows: string[];
  cols: string[];
  /** اسمُ العمود في التلميح وجدول القارئ («الساعة 7») حين تكون علامتُه رقمًا مجرّدًا */
  colName?: (c: string) => string;
  values: number[][];
  unit: (v: number) => string;
  label: string;
  every?: number;
  low?: string;
  high?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);
  const max = Math.max(0, ...values.flat());
  const level = (v: number) => (v <= 0 || !max ? 0 : Math.max(1, Math.ceil((v / max) * LEVELS)));
  const show = (el: HTMLElement, r: number, c: number) => {
    const box = frame.current?.getBoundingClientRect();
    const me = el.getBoundingClientRect();
    if (!box) return;
    setTip({ x: me.left - box.left + me.width / 2, y: me.top - box.top - 6, value: unit(values[r]?.[c] ?? 0), label: `${rows[r]}، ${colName(cols[c])}` });
  };
  return (
    // الإطارُ لا يُمرَّر والشبكةُ في داخله تُمرَّر على الجوّال: فالتلميحُ فوق الصفّ الأوّل لا يُقصّ، وموضعُه من الإطار لا من التمرير.
    // **والشبكةُ تملأ قسمها** (محمد ٢٠٢٦-١١-١٤: فراغٌ تحتها بجانب حلقةٍ أطولَ منها «غير مقبول»): تطول الخلايا بطول القسم، وعلاماتُ
    // الساعات صفٌّ خارجَ الشبكة فلا يطول معها
    <div ref={frame} className="ad-ch ad-ch-heatbox">
      <div className="ad-ch-heat-scroll">
      <div className="ad-ch-heat-in">
      <div className="ad-ch-heat" aria-hidden onPointerLeave={(e) => { if (!isTouch(e)) setTip(null); }}>
        {rows.map((r, ri) => (
          <div key={r} className="ad-ch-heat-row">
            <span className="ad-ch-heat-day">{r}</span>
            {cols.map((c, ci) => (
              <span
                key={c}
                className="ad-ch-cell"
                data-l={level(values[ri]?.[ci] ?? 0)}
                onPointerEnter={(e) => show(e.currentTarget, ri, ci)}
                onPointerDown={(e) => show(e.currentTarget, ri, ci)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="ad-ch-heat-row ad-ch-heat-ticks" aria-hidden>
        <span className="ad-ch-heat-day" />
        {cols.map((c, ci) => <span key={c} className="ad-ch-heat-tick">{ci % every === 0 ? c : ""}</span>)}
      </div>
      </div>
      </div>
      {/* المفتاحُ في وسط الشبكة بكلمتيه وحدهما (محمد ٢٠٢٦-١١-١٤): كان بطرفيه رقمين «أهدأ (0)» و«أزحم (26)» فلم يُفهما، والعددُ في التلميح */}
      <p className="ad-ch-legend" aria-hidden>
        <span>{low}</span>
        {Array.from({ length: LEVELS }, (_, i) => <span key={i} className="ad-ch-cell" data-l={i + 1} />)}
        <span>{high}</span>
      </p>
      <ChartTip tip={tip} frame={frame} />
      <SrTable
        caption={label}
        head={["اليوم والساعة", "العدد"]}
        rows={rows.flatMap((r, ri) => cols.flatMap((c, ci) => (values[ri]?.[ci] ? [[`${r}، ${colName(c)}`, unit(values[ri][ci])] as [string, string]] : [])))}
      />
    </div>
  );
}

/* ═══ الحلقة: حصصُ كلٍّ واحدٍ في أجزاءٍ قليلة ═══ */

/**
 * **الحلقةُ لأجزاءٍ قليلةٍ يغلب أحدُها** (الأجهزة: جوّالٌ وحاسوبٌ ولوحيّ) — طلبها محمد (٢٠٢٦-١١-٠٧) كي يختلف شكلُها عن الخطوط حولها.
 * وتصحّ هنا لأنّ الأجزاء لا تزيد على أربعة، والسؤالُ «أيّها الغالب؟» لا «بكم يزيد هذا على ذاك؟». فوق أربعةٍ يُضمّ الباقي إلى «غير ذلك».
 * الأجزاءُ بترتيب حجمها بدرجاتِ لون الهويّة (الأكبرُ أغمقُها)، وبينها فجوةٌ بلون الورقة، والأكبرُ نسبتُه واسمُه في وسطها.
 * والمفتاحُ بجانبها نسبٌ وحدها — العددُ بجانب النسبة يُقرأ رقمًا واحدًا («5% 3» ← «35»، محمد)، فالعددُ في التلميح والجدول.
 */
const RING_MAX = 4;
export function AdRing({ items, unit, label, empty }: {
  items: { label: string; value: number }[];
  unit: (v: number) => string;
  label: string;
  empty?: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [hi, setHi] = useState<number | null>(null);
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const parts = sorted.length > RING_MAX
    ? [...sorted.slice(0, RING_MAX - 1), { label: "غير ذلك", value: sorted.slice(RING_MAX - 1).reduce((s, i) => s + i.value, 0) }]
    : sorted;
  const total = parts.reduce((s, i) => s + i.value, 0);
  if (!total) return <>{empty}</>;
  const pct = (v: number) => Math.round((v / total) * 100);
  const S = 168, R = 70, W = 18, C = 2 * Math.PI * R;
  // الفجوةُ بين جزأين بطول قوسٍ ثابت، ولا فجوةَ لجزءٍ واحدٍ يملأ الحلقة
  const gap = parts.length > 1 ? 3 : 0;
  // بدايةُ كلّ جزءٍ مجموعُ ما قبله
  const arcs = parts.map((p, i) => {
    const len = (p.value / total) * C;
    const before = parts.slice(0, i).reduce((sum, q) => sum + (q.value / total) * C, 0);
    return { i, p, dash: `${Math.max(0, len - gap)} ${C}`, off: -before };
  });
  const lead = parts[hi ?? 0];
  return (
    <div ref={frame} className="ad-ch ad-ch-ring">
      <div className="ad-ch-ring-art">
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} role="img" aria-label={label} onPointerLeave={(e) => { if (!isTouch(e)) setHi(null); }}>
          {/* يبدأ القوسُ من الأعلى ويدور مع عقارب الساعة */}
          <g transform={`rotate(-90 ${S / 2} ${S / 2})`}>
            {arcs.map((a) => (
              <circle
                key={a.p.label}
                className="ad-ch-arc"
                data-step={dataStep(a.i, parts.length, true)}
                data-on={hi === a.i ? "" : undefined}
                cx={S / 2} cy={S / 2} r={R} strokeWidth={W}
                strokeDasharray={a.dash} strokeDashoffset={a.off}
                onPointerEnter={() => setHi(a.i)} onPointerDown={() => setHi(a.i)}
              />
            ))}
          </g>
        </svg>
        <p className="ad-ch-ring-mid" aria-hidden>
          <b><bdi dir="ltr">{pct(lead.value)}%</bdi></b>
          <span>{lead.label}</span>
        </p>
      </div>
      <div className="ad-ch-ring-side">
      <ul className="ad-ch-keys" role="list">
        {parts.map((p, i) => (
          <li key={p.label} data-on={hi === i ? "" : undefined} onPointerEnter={() => setHi(i)} onPointerLeave={() => setHi(null)}>
            <span className="ad-ch-key" data-step={dataStep(i, parts.length, true)} aria-hidden />
            <span className="ad-ch-key-l">{p.label}</span>
            <b className="ad-ch-key-v"><bdi dir="ltr">{pct(p.value)}%</bdi></b>
            {/* شريطُ النسبة تحت كلّ جزء: يملأ عرضَ القسم إن اتّسع فلا يبقى فراغٌ عن يمين الحلقة ويسارها (محمد ٢٠٢٦-١١-٠٧) */}
            <meter className="ad-meter ad-ch-key-m" min={0} max={total} value={p.value} aria-hidden />
          </li>
        ))}
      </ul>
      {/* العددُ لمن مرّ على جزء: في وسط الحلقة نسبتُه، وهنا عددُه */}
      <p className="ad-ch-ring-n" aria-live="polite">{hi !== null && parts[hi] ? `${parts[hi].label}: ${unit(parts[hi].value)}` : ""}</p>
      </div>
      <SrTable caption={label} head={["الجزء", "العدد"]} rows={parts.map((p) => [p.label, `${unit(p.value)}، ${pct(p.value)}%`])} />
    </div>
  );
}

/* ═══ الأشرطة: أجوبةُ سؤالٍ مرتّبةً بنسبها ═══ */

/**
 * **أجوبةُ سؤالٍ بخياراته** (نتائجُ الاستبيان، ٢٠٢٦-١١-٠٧؛ كانت `BarList`): لكلّ خيارٍ سطرُه — اسمُه ونسبتُه، وتحته شريطُه وعددُه.
 * والنسبةُ والعددُ في سطرين لا متجاورين (محمد: «5% 3» تُقرأ «35»). والنسبةُ من المجيبين على السؤال (`total`) لا من مجموع الخيارات:
 * سؤالُ الاختيار المتعدّد يزيد مجموعُ نسبه على مئة، وهو الصحيح. و`muted`: خيارٌ أُزيل من النموذج وبقيت إجاباتُه («خيارٌ سابق»).
 * والترتيبُ ترتيبُ النموذج لا الحجم: الخياراتُ قائمةٌ لها ترتيبُها (مقياسٌ من 1 إلى 5، نعم ولا)، وقلبُها يربك القارئ.
 */
export function AdBars({ items, total, unit, label, onPick, share = true }: {
  /** `icon` رمزُ السطر قبل اسمه (علمُ الدولة، رمزُ الصفحة من خريطة التنقّل — إحصائيّات الزوّار) */
  items: { label: string; value: number; note?: string; muted?: boolean; icon?: ReactNode }[];
  total: number;
  unit: (v: number) => string;
  label: string;
  /** السطرُ زرٌّ يُري مَن اختار الخيار (نتائجُ الاستبيان) */
  onPick?: (label: string) => void;
  /**
   * **حصّةٌ من كلٍّ أم مقدار** (`false`: أطولُ الصفحات مكثًا بالثواني): الثواني لا تُجمع حصصًا، فلا نسبةَ في السطر،
   * والشريطُ يُقاس على أطول السطور لا على المجموع
   */
  share?: boolean;
}) {
  // ما فوق الصفر لا يُقال «0%»: يُقال «<1%»، فلا يُقرأ سطرٌ له عددٌ كأنّه لا شيء
  const pct = (v: number) => { if (!total) return "0"; const r = Math.round((v / total) * 100); return v > 0 && r === 0 ? "<1" : String(r); };
  const top = Math.max(0, ...items.map((i) => i.value));
  const of = share ? total : top;
  // سؤالٌ أُجيب ولا خيارَ له في النموذج: يُقال كما كان («لا خيارات.») لا قائمةٌ فارغة
  if (!items.length) return <p className="ad-sv-none">لا خيارات.</p>;
  return (
    <ul className="ad-ch-bars" role="list" aria-label={label} data-pick={onPick ? "" : undefined}>
      {items.map((it, i) => {
        const body = (
          <>
            <span className="ad-ch-bar-l">{it.icon ? <span className="ad-ch-bar-ic" aria-hidden>{it.icon}</span> : null}{it.label}{it.note ? <small>{it.note}</small> : null}</span>
            <b className="ad-ch-bar-p">{share ? <bdi dir="ltr">{pct(it.value)}%</bdi> : null}</b>
            <meter className="ad-meter ad-ch-bar-m" min={0} max={of || 1} value={it.value} aria-hidden />
            <span className="ad-ch-bar-n">{unit(it.value)}</span>
          </>
        );
        return (
          <li key={`${it.label}-${i}`} className="ad-ch-bar" data-muted={it.muted ? "" : undefined} data-top={it.value === top && top > 0 ? "" : undefined}>
            {onPick ? (
              <button type="button" className="ad-ch-bar-hit" disabled={!it.value} onClick={() => onPick(it.label)}
                aria-label={`${it.label}: ${share ? `${pct(it.value)}%، ` : ""}${unit(it.value)}${it.value ? "، اعرض مَن اختاره" : ""}`}>{body}</button>
            ) : body}
          </li>
        );
      })}
    </ul>
  );
}
