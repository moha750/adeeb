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
/**
 * **شكلُ الإطار** (معرضُه `/ui/qr-frames`): `band` طوقٌ وشريطُ نداء · `ring` طوقٌ صامتٌ بلا
 * نداء · `bubble` فقاعةُ كلامٍ بذيلٍ تشير إلى الباركود.
 *
 * وأُعدمت `corners` (أربعُ زوايا مفتوحة) بأمر المالك ٢٠٢٦-٠٨-٢٥ بعد عرضها في المعرض.
 */
export type QrFrameStyle = "band" | "ring" | "bubble";

/**
 * **موضعُ النداء**: فوق الباركود أو تحته، واحدٌ لا اثنان (قرارُ المالك ٢٠٢٦-٠٨-٢٥ بعد أن
 * جُرّبت فقاعتان معًا). و`ring` لا يعنيه الموضعُ إذ لا نداءَ فيه.
 *
 * **والموضعُ مستقلٌّ عن الشكل** عمدًا: سؤالان لا سؤالٌ واحد، فلا تتضاعف الأشكالُ بعدد
 * المواضع كلّما زِيد موضعٌ أو شكل.
 */
export type QrFramePlace = "top" | "bottom";

export type QrFrame = {
  color: string;
  caption: string;
  textColor: string;
  style?: QrFrameStyle;
  place?: QrFramePlace;
};

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


/* ── الرسم ──────────────────────────────────────────────────────────────── */

/** الإطار بنسبٍ من ضلع الرمز — فلا مقاسَ محفورٌ يكسر عند تغيير الحجم. */
/**
 * قياساتُ الإطار نسبةً إلى ضلع الرمز. والحشوةُ ضاقت ثلاثَ مرّاتٍ بأمر المالك (٦٪ فـ٣٫٥٪
 * فـ٢٪ فـ١٫٢٪): الطوقُ حدٌّ يلاصق الرمزَ لا لوحٌ يحمله.
 */
const FRAME = {
  radius: 0.08,
  caption: 0.17,
  text: 0.5,
  /** سُمكُ الطوق. وتغليظُه لا يوسّع الفراغَ حول الرمز: الحدُّ الداخليّ يبقى حيث هو، ويكبر
   *  اللوحُ من خارجه (انظر `edge` في `frameGeom`). */
  stroke: 0.018,
  /**
   * فراغٌ بين الرمز والفقاعة، **يُزاد إلى ارتفاع اللوح لا يُقتطع منه**.
   *
   * كانت الفقاعةُ تُزاح داخل حيّزها فتخرج من أسفله وتُقصّ (رآها المالك مقصوصةً
   * ٢٠٢٦-٠٨-٢٥). والفرقُ أنّ الإزاحةَ تحرّك ما في الصندوق، والفراغَ يكبّر الصندوق.
   */
  bubbleGap: 0.03,
  /**
   * وكم يُقتطع من الهامش الصامت للطوق والشريط: القدرُ نفسُه (وحدتان من أربع). فالإطارُ
   * يلاصق الرمزَ ويبقى للقارئ نصفُ هامشه، وهو ما تفعله مولّداتُ الأطر.
   */
  quietBite: 0.055,
};

/**
 * **هندسةُ الإطار — مصدرٌ واحد.** يقرؤها ثلاثة: راسمُ SVG، وحاسبُ أبعاد البكسل، وكاتبُ
 * النداء على canvas في PNG. وكانت محسوبةً في كلٍّ منها على حدة (`h - w` هناك، و`cap` هنا)،
 * فأوّلُ هيئةٍ يعلو فيها الشريطُ كانت ستكتب النصَّ في القاع.
 *
 * والوحدةُ وحدةُ المصفوفة (`side` = وحداتُ الرمز مع هامشه الصامت)، لا البكسل.
 */
function frameGeom(spec: QrSpec, side: number) {
  const fr = spec.frame ?? null;
  const style: QrFrameStyle = fr?.style ?? "band";
  // الطوقُ الصامت لا نداءَ له، وغيرُه يأخذ شريطًا إن كان في النداء حرف
  const wants = !!fr && style !== "ring" && !!fr.caption.trim();
  const top = (fr?.place ?? "bottom") === "top";

  /**
   * **حدُّ الإطار الداخليّ خطٌّ واحدٌ من الجهات الأربع.**
   *
   * كان الحسابُ يضع حشوةً حول الرمز ثمّ يرسم الطوقَ داخلها ويضع الشريطَ **بعد الحشوة**،
   * فيخرج الفراغُ أسفلَ الرمز ضعفَ الفراغ عن جانبيه (قِيس: ‏٠٫١٢ من الضلع تحت، و٠٫٠٦ على
   * الجانب). **رآه المالكُ بعينه قبل أن يُقاس.**
   *
   * فصار البناءُ من الحدّ الداخليّ لا من الحشوة: `edge` هو بُعدُ الحدّ الداخليّ للطوق عن
   * حافّة اللوح (إزاحةٌ زائدُ سُمك)، ويُبنى عليه كلُّ شيء: مربّعُ الرمز يبدأ عنده،
   * **وشريطُ النداء يبدأ عند حافّة المربّع بعينها**. فالمسافةُ من الحبر إلى كلّ حدٍّ
   * واحدةٌ: هي الهامشُ الصامت وحدَه (أربعُ وحدات).
   */
  const edge = fr ? side * FRAME.stroke * 3 : 0;
  const cap = wants ? side * FRAME.caption : 0;
  /**
   * **اللوحُ يقضم من الهامش الصامت** ليقترب الإطارُ من الحبر: الهامشُ أربعُ وحداتٍ بالمواصفة،
   * فيُقتطع منه وحدتان ويبقى وحدتان. والقصُّ من الجهات الأربع بالسويّة، فالمربّعُ المرئيّ
   * أصغرُ من مربّع الرمز، والرمزُ يُرسَم كاملًا ويقع ما قُصّ خارج اللوح (وهو هامشٌ لا حبرَ فيه).
   */
  const bite = fr ? side * FRAME.quietBite : 0;
  const box = side - bite * 2;
  // فراغُ الفقاعة يُضاف إلى الارتفاع، فتسع الفقاعةَ كاملةً ولا تُقصّ
  const gap = style === "bubble" && cap ? side * FRAME.bubbleGap : 0;
  const W = box + edge * 2;
  const H = cap ? edge + box + gap + cap : W;
  return {
    fr, style, cap, top, W, H, edge, box, gap,
    /** إزاحةُ الرمز أفقيًّا: يخرج طرفُه المقصوص خارج اللوح. */
    dx: edge - bite,
    /** إزاحةُ الرمز رأسيًّا: النداءُ العلويّ يدفعه إلى أسفل بقدره، والقصُّ يرفعه بقدره. */
    dy: (top && cap ? cap + gap : edge) - bite,
    /**
     * مراكزُ سطور النداء رأسيًّا (بوحدة المصفوفة). قائمةٌ لا رقمٌ واحد: يقرؤها الراسمُ
     * وكاتبُ النصّ على canvas معًا، فلا موضعان يفترقان.
     */
    capMids: !cap ? [] : top ? [cap / 2] : [H - cap / 2],
  };
}

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

  // الإطار يزيد لوحًا حول الرمز: حشوةٌ من كلّ جهة وشريطُ نداء. وهيئتُه إحدى خمس.
  // **والحيّز لا يتبع `withText`** — يتبعه النصّ وحده. ولو سقط الشريط مع نصّه لاختلف
  // اللوحُ عن canvas الذي يُرسَم فيه، فتُمطّ الصورة. (عيبٌ وقع ثمّ صُحّح هنا.)
  const g = frameGeom(spec, side);
  const { fr, style, cap, W, H, edge, box } = g;
  const px = spec.size;
  const py = Math.round((px * H) / W);

  // قياساتُ الطوق: سُمكُه وإزاحتُه واستدارتُه. تُعلَن قبل الأرضيّة لأنّ الأرضيّةَ تستعير
  // استدارتَه حين يكون إطار.
  const sw = side * FRAME.stroke * 2;
  const inset = side * FRAME.stroke;
  const rad = side * FRAME.radius;

  /**
   * أرضيّةٌ بزوايا مدوّرة خفيفًا كسائر أسطح العلامة (والتدوير يقع في الهامش الصامت فلا يمسّ
   * رمزًا). **ومع الإطار تفرش اللوحَ كلَّه** لا مربّعَ الباركود وحدَه: المؤطَّرُ بطاقةٌ قائمةٌ
   * بذاتها، فلو بقيت الأرضيّةُ تحت الباركود وحدَه لظهر لونُ الملصق بين الطوق والرمز وبَدا
   * الطوقُ عائمًا لا محيطًا. وهذا هو المتّبع في مولّدات الأطر: الإطارُ بطاقةٌ تُقصّ.
   */
  // والهيئتان الخفيفتان (زوايا وفقاعة) لا تفرشان: ليستا بطاقةً تُقصّ، إنّما علامتان تعومان
  // على ما تحتهما. فتبقى أرضيّةُ الباركود وحدَها (أمرُ المالك ٢٠٢٦-٠٨-٢٥).
  const carded = style !== "bubble";
  const plate = spec.bg
    ? fr && carded
      ? `<path d="${boxPath(0, 0, W, H, [rad, rad, rad, rad])}" fill="${spec.bg}"/>`
      : `<rect x="${f(edge)}" y="${f(g.dy + (side - box) / 2)}" width="${f(box)}" height="${f(box)}" rx="${f(side * 0.05)}" fill="${spec.bg}"/>`
    : "";

  const frameBox = !fr || style === "bubble"
    ? ""
    : `<rect x="${f(inset)}" y="${f(inset)}"` +
      ` width="${f(W - inset * 2)}" height="${f(H - inset * 2)}"` +
      ` rx="${f(rad)}" fill="none" stroke="${fr.color}" stroke-width="${f(sw)}"/>`;

  /**
   * سريرُ النداء: شريطٌ يملأ عرضَ اللوح في الهيئتين `band` و`bandTop` و`corners`، وفقاعةٌ
   * بذيلٍ تشير إلى الباركود في `bubble`. والنصُّ يُكتب في مركزه أيًّا كان موضعُه.
   */
  /** فقاعةٌ في مركزٍ معلوم، ذيلُها يشير إلى الباركود: إلى أسفل إن كانت فوقه، وإلى أعلى إن كانت تحته. */
  const bubbleAt = (mid: number) => {
    if (!fr) return "";
    /**
     * جسمٌ أطولُ وذيلٌ أقصر، **ورفعٌ إلى داخل الهامش الصامت** (`bubbleLift`): أكثرُ ما بين
     * الفقاعة والحبر ليس فراغًا نختاره، بل الهامشُ الصامتُ نفسُه (أربعُ وحداتٍ = ٦٣٪ من
     * ارتفاع الشريط). فتزحف الفقاعةُ إليه وحدتين ويبقى وحدتان، وهو ما تفعله مولّداتُ الأطر.
     *
     * وزوايا الفقاعة **من زاوية الهوية لا نصفَ دائرة** (أمرُ المالك ٢٠٢٦-٠٨-٢٥): الكبسولةُ
     * لغةُ الشارات لا لغةُ الأسطح، والفقاعةُ سطحٌ يحمل كلامًا.
     */
    const bw = W * 0.72, bx = (W - bw) / 2, bh = cap * 0.9, by = mid - bh / 2;
    // الذيلُ كان عُشرَ الشريط فلم يكد يُرى (المالك ٢٠٢٦-٠٨-٢٥)، فكبُر مرّتين حتى استبان
    const tail = cap * 0.26;
    const br = bh * 0.35;
    const up = mid < H / 2; // فوق الباركود ⇒ الذيلُ إلى أسفل
    const ty = up ? by + bh : by;
    const tip = up ? ty + tail : ty - tail;
    return (
      `<path d="${boxPath(bx, by, bw, bh, [br, br, br, br])}" fill="${fr.color}"/>` +
      `<path d="M${f(W / 2 - tail * 0.9)},${f(ty)}L${f(W / 2)},${f(tip)}L${f(W / 2 + tail * 0.9)},${f(ty)}Z" fill="${fr.color}"/>`
    );
  };
  const capBed = (mid: number) => {
    if (!fr || !cap) return "";
    // الفقاعةُ للهيئتين الخفيفتين: شريطٌ ممتدٌّ بعرض اللوح يفترض بطاقةً، وهاتان لا بطاقةَ لهما.
    if (style === "bubble") return bubbleAt(mid);
    const y = g.top ? 0 : H - cap;
    const corners: [number, number, number, number] = g.top ? [rad, rad, 0, 0] : [0, 0, rad, rad];
    return `<path d="${boxPath(0, y, W, cap, corners)}" fill="${fr.color}"/>`;
  };
  const capBar = !fr
    ? ""
    : g.capMids
        .map(
          (mid) =>
            capBed(mid) +
            (withText
              ? `<text x="${f(W / 2)}" y="${f(mid)}" fill="${fr.textColor}" font-size="${f(cap * FRAME.text)}"` +
                ` font-family='${FONT}' font-weight="700" text-anchor="middle" dominant-baseline="central"` +
                ` direction="rtl">${escapeXml(fr.caption)}</text>`
              : ""),
        )
        .join("");

  /**
   * **الشعارُ بلا لوحٍ خلفه** (أمرُ المالك ٢٠٢٦-٠٨-٢٥): كان يُرسَم تحته مستطيلٌ بلون أرضيّة
   * الباركود، وهو في الأرضيّة الملوّنة **لا يُرى** (اللونُ نفسُه على اللون نفسِه)، وفي
   * الأرضيّة الشفّافة يفرض بياضًا لم يطلبه أحد.
   *
   * وحذفُه آمنٌ لا مجازفة: الوحداتُ تحت الشعار **مفرَّغةٌ أصلًا** بالمساحة نفسِها التي كان
   * يغطّيها اللوح (`hole ± LOGO_PAD` في `dotsPath`)، فلا حبرَ يظهر من تحته.
   */
  const logo = hole
    ? `<image x="${f(g.dx + QUIET + hole.x)}" y="${f(g.dy + QUIET + hole.y)}"` +
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
    `<g transform="translate(${f(g.dx)},${f(g.dy)})">` +
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
  const { W, H } = frameGeom(spec, side);
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
      /**
       * موضعُ النداء **من هندسة الإطار نفسِها** لا من `h - w`: الهيئةُ العلويّة تضع الشريطَ
       * فوق، فالطرحُ القديم كان يكتب النصَّ في القاع على لوحٍ فارغ.
       * والنسبةُ تُحوَّل إلى بكسل بمعامل `w / W` (عرضُ اللوح هو المرجع في الحالين).
       */
      const m = qrMatrix(spec.text, effectiveEcc(spec));
      const side = m.n + QUIET * 2;
      const g = frameGeom(spec, side);
      if (g.cap) {
        const k = w / g.W;
        const fs = g.cap * k * FRAME.text;
        ctx.save();
        ctx.direction = "rtl";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 ${fs}px ${FONT}`;
        ctx.fillStyle = fr.textColor;
        for (const mid of g.capMids) ctx.fillText(caption, w / 2, mid * k);
        ctx.restore();
      }
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
