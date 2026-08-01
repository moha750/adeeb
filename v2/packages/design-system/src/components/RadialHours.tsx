export type RadialBar = {
  value: number;
  /** نصّ التلميح (الافتراضي القيمة). */
  title?: string;
};

export interface RadialHoursProps {
  /** الأعمدة الشعاعيّة — عادةً ٢٤ (ساعات اليوم). */
  bars: RadialBar[];
  max?: number;
  /** لون الأشعّة (من --chart-*). الافتراضي --chart-1. */
  tone?: string;
  /** تسميةٌ عند كلّ N (الافتراضي ٦: 0/6/12/18). */
  tickEvery?: number;
}

const nf = (n: number) => n.toLocaleString("en-US");

/**
 * ساعة قطبيّة — أشعّةٌ حول قرصٍ كوجه ساعة، طولُ الشعاع = القيمة، وموضعه = الساعة (الصفر أعلى).
 * تُبرز الطبيعة **الدوريّة** للزمن (لا بدايةَ ولا نهاية) خلافًا لصفٍّ خطّيّ.
 */
export function RadialHours({ bars, max, tone = "var(--chart-1)", tickEvery = 6 }: RadialHoursProps) {
  const n = bars.length || 1;
  const top = max ?? Math.max(1, ...bars.map((b) => b.value));
  const C = 100, innerR = 32, maxLen = 54;
  const pt = (r: number, ang: number): [number, number] => [C + r * Math.cos(ang), C + r * Math.sin(ang)];
  return (
    <div className="chart-radial">
      <svg viewBox="0 0 200 200" role="img" aria-label="التوزيع على مدار اليوم (ساعة قطبيّة)">
        <circle cx={C} cy={C} r={innerR} className="chart-radial-hub" />
        {bars.map((b, i) => {
          const ang = (i / n) * 2 * Math.PI - Math.PI / 2; // الصفر أعلى، يسير مع عقارب الساعة
          const [x1, y1] = pt(innerR, ang);
          const [x2, y2] = pt(innerR + (b.value / top) * maxLen, ang);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tone} strokeWidth={4} strokeLinecap="round">
              <title>{b.title ?? nf(b.value)}</title>
            </line>
          );
        })}
        {bars.map((b, i) => {
          if (i % tickEvery !== 0) return null;
          const ang = (i / n) * 2 * Math.PI - Math.PI / 2;
          const [tx, ty] = pt(innerR + maxLen + 10, ang);
          return (
            <text key={`t${i}`} x={tx} y={ty} className="chart-radial-tick" textAnchor="middle" dominantBaseline="middle">{i}</text>
          );
        })}
      </svg>
    </div>
  );
}
