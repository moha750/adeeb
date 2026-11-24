import { arCount, type ArForms } from "@/lib/arabicCount";
import type { VisionMarkShape } from "./mark";

const AR_ITEM: ArForms = ["عنصرٌ واحد", "عنصران", "عناصر", "عنصرًا"];

/**
 * **قارئُ علامة الرؤية المرسومة** (محمد ٢٠٢٦-١١-٢٢: «لو نحن صمّمناها؟»): ملفُّ SVG من Illustrator أو غيره، **طبقةٌ لكلّ مسار** وفي كلّ
 * طبقةٍ **قطعةٌ لكلّ هدف** شكلًا مغلقًا مستقلًّا. يُقرأ في المتصفّح (لا يُدرج الملفُّ في الصفحة أبدًا ولا يُنفَّذ منه شيء): تُؤخذ هندستُه
 * وحدها — المسارُ والمستطيلُ والدائرةُ والقطعُ الناقص والمضلّع — بتحويلاتها كلّها، فتصير مساراتٍ مطلقةً (M وL وC وZ) بلا ألوانٍ ولا أصناف.
 * والألوانُ بعدها من الموقع.
 *
 * ترتيبُ الطبقات: إن حمل اسمُ كلّ طبقةٍ رقمًا («1»، «مسار 2») فبه، وإلّا فبترتيبها في الملف؛ والمحرّرُ يعكسه ويعكس ترتيبَ القطع إن لزم.
 */
export type MarkParse =
  | { ok: true; mark: Extract<VisionMarkShape, { kind: "svg" }>; notes: string[] }
  | { ok: false; error: string };

const MAX_LAYERS = 8;
const MAX_PIECES = 99;
const MAX_TOTAL = 400;
const MAX_BYTES = 380_000;
const MAX_FILE = 3_000_000;

type Mx = [number, number, number, number, number, number];
const ID: Mx = [1, 0, 0, 1, 0, 0];
const mul = (m: Mx, n: Mx): Mx => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const ap = (m: Mx, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function parseTransform(s: string | null): Mx {
  if (!s) return ID;
  let m = ID;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  for (let r = re.exec(s); r; r = re.exec(s)) {
    const a = r[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (a.some((n) => !Number.isFinite(n))) continue;
    let t: Mx = ID;
    switch (r[1]) {
      case "matrix": if (a.length === 6) t = a as Mx; break;
      case "translate": t = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0]; break;
      case "scale": t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0]; break;
      case "rotate": {
        const q = ((a[0] ?? 0) * Math.PI) / 180, c = Math.cos(q), sn = Math.sin(q);
        const rot: Mx = [c, sn, -sn, c, 0, 0];
        t = a.length >= 3 ? mul(mul([1, 0, 0, 1, a[1], a[2]], rot), [1, 0, 0, 1, -a[1], -a[2]]) : rot;
        break;
      }
      case "skewX": t = [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0]; break;
      case "skewY": t = [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0]; break;
    }
    m = mul(m, t);
  }
  return m;
}

/* ── المسار: قراءةٌ حرفًا حرفًا (أعلامُ القوس قد تلتصق: «a1 1 0 011 1») ثمّ تطبيعٌ إلى M وL وC وZ مطلقة ── */
type Seg = ["M" | "L", number, number] | ["C", number, number, number, number, number, number] | ["Z"];

class Scan {
  i = 0;
  constructor(private s: string) {}
  ws() { while (this.i < this.s.length && /[\s,]/.test(this.s[this.i])) this.i++; }
  done() { this.ws(); return this.i >= this.s.length; }
  cmd(): string | null { this.ws(); const c = this.s[this.i]; if (c && /[MmLlHhVvCcSsQqTtAaZz]/.test(c)) { this.i++; return c; } return null; }
  peekNum() { this.ws(); return this.i < this.s.length && /[-+.\d]/.test(this.s[this.i]); }
  num(): number {
    this.ws();
    const m = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(this.s.slice(this.i));
    if (!m) throw new Error("num");
    this.i += m[0].length;
    return Number(m[0]);
  }
  flag(): number { this.ws(); const c = this.s[this.i]; if (c !== "0" && c !== "1") throw new Error("flag"); this.i++; return c === "1" ? 1 : 0; }
}

function arcToCubic(x1: number, y1: number, rx: number, ry: number, phiDeg: number, fa: number, fs: number, x2: number, y2: number): Seg[] {
  if (x1 === x2 && y1 === y2) return [];
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (!rx || !ry) return [["L", x2, y2]];
  const phi = (phiDeg * Math.PI) / 180, cs = Math.cos(phi), sn = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = cs * dx + sn * dy, yp = -sn * dx + cs * dy;
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  const coef = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * yp) / ry, cyp = (-coef * ry * xp) / rx;
  const cx = cs * cxp - sn * cyp + (x1 + x2) / 2, cy = sn * cxp + cs * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const ux = (xp - cxp) / rx, uy = (yp - cyp) / ry, vx = (-xp - cxp) / rx, vy = (-yp - cyp) / ry;
  const t1 = ang(1, 0, ux, uy);
  let dt = ang(ux, uy, vx, vy);
  if (!fs && dt > 0) dt -= 2 * Math.PI;
  if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
  const d = dt / n, k = (4 / 3) * Math.tan(d / 4);
  const map = (x: number, y: number): [number, number] => [cx + rx * cs * x - ry * sn * y, cy + rx * sn * x + ry * cs * y];
  const out: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const a = t1 + i * d, b = a + d;
    const c1 = Math.cos(a), s1 = Math.sin(a), c2 = Math.cos(b), s2 = Math.sin(b);
    const p1 = map(c1 - k * s1, s1 + k * c1), p2 = map(c2 + k * s2, s2 - k * c2), p = i === n - 1 ? [x2, y2] : map(c2, s2);
    out.push(["C", p1[0], p1[1], p2[0], p2[1], p[0], p[1]]);
  }
  return out;
}

function pathSegs(d: string): Seg[] {
  const sc = new Scan(d);
  const out: Seg[] = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  let lastC: [number, number] | null = null, lastQ: [number, number] | null = null;
  let cmd: string | null = null;
  while (!sc.done()) {
    const c = sc.cmd();
    if (c) cmd = c;
    // أرقامٌ بلا أمرٍ بعد «Z» لا معنى لها: تُرفض لا تُكرَّر بلا نهاية
    else if (!cmd || !sc.peekNum() || cmd === "Z" || cmd === "z") throw new Error("cmd");
    else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    let nextC: [number, number] | null = null, nextQ: [number, number] | null = null;
    switch (C) {
      case "M": x = ox + sc.num(); y = oy + sc.num(); sx = x; sy = y; out.push(["M", x, y]); break;
      case "L": x = ox + sc.num(); y = oy + sc.num(); out.push(["L", x, y]); break;
      case "H": x = ox + sc.num(); out.push(["L", x, y]); break;
      case "V": y = oy + sc.num(); out.push(["L", x, y]); break;
      case "C": {
        const a = [ox + sc.num(), oy + sc.num(), ox + sc.num(), oy + sc.num(), ox + sc.num(), oy + sc.num()];
        out.push(["C", a[0], a[1], a[2], a[3], a[4], a[5]]); nextC = [a[2], a[3]]; x = a[4]; y = a[5]; break;
      }
      case "S": {
        const r1: [number, number] = lastC ? [2 * x - lastC[0], 2 * y - lastC[1]] : [x, y];
        const a = [ox + sc.num(), oy + sc.num(), ox + sc.num(), oy + sc.num()];
        out.push(["C", r1[0], r1[1], a[0], a[1], a[2], a[3]]); nextC = [a[0], a[1]]; x = a[2]; y = a[3]; break;
      }
      case "Q": case "T": {
        const q: [number, number] = C === "Q" ? [ox + sc.num(), oy + sc.num()] : lastQ ? [2 * x - lastQ[0], 2 * y - lastQ[1]] : [x, y];
        const ex = ox + sc.num(), ey = oy + sc.num();
        out.push(["C", x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y), ex + (2 / 3) * (q[0] - ex), ey + (2 / 3) * (q[1] - ey), ex, ey]);
        nextQ = q; x = ex; y = ey; break;
      }
      case "A": {
        const rx = sc.num(), ry = sc.num(), rot = sc.num(), fa = sc.flag(), fs = sc.flag();
        const ex = ox + sc.num(), ey = oy + sc.num();
        out.push(...arcToCubic(x, y, rx, ry, rot, fa, fs, ex, ey)); x = ex; y = ey; break;
      }
      case "Z": out.push(["Z"]); x = sx; y = sy; break;
    }
    lastC = nextC; lastQ = nextQ;
  }
  return out;
}

const f2 = (n: number) => {
  if (!Number.isFinite(n)) throw new Error("num");
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
};
function emit(segs: Seg[], m: Mx): string {
  const p = (x: number, y: number) => { const [a, b] = ap(m, x, y); return `${f2(a)} ${f2(b)}`; };
  return segs.map((s) => (s[0] === "Z" ? "Z" : s[0] === "C" ? `C${p(s[1], s[2])} ${p(s[3], s[4])} ${p(s[5], s[6])}` : `${s[0]}${p(s[1], s[2])}`)).join("");
}

const num = (el: Element, k: string) => { const v = parseFloat(el.getAttribute(k) ?? ""); return Number.isFinite(v) ? v : 0; };

/** الشكلُ مسارًا، أو `null` إن لم يكن شكلًا مغلقًا */
function shapeD(el: Element): string | null {
  switch (el.localName) {
    case "path": return el.getAttribute("d");
    case "rect": {
      const x = num(el, "x"), y = num(el, "y"), w = num(el, "width"), h = num(el, "height");
      if (w <= 0 || h <= 0) return null;
      let rx = num(el, "rx"), ry = num(el, "ry");
      if (!el.hasAttribute("ry")) ry = rx;
      if (!el.hasAttribute("rx")) rx = ry;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
    }
    case "circle": case "ellipse": {
      const cx = num(el, "cx"), cy = num(el, "cy");
      const rx = el.localName === "circle" ? num(el, "r") : num(el, "rx"), ry = el.localName === "circle" ? rx : num(el, "ry");
      if (rx <= 0 || ry <= 0) return null;
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
    }
    case "polygon": case "polyline": {
      const p = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number);
      if (p.length < 6 || p.some((n) => !Number.isFinite(n))) return null;
      let d = `M${p[0]} ${p[1]}`;
      for (let i = 2; i + 1 < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
      return d + "Z";
    }
  }
  return null;
}

const SHAPES = new Set(["path", "rect", "circle", "ellipse", "polygon", "polyline"]);
const SKIP = new Set(["defs", "clipPath", "mask", "symbol", "pattern", "marker", "linearGradient", "radialGradient", "filter", "style", "title", "desc", "metadata", "script", "foreignObject"]);
const hidden = (el: Element) => el.getAttribute("display") === "none" || /display\s*:\s*none/.test(el.getAttribute("style") ?? "") || el.getAttribute("visibility") === "hidden";
/** أرقامُ اسم الطبقة لاتينيّةً (قد يسمّيها المصمّمُ «١» أو «1») */
const latinDigits = (s: string) => s.replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x660));

export function parseMarkSvg(text: string, file: string): MarkParse {
  if (text.length > MAX_FILE) return { ok: false, error: "الملف أكبر من 3 ميغابايت: صدّره بلا صور ولا خطوط مضمّنة." };
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.localName !== "svg" || doc.getElementsByTagName("parsererror").length) return { ok: false, error: "الملف ليس SVG صالحًا." };

  let vb = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n)) || vb[2] <= 0 || vb[3] <= 0) {
    const w = parseFloat(root.getAttribute("width") ?? ""), h = parseFloat(root.getAttribute("height") ?? "");
    if (!(w > 0 && h > 0)) return { ok: false, error: "لا أبعاد للوحة الرسم في الملف (viewBox)." };
    vb = [0, 0, w, h];
  }

  const notes: string[] = [];
  let skipped = 0;
  let evenodd = false;
  const kids = (el: Element) => Array.from(el.children).filter((c) => !SKIP.has(c.localName) && !hidden(c));
  // اللفافةُ الواحدة ليست طبقة: يُنزل فيها ما دامت وحدها
  let host: Element = root;
  let hostM = ID;
  for (;;) {
    const k = kids(host);
    if (k.length === 1 && k[0].localName === "g" && kids(k[0]).some((x) => x.localName === "g")) { hostM = mul(hostM, parseTransform(k[0].getAttribute("transform"))); host = k[0]; }
    else break;
  }
  const top = kids(host);
  if (top.some((c) => SHAPES.has(c.localName))) return { ok: false, error: "في الملف أشكالٌ خارج الطبقات: ضع كلَّ قطعةٍ في طبقة مسارها." };
  let layers = top.filter((c) => c.localName === "g");
  if (!layers.length) return { ok: false, error: "لا طبقات في الملف: طبقةٌ لكلّ مسار، وفيها قطعُ أهدافه." };
  if (layers.length > MAX_LAYERS) return { ok: false, error: `في الملف ${layers.length} طبقة، والمسارات ثمانية على الأكثر.` };

  // الترتيبُ برقم الاسم إن حمله كلُّها («1»، «مسار 2»)، وإلّا فبترتيب الملف
  const nOf = (g: Element) => { const m = /\d+/.exec(latinDigits(g.getAttribute("data-name") ?? g.getAttribute("inkscape:label") ?? g.getAttribute("id") ?? "")); return m ? Number(m[0]) : null; };
  const ns = layers.map(nOf);
  if (ns.every((n) => n !== null) && new Set(ns).size === ns.length) {
    layers = [...layers].sort((a, b) => (nOf(a) as number) - (nOf(b) as number));
    notes.push("رُتّبت الطبقات بالأرقام في أسمائها.");
  }

  const out: string[][] = [];
  for (const layer of layers) {
    const pieces: string[] = [];
    const walk = (el: Element, m: Mx) => {
      const mm = mul(m, parseTransform(el.getAttribute("transform")));
      for (const c of kids(el)) {
        if (c.localName === "g" || c.localName === "a") walk(c, mm);
        else if (SHAPES.has(c.localName)) {
          if (/evenodd/.test(`${c.getAttribute("fill-rule") ?? ""} ${c.getAttribute("style") ?? ""}`)) evenodd = true;
          const d = shapeD(c);
          if (!d) { skipped++; continue; }
          try {
            const segs = pathSegs(d);
            if (segs.length < 3) { skipped++; continue; }
            pieces.push(emit(segs, mul(mm, parseTransform(c.getAttribute("transform")))));
          } catch { skipped++; }
        } else skipped++;
      }
    };
    walk(layer, hostM);
    if (!pieces.length) return { ok: false, error: `الطبقة ${out.length + 1} بلا قطع.` };
    if (pieces.length > MAX_PIECES) return { ok: false, error: `الطبقة ${out.length + 1} فيها ${pieces.length} قطعة، والأهداف 99 على الأكثر.` };
    out.push(pieces);
  }
  if (out.flat().length > MAX_TOTAL) return { ok: false, error: `في الملف ${out.flat().length} قطعة، وأكثرُ العلامة ${MAX_TOTAL}.` };
  if (evenodd) notes.push("في الملف قطعٌ مفرّغة بقاعدة evenodd، وتُرسم هنا مصمتة: افصل الفراغ شكلًا مستقلًّا أو اجعل اتّجاهه معاكسًا (nonzero).");
  if (skipped) notes.push(`لم يُقرأ منه ${arCount(skipped, AR_ITEM)} ليس شكلًا مغلقًا (نصّ أو خطّ أو صورة).`);
  let viewBox: string;
  try { viewBox = vb.map(f2).join(" "); } catch { return { ok: false, error: "أبعاد لوحة الرسم في الملف غير صالحة." }; }
  const mark = { kind: "svg" as const, viewBox, layers: out, file: file.slice(0, 120) };
  if (JSON.stringify(mark).length > MAX_BYTES) return { ok: false, error: "الأشكالُ في الملف أثقلُ من حدّ العلامة: بسّط المسارات (Object › Path › Simplify) وأعد التصدير." };
  return { ok: true, mark, notes };
}
