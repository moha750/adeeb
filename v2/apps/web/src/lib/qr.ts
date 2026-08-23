/**
 * رسّام الرمز (QR) — **المصدر الواحد** لكلّ رمزٍ يخرج من أديب: خَتْمُ شهادة الخبرة على
 * ورقتها، ومحرّرُ الرموز في اللوحة، وما يأتي بعدهما.
 *
 * **راسمٌ واحدٌ لا راسمان.** كان هنا مساران — واحدٌ يرسم على canvas وآخر يبني SVG — ولمّا
 * دخلت التدرّجاتُ والأشكالُ والشعار صار افتراقُهما مسألةَ وقت. فصار **SVG هو الأصل**،
 * وPNG يُشتقّ منه برسمه في canvas، وخَتْمُ الورقة كذلك. ما تراه في المعاينة هو ما يُنزَّل
 * وهو ما يُطبَع على الشهادة — لأنّه المسار نفسه لا مسارٌ يشبهه.
 *
 * **والهامش الصامت أربع وحدات** كما تشترط المواصفة، وبدونه لا يُقرأ الرمز مهما وضح.
 *
 * **والعربيّة تُرمَّز بايتاتٍ لا محارف**: مرمِّزُ الحزمة الافتراضيّ يقصّ كلّ محرفٍ إلى بايته
 * الأدنى (`charCodeAt & 0xff`) — فالعربيّة تخرج خُرافةً تُمسَح ولا تُفهَم (ونسخة ESM لا تحمل
 * مرمِّز UTF-8 أصلًا). فنحوّل النصّ بأنفسنا إلى بايتات UTF-8 ونناوله إيّاها بايتًا لكلّ
 * محرف، فيمرّ قصُّه بلا أثر. واللاتينيّ لا يتغيّر: بايتُه هو محرفُه.
 *
 * **حدود الزينة — تُعرَف ولا تُتجاوَز.** الرمز آلةٌ تُقرأ قبل أن يكون شكلًا:
 * · **العيون الثلاث** بنيةٌ يبحث عنها القارئ أوّلًا، فتُرسَم كاملةً مهما تغيّر شكلُها.
 * · **الشعارُ يُفرِّغ ما تحته ولا يُغطّيه**، ويرفع تصحيح الخطأ إلى `H` — فالثلاثون بالمئة
 *   تستعيد ما فُرِّغ. والتغطيةُ بلا تفريغٍ تُبقي حبرًا يُربك القارئ تحت صورةٍ تحجبه.
 * · **التباين يُقاس لا يُظَنّ** (`contrast`): تدرّجٌ فاتحٌ على خلفيّةٍ فاتحة يخرج جميلًا
 *   في الشاشة ولا يُمسح في الورق.
 */

import qrcode from "qrcode-generator";
import { FONT, ensureFonts, svgToDataUrl } from "@/lib/paper";

/* ── المصفوفة ───────────────────────────────────────────────────────────── */

/** مستوى تصحيح الخطأ — `M` وسطٌ يكفي المطبوع، و`H` لِما يُفرَّغ جزؤه (شعارٌ في القلب). */
export type Ecc = "L" | "M" | "Q" | "H";

/** الهامش الصامت بوحدات الرمز — مواصفةٌ لا ذوق. */
export const QUIET = 4;

/** ضلع العين (نمط التموضع) بالوحدات — ثابتُ المواصفة في كلّ الإصدارات. */
const EYE = 7;

/** مصفوفة الوحدات كما حسبتها الحزمة — بلا هامشٍ ولا لون. */
export type QrMatrix = { n: number; isDark: (row: number, col: number) => boolean };

/** بايتات UTF-8 محمولةً في محارف — انظر رأس الملفّ. */
function payload(text: string): string {
  let out = "";
  for (const b of new TextEncoder().encode(text)) out += String.fromCharCode(b);
  return out;
}

/**
 * مصفوفة الرمز. **ترمي** إن عجز أكبر إصدارٍ عن حمل النصّ (٤٠) — والرسالة تُعرَض للمستخدم
 * كما هي، فالطول عيبُ مُدخَلٍ لا عطبُ نظام.
 */
export function qrMatrix(text: string, ecc: Ecc = "M"): QrMatrix {
  const q = qrcode(0, ecc); // 0 = الإصدار يُختار تلقائيًّا بحسب الطول
  try {
    q.addData(payload(text), "Byte");
    q.make();
  } catch {
    throw new Error("النصّ أطول ممّا يسع رمزًا واحدًا. اختصره أو استعمل رابطًا قصيرًا.");
  }
  return { n: q.getModuleCount(), isDark: (r, c) => q.isDark(r, c) };
}

/* ── المواصفة ───────────────────────────────────────────────────────────── */

/**
 * شكل الوحدة الواحدة — **اثنان لا غير** (قرار المالك ٢٠٢٦-٠٨-٠٣):
 * · `fluid` شكلُ أديب المعتمَد — الوحدات المتجاورة تلتحم، وتُدوَّر الزاوية الخارجيّة وحدها.
 * · `square` لختم الشهادة وحده — وثيقةٌ رسميّة لا ملصق.
 *
 * (كان معهما `rounded` و`dots`، وأُزيلا حين ثُبِّت الشكل: خيارٌ لا يصل إليه أحدٌ كودٌ ميّت.)
 */
export type DotShape = "square" | "fluid";

/** شكل العين أو بؤبؤها — `rounded` المعتمَد، و`square` لختم الشهادة. (أُزيل `circle` و`leaf`.) */
export type EyeShape = "square" | "rounded";

/** حبرُ الوحدات — صلبٌ أو تدرّج. */
export type Paint =
  | { kind: "solid"; color: string }
  | { kind: "linear"; from: string; to: string; angle: number }
  /**
   * الشعاعيّ: ومركزُه اختياريّ (`cx`/`cy` نسبةً من ضلع الرمز، ٠٫٥ هو القلب). ونصفُ قطره
   * يتّسع كلّما ابتعد المركزُ عن القلب، وإلّا بقي ربعٌ من الرمز خارج التدرّج بلونٍ مصمَت.
   */
  | { kind: "radial"; from: string; to: string; cx?: number; cy?: number };

/** الشعار في القلب — يُفرِّغ ما تحته ويرفع التصحيح إلى `H`. */
export type QrLogo = {
  /** مصدر الصورة — data URL أو مسارٌ في `public` (الأوّل وحده يصلح للتنزيل). */
  href: string;
  /** ضلع الشعار نسبةً إلى ضلع مساحة الرمز (بلا الهامش). يُقصّ إلى `LOGO_MAX`. */
  scale: number;
};

/** الإطار — طوقٌ ونداءٌ تحته، للملصقات. */
export type QrFrame = { color: string; caption: string; textColor: string };

/** كلّ ما يصف رمزًا واحدًا. */
export type QrSpec = {
  text: string;
  /** ضلع مساحة الرمز بالبكسل (شاملًا الهامش الصامت، بلا الإطار). */
  size: number;
  ecc?: Ecc;
  dots?: { shape: DotShape; paint: Paint };
  /** لونُ العين `null` ⇒ تتبع حبر الوحدات. */
  eye?: { shape: EyeShape; color: string | null };
  pupil?: { shape: EyeShape; color: string | null };
  /** الخلفيّة — `null` تعني شفّافة. */
  bg?: string | null;
  logo?: QrLogo | null;
  frame?: QrFrame | null;
};

/**
 * أقصى ضلعٍ للشعار نسبةً إلى ضلع الرمز. عند `H` يُستعاد نحو ثلث الحمولة، والمربّع المركزيّ
 * بهذه النسبة يأكل ~٩٪ من المساحة — دونها بأمانٍ واسع. ورفعُها يجعل الرمز يُمسح على مكتبك
 * ويعجز عنه هاتفٌ في قاعة.
 */
const LOGO_MAX = 0.3;

/** حاشيةُ بياضٍ حول الشعار بالوحدات — تفصله عن أقرب وحدةٍ فلا يلتصق الحبر بالصورة. */
const LOGO_PAD = 1;

/* ── هندسة الرسم ────────────────────────────────────────────────────────── */

/** رقمٌ مختصرٌ في المسار — ثلاث منازل تكفي دقّةَ وحدةٍ واحدة، وتُصغّر الملفّ كثيرًا. */
const f = (v: number): string => (Math.round(v * 1000) / 1000).toString();

/** مسارُ مستطيلٍ بزوايا مستقلّة — أساسُ كلّ شكلٍ هنا (الوحدة والعين والبؤبؤ). */
function boxPath(x: number, y: number, w: number, h: number, r: [number, number, number, number]): string {
  const [tl, tr, br, bl] = r;
  const arc = (rad: number, ex: number, ey: number) =>
    rad > 0 ? `A${f(rad)},${f(rad)} 0 0 1 ${f(ex)},${f(ey)}` : `L${f(ex)},${f(ey)}`;
  return (
    `M${f(x + tl)},${f(y)}` +
    `L${f(x + w - tr)},${f(y)}${arc(tr, x + w, y + tr)}` +
    `L${f(x + w)},${f(y + h - br)}${arc(br, x + w - br, y + h)}` +
    `L${f(x + bl)},${f(y + h)}${arc(bl, x, y + h - bl)}` +
    `L${f(x)},${f(y + tl)}${arc(tl, x + tl, y)}` +
    "Z"
  );
}

/** مربّعٌ بشكلٍ مسمًّى — تُشتقّ منه العين والبؤبؤ بمقاسيهما. */
function shapePath(x: number, y: number, s: number, shape: EyeShape): string {
  const r = shape === "rounded" ? s * 0.24 : 0;
  return boxPath(x, y, s, s, [r, r, r, r]);
}

/* ── الأجزاء ────────────────────────────────────────────────────────────── */

/** هل تقع هذه الوحدة داخل إحدى العيون الثلاث؟ (تُرسَم على حدة فتُستثنى من الوحدات.) */
function inEye(n: number, row: number, col: number): boolean {
  return (
    (row < EYE && col < EYE) ||
    (row < EYE && col >= n - EYE) ||
    (row >= n - EYE && col < EYE)
  );
}

/** مستطيلُ الشعار بوحدات الرمز (بإحداثيّات المصفوفة، بلا الهامش) — أو `null` بلا شعار. */
function logoBox(n: number, logo: QrLogo | null | undefined): { x: number; y: number; s: number } | null {
  if (!logo) return null;
  const s = n * Math.min(LOGO_MAX, Math.max(0.1, logo.scale));
  return { x: (n - s) / 2, y: (n - s) / 2, s };
}

/** مسارُ كلّ الوحدات — عدا العيون وما فُرِّغ تحت الشعار. */
function dotsPath(m: QrMatrix, shape: DotShape, hole: { x: number; y: number; s: number } | null): string {
  const { n, isDark } = m;
  const on = (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n && isDark(r, c) && !inEye(n, r, c) && !cleared(r, c);
  // التفريغ بتقاطع الخليّة لا بمركزها: وحدةٌ يمسّها الشعار جزئيًّا تبقى نصفَ حبرٍ يُربك القارئ.
  function cleared(r: number, c: number): boolean {
    if (!hole) return false;
    const a = hole.x - LOGO_PAD, b = hole.y - LOGO_PAD, s = hole.s + LOGO_PAD * 2;
    return c + 1 > a && c < a + s && r + 1 > b && r < b + s;
  }

  let d = "";
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!isDark(r, c) || inEye(n, r, c) || cleared(r, c)) continue;
      const x = c + QUIET, y = r + QUIET;
      if (shape === "square") {
        d += boxPath(x, y, 1, 1, [0, 0, 0, 0]);
      } else {
        // سائل: تُدوَّر الزاويةُ **الخارجيّة** وحدها — تلك التي جارَاها غائبان معًا.
        const up = on(r - 1, c), down = on(r + 1, c), left = on(r, c - 1), right = on(r, c + 1);
        const R = 0.5;
        d += boxPath(x, y, 1, 1, [
          !up && !left ? R : 0,
          !up && !right ? R : 0,
          !down && !right ? R : 0,
          !down && !left ? R : 0,
        ]);
      }
    }
  }
  return d;
}

/** مسارا العيون: الطوق (٧×٧ مفرَّغٌ ٥×٥) والبؤبؤ (٣×٣). */
function eyePaths(n: number, frameShape: EyeShape, pupilShape: EyeShape): { ring: string; pupil: string } {
  const corners: [number, number][] = [
    [0, 0],
    [0, n - EYE],
    [n - EYE, 0],
  ];
  let ring = "";
  let pupil = "";
  for (const [row, col] of corners) {
    const x = col + QUIET, y = row + QUIET;
    // الطوق: الشكلُ الخارجيّ ثمّ الداخليّ — و`evenodd` تُفرِغ ما بينهما فيبقى سُمكُ وحدةٍ واحدة.
    ring += shapePath(x, y, EYE, frameShape) + shapePath(x + 1, y + 1, EYE - 2, frameShape);
    pupil += shapePath(x + 2, y + 2, EYE - 4, pupilShape);
  }
  return { ring, pupil };
}

/* ── الحبر ──────────────────────────────────────────────────────────────── */

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** تعريفُ التدرّج ومرجعُه — الصلبُ بلا تعريف، فلا `defs` فارغة في ملفٍّ لا يحتاجها. */
function paintOf(paint: Paint, id: string): { def: string; ref: string } {
  if (paint.kind === "solid") return { def: "", ref: paint.color };
  const stops = `<stop offset="0" stop-color="${paint.from}"/><stop offset="1" stop-color="${paint.to}"/>`;
  if (paint.kind === "radial") {
    // المركزُ نسبةٌ من الضلع، والافتراضُ القلب. ونصفُ القطر يُحسَب من أبعدِ ركنٍ عن المركز
    // فيبلغ التدرّجُ حافّةَ الرمز مهما أُزيح، ولا يبقى ركنٌ خارجَه بلونٍ واحدٍ مصمَت.
    const cx = Math.min(Math.max(paint.cx ?? 0.5, 0), 1);
    const cy = Math.min(Math.max(paint.cy ?? 0.5, 0), 1);
    const r = Math.hypot(Math.max(cx, 1 - cx), Math.max(cy, 1 - cy));
    const g =
      `<radialGradient id="${id}" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">${stops}</radialGradient>`;
    return { def: g, ref: `url(#${id})` };
  }
  // الزاوية بالدرجات إلى متّجهٍ داخل مربّع الوحدة (0° = يمينًا، وتدور مع عقارب الساعة)
  const a = (paint.angle * Math.PI) / 180;
  const dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
  const g =
    `<linearGradient id="${id}" x1="${f(0.5 - dx)}" y1="${f(0.5 - dy)}"` +
    ` x2="${f(0.5 + dx)}" y2="${f(0.5 + dy)}">${stops}</linearGradient>`;
  return { def: g, ref: `url(#${id})` };
}

/**
 * نسبةُ التباين بين لونين (WCAG). **تُقاس ولا تُظَنّ** — الرمز يُقرأ بالتباين، وحبرٌ جميلٌ
 * على خلفيّةٍ قريبةٍ منه يخرج في الشاشة ويُخفق في الورق. تقبل `#rgb` و`#rrggbb`.
 */
export function contrast(a: string, b: string): number {
  const lum = (hex: string): number => {
    const h = hex.replace("#", "").trim();
    const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    const v = [0, 2, 4].map((i) => {
      const c = parseInt(full.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  try {
    const [x, y] = [lum(a), lum(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  } catch {
    return 0;
  }
}

/** ألوانُ الحبر كلُّها — لِيُقاس أضعفُها تباينًا مع الخلفيّة. */
export function inkColors(spec: QrSpec): string[] {
  const p = spec.dots?.paint ?? { kind: "solid" as const, color: "#000000" };
  const base = p.kind === "solid" ? [p.color] : [p.from, p.to];
  const eyes = [spec.eye?.color, spec.pupil?.color].filter((c): c is string => !!c);
  return [...base, ...eyes];
}

/* ── الرسم ──────────────────────────────────────────────────────────────── */

/** الإطار بنسبٍ من ضلع الرمز — فلا مقاسَ محفورٌ يكسر عند تغيير الحجم. */
const FRAME = { pad: 0.06, radius: 0.08, caption: 0.17, text: 0.5, stroke: 0.02 };

/** التصحيح الفعليّ — الشعار يفرضه `H` مهما طُلب غيره. */
export const effectiveEcc = (spec: QrSpec): Ecc => (spec.logo ? "H" : spec.ecc ?? "M");

/**
 * الرمز متّجهًا — نصّ SVG قائمٌ بذاته يُعرَض ويُنزَّل ويُفتَح في أدوات التصميم.
 *
 * **مسارٌ واحدٌ للوحدات لا مستطيلٌ لكلّ وحدة**: الرمز الوسط ألفُ وحدةٍ معتمة، فألفُ عنصرٍ
 * يُثقل الملفّ والمتصفّح — وهي بحبرٍ واحد فتجتمع في `path` واحد.
 *
 * **والإحداثيّات بوحدات الرمز** لا بالبكسل: المقاس يتغيّر في `width`/`height` وحدهما.
 *
 * @param withText نصُّ النداء يُرسَم هنا؛ يُطفأ حين تتولّاه canvas (انظر {@link qrPng}).
 */
export function qrSvg(spec: QrSpec, withText = true): string {
  const m = qrMatrix(spec.text, effectiveEcc(spec));
  const side = m.n + QUIET * 2;
  const hole = logoBox(m.n, spec.logo);

  const dots = spec.dots ?? { shape: "square" as DotShape, paint: { kind: "solid" as const, color: "#000000" } };
  const { def, ref } = paintOf(dots.paint, "qg");
  const eye = spec.eye ?? { shape: "square" as EyeShape, color: null };
  const pupil = spec.pupil ?? { shape: "square" as EyeShape, color: null };
  const { ring, pupil: pupilPath } = eyePaths(m.n, eye.shape, pupil.shape);

  // الإطار يزيد لوحًا حول الرمز: حشوةٌ من كلّ جهة وشريطُ نداءٍ تحته.
  const fr = spec.frame ?? null;
  const pad = fr ? side * FRAME.pad : 0;
  // **الحيّز لا يتبع `withText`** — يتبعه النصّ وحده. ولو سقط الشريط مع نصّه لاختلف
  // اللوحُ عن canvas الذي يُرسَم فيه، فتُمطّ الصورة. (عيبٌ وقع ثمّ صُحّح هنا.)
  const cap = fr && fr.caption.trim() ? side * FRAME.caption : 0;
  const W = side + pad * 2;
  const H = side + pad * 2 + cap;
  const px = spec.size;
  const py = Math.round((px * H) / W);

  // أرضيّةٌ بزوايا مدوّرة خفيفًا كسائر أسطح العلامة — والتدوير يقع في الهامش الصامت فلا يمسّ رمزًا.
  const plate = spec.bg
    ? `<rect x="${f(pad)}" y="${f(pad)}" width="${f(side)}" height="${f(side)}" rx="${f(side * 0.05)}" fill="${spec.bg}"/>`
    : "";

  const frameBox = fr
    ? `<rect x="${f(side * FRAME.stroke)}" y="${f(side * FRAME.stroke)}"` +
      ` width="${f(W - side * FRAME.stroke * 2)}" height="${f(H - side * FRAME.stroke * 2)}"` +
      ` rx="${f(side * FRAME.radius)}" fill="none" stroke="${fr.color}" stroke-width="${f(side * FRAME.stroke * 2)}"/>`
    : "";

  const capBar = fr && cap
    ? `<path d="${boxPath(0, H - cap, W, cap, [0, 0, side * FRAME.radius, side * FRAME.radius])}" fill="${fr.color}"/>` +
      (withText
        ? `<text x="${f(W / 2)}" y="${f(H - cap / 2)}" fill="${fr.textColor}" font-size="${f(cap * FRAME.text)}"` +
          ` font-family='${FONT}' font-weight="700" text-anchor="middle" dominant-baseline="central"` +
          ` direction="rtl">${escapeXml(fr.caption)}</text>`
        : "")
    : "";

  const logo = hole
    ? `<rect x="${f(pad + QUIET + hole.x - LOGO_PAD)}" y="${f(pad + QUIET + hole.y - LOGO_PAD)}"` +
      ` width="${f(hole.s + LOGO_PAD * 2)}" height="${f(hole.s + LOGO_PAD * 2)}"` +
      ` rx="${f((hole.s + LOGO_PAD * 2) * 0.18)}" fill="${spec.bg ?? "#ffffff"}"/>` +
      `<image x="${f(pad + QUIET + hole.x)}" y="${f(pad + QUIET + hole.y)}"` +
      ` width="${f(hole.s)}" height="${f(hole.s)}"` +
      // `href` للمتصفّحات و`xlink:href` لأدوات التصميم القديمة — الملفّ يُفتَح في كلَيهما
      ` href="${escapeXml(spec.logo!.href)}" xlink:href="${escapeXml(spec.logo!.href)}"` +
      ` preserveAspectRatio="xMidYMid meet"/>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"` +
    ` width="${px}" height="${py}" viewBox="0 0 ${f(W)} ${f(H)}" role="img" aria-label="رمز QR">` +
    (def ? `<defs>${def}</defs>` : "") +
    plate +
    `<g transform="translate(${f(pad)},${f(pad)})">` +
    `<path d="${dotsPath(m, dots.shape, hole)}" fill="${ref}"/>` +
    `<path d="${ring}" fill="${eye.color ?? ref}" fill-rule="evenodd"/>` +
    `<path d="${pupilPath}" fill="${pupil.color ?? ref}"/>` +
    `</g>` +
    logo +
    frameBox +
    capBar +
    `</svg>`
  );
}

/** أبعادُ اللوح بالبكسل — الإطارُ يجعله أطولَ من عرضه، فلا يُفترَض مربّعًا. */
function pixelSize(spec: QrSpec): { w: number; h: number } {
  const m = qrMatrix(spec.text, effectiveEcc(spec));
  const side = m.n + QUIET * 2;
  const fr = spec.frame ?? null;
  const pad = fr ? side * FRAME.pad : 0;
  const cap = fr && fr.caption.trim() ? side * FRAME.caption : 0;
  const W = side + pad * 2;
  const H = side + pad * 2 + cap;
  return { w: spec.size, h: Math.round((spec.size * H) / W) };
}

/** يرسم نصَّ SVG في canvas بمقاسٍ معلوم. */
async function rasterize(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = svgToDataUrl(svg);
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر تجهيز الرمز (canvas).");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/**
 * الرمز صورةً نقطيّة — عميليّ (يمسّ DOM).
 *
 * **ونصُّ النداء يُكتب على canvas لا في الـSVG المُرسَّم**: صورةُ SVG مستندٌ مستقلّ يحمّل
 * خطوطه بنفسه، وقد تُرسَم قبل أن يفرغ منها فيخرج النصّ بخطّ المتصفّح (العلّة الموثَّقة في
 * `paper.ts`). وcanvas يكتب بخطّ المستند الجاهز فلا سباق. أمّا ملفّ SVG المنزَّل فيحمل النصّ
 * نصًّا (يُحرَّر في أدوات التصميم) — وذلك هو المطلوب هناك.
 */
export async function qrPng(spec: QrSpec): Promise<Blob> {
  const { w, h } = pixelSize(spec);
  const fr = spec.frame ?? null;
  const caption = fr?.caption.trim() ?? "";
  const canvas = await rasterize(qrSvg(spec, false), w, h);

  if (fr && caption) {
    await ensureFonts();
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const capH = h - w; // شريطُ النداء هو ما زاد به الطولُ عن العرض
      const fs = capH * FRAME.text;
      ctx.save();
      ctx.direction = "rtl";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${fs}px ${FONT}`;
      ctx.fillStyle = fr.textColor;
      ctx.fillText(caption, w / 2, h - capH / 2);
      ctx.restore();
    }
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذّر توليد صورة الرمز."))), "image/png");
  });
}

/** الرمز متّجهًا ملفًّا جاهزًا للتنزيل (`lib/download.ts` ينزّله). */
export function qrSvgBlob(spec: QrSpec): Blob {
  return new Blob([qrSvg(spec)], { type: "image/svg+xml;charset=utf-8" });
}

/**
 * ختمُ الرمز على ورقةٍ مفتوحة عند `(x, y)` — يُستدعى بعد `openPaper` وقبل `sealPaper`،
 * فتعلوه طبقةُ النصّ الشفّافة ولا تحجبه. ويمرّ بالراسم الموحّد نفسه، فختمُ الشهادة وما
 * يُنزَّل من المحرّر شيءٌ واحد.
 */
export async function stampQr(
  ctx: CanvasRenderingContext2D,
  spec: QrSpec,
  x: number,
  y: number,
): Promise<void> {
  const { w, h } = pixelSize(spec);
  const canvas = await rasterize(qrSvg(spec, false), w, h);
  ctx.drawImage(canvas, x, y);
}
