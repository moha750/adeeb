/**
 * **هندسةُ هلال الفسيفساء** — علامةُ «رؤية الهلال» (اختارها محمد ٢٠٢٦-١١-٠٢ من ثلاثة اتّجاهات: «الفسيفساء مبهرٌ جدًّا»).
 *
 * الهلالُ دائرةٌ (نصفُ قطرها 100) تُطرح منها دائرةٌ مثلُها مزاحةٌ بقدر `d`، ثمّ يُقسم ما بقي **طبقاتٍ بعدد المسارات**
 * (الأوّلُ الطبقةُ الخارجيّة) وكلُّ طبقةٍ **قطعًا بعدد أهداف مسارها**، تُعدّ من القرن الأيمن نزولًا (جهةُ القراءة).
 * فالعلامةُ تُبنى من البيانات: إن زاد هدفٌ أو نقص أُعيد بناؤها وحدها، ولا رسمٌ ثابتٌ يُعدَّل باليد.
 *
 * وميلُها −65°: القرنان إلى أعلى كالزورق، والجانبُ المضيء إلى أسفل — كما يُرى هلالُ رمضان في سمائنا بعد المغرب.
 * والفواصلُ بين الطبقات تضيق نحو القرنين فيبقى طرفاهما حادَّين.
 *
 * دالّةٌ نقيّة بلا React: تقرؤها الصفحةُ العامّة (`/vision`) وغرفةُ المتابعة في البوّابة، والرسمُ في `VisionMark`.
 */

export type HilalTile = { layer: number; index: number; d: string };
export type Hilal = { viewBox: string; tiles: HilalTile[] };

const R = 100;
const D = 44;      // إزاحةُ الدائرة المطروحة: سُمكُ الهلال في وسطه
const ROT = -65;   // الميل
const GAP = 2.2;   // الفاصلُ بين القطع والطبقات
const TAPER = 40;  // الفاصلُ يضيق حيث يرقّ الهلال
const STEPS = 16;  // نقاطُ كلّ حافّة

const cache = new Map<string, Hilal>();

export function hilal(counts: number[]): Hilal {
  const key = counts.join(",");
  const hit = cache.get(key);
  if (hit) return hit;

  const rot = (ROT * Math.PI) / 180;
  const thH = Math.acos(Math.max(-1, Math.min(1, -D / (2 * R)))); // زاويةُ القرن (الدائرتان متساويتان)
  const t2 = (th: number) => {
    const uc = -D * Math.cos(th);
    return uc + Math.sqrt(Math.max(0, uc * uc - D * D + R * R));
  };
  const rho = (th: number, f: number) => {
    const a = t2(th);
    return a + (R - a) * f;
  };
  const sc = (th: number) => Math.min(1, (R - t2(th)) / TAPER);
  const P = (th: number, r: number): [number, number] => [r * Math.cos(th + rot), -r * Math.sin(th + rot)];

  const nl = counts.filter((n) => n > 0).length;
  const raw: { layer: number; index: number; pts: [number, number][] }[] = [];

  // `k` ترتيبُ الطبقة بين المسارات ذوات الأهداف (مسارٌ بلا أهدافٍ لا طبقةَ له)، و`layer` موضعُ مساره في الرؤية
  let k = -1;
  counts.forEach((N, layer) => {
    if (N <= 0) return;
    k++;
    const fu = 1 - k / nl;
    const fl = 1 - (k + 1) / nl;
    const outerR = (th: number) => rho(th, fu) - (k === 0 ? 0 : (GAP / 2) * sc(th));
    const innerR = (th: number) => rho(th, fl) + (k === nl - 1 ? 0 : (GAP / 2) * sc(th));
    const b = Array.from({ length: N + 1 }, (_, i) => thH - (2 * thH * i) / N);
    for (let i = 0; i < N; i++) {
      const gs = i === 0 ? 0 : GAP / 2;
      const ge = i === N - 1 ? 0 : GAP / 2;
      const A = b[i], Z = b[i + 1];
      const a0 = A - gs / Math.max(1, outerR(A)), z0 = Z + ge / Math.max(1, outerR(Z));
      const a1 = A - gs / Math.max(1, innerR(A)), z1 = Z + ge / Math.max(1, innerR(Z));
      const pts: [number, number][] = [];
      for (let j = 0; j <= STEPS; j++) { const t = a0 + ((z0 - a0) * j) / STEPS; pts.push(P(t, outerR(t))); }
      for (let j = 0; j <= STEPS; j++) { const t = z1 + ((a1 - z1) * j) / STEPS; pts.push(P(t, Math.min(innerR(t), outerR(t)))); }
      raw.push({ layer, index: i, pts });
    }
  });

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of raw) for (const [x, y] of t.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = x1 - x0, h = y1 - y0, side = Math.max(w, h) * 1.04;
  const f = (n: number) => n.toFixed(2);
  const out: Hilal = {
    viewBox: raw.length ? `${f(x0 - (side - w) / 2)} ${f(y0 - (side - h) / 2)} ${f(side)} ${f(side)}` : "0 0 1 1",
    tiles: raw.map((t) => ({ layer: t.layer, index: t.index, d: "M" + t.pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z" })),
  };
  cache.set(key, out);
  return out;
}
