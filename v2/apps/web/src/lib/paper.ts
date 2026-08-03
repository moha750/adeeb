/**
 * رسّام الأوراق — ما تشترك فيه كلّ ورقةٍ تُرسَم على قالبٍ من المالك (خطابُ الإنذار، شهادةُ
 * الخبرة، وما يأتي بعدهما). عميليّ حصرًا (يمسّ DOM).
 *
 * **الحدّ بينه وبين الورقة**: هذا يقول **كيف** يُرسَم الحرف — الخطّ المضمَّن ومِزات المدّ
 * والقياس واللفّ والتنزيل. وكلُّ ورقةٍ تقول **ماذا** يُكتب و**أين**. فلا يُنسَخ الرسم مرّتين
 * ولا يُحشَر تخطيطُ ورقةٍ في ورقةٍ أخرى.
 *
 * **ولماذا SVG لا canvas؟** الحروف ممدودةٌ في الموقع (`ss06`/`ss07`/`salt`)، وcanvas لا يعرف
 * `font-feature-settings` — فيُرسَم النصّ كلّه في SVG واحدٍ بخطٍّ مضمَّن يُفعّل المِزات، ثمّ
 * تُرسَم صورتُه فوق القالب. وإن تعذّر جلبُ الخطّ ارتددنا إلى رسم canvas المباشر (بلا مدّ)
 * فلا يبقى المستخدم بلا ورقة.
 */

/**
 * **مكدّس الخطّ كما في الموقع** (`--font-latin`): Eras أوّلًا فتُرسَم به الأرقام واللاتينيّ،
 * ثمّ Lyon Arabic يلتقط ما عجز عنه — أيْ العربيّة كلَّها. فلا رقمٌ يخرج بخطّ النصّ العربيّ.
 */
export const FONT = '"Eras", "Lyon Arabic"';

/** مِزات المدّ — نفسها المكتوبة على `html` في `globals.css`، فالورقة تُقرأ كالموقع. */
export const FEATURES = "'ss06' 1, 'ss07' 1, 'salt' 1";

/** وزنان يكفيان أوراقنا: متنٌ متوسّط وعنوانٌ عريض. (الطلب أخفّ، والفرق لا يُرى.) */
export const WEIGHTS = { body: 500, bold: 700 } as const;

/**
 * **استثناءٌ واحدٌ من المكدّس: الفاصل «|»** (قرار المالك) — يُردّ إلى الخطّ العربيّ وحده،
 * لأنّ رسمه في Eras يفارق ما اعتادته الورقة. واستثناءٌ **مسمًّى في موضعٍ واحد** أصدقُ من
 * تخصيصٍ يتناثر: من أراد ردَّ محرفٍ آخر زاده هنا ولا يمسّ الرسم.
 */
const AR_ONLY = /(\|)/;

/** ملفّات التضمين — لكلّ وزنٍ عربيُّه ولاتينيُّه، فالمكدّس داخل SVG كالمكدّس في الموقع. */
const FONT_FILES: { weight: number; ar: string; lat: string }[] = [
  { weight: 500, ar: "/fonts/lyon-arabic-medium.woff2", lat: "/fonts/eras-medium.ttf" },
  { weight: 700, ar: "/fonts/lyon-arabic-bold.woff2", lat: "/fonts/eras-bold.ttf" },
];

/** مقاس الورقة بالبكسل — مطابقٌ لقالبها. */
export type PageSize = { w: number; h: number };

// ختمُ الباركود ليس شأن الورقة — هو في `lib/qr.ts` (مصدرٌ واحد يخدم الشهادة وأداة التوليد
// في اللوحة معًا). كان مكتوبًا هنا لأنّ أوّل طالبٍ له كان ورقة.

/** قطعةُ نصٍّ مرسومة — تُبنى مرّةً، ثمّ تُرسَم بمسار SVG (ممدودة) أو بمسار canvas (ارتدادًا). */
export type Piece = {
  text: string;
  x: number;
  y: number;
  size: number;
  weight: number;
  color: string;
  /** `start` = ملتصقٌ بالحافّة اليمنى (اتّجاهنا rtl) · `middle` = متوسَّط. */
  anchor: "start" | "middle";
};

export async function ensureFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`${WEIGHTS.bold} 64px ${FONT}`),
      document.fonts.load(`${WEIGHTS.body} 32px ${FONT}`),
    ]);
    await document.fonts.ready;
  } catch { /* غياب واجهة الخطوط لا يوقف الرسم */ }
}

export function loadTemplate(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* ── الخطّ المضمَّن (base64) — يُجلَب مرّةً ويُخبَّأ ───────────────────────── */

/** الخطوط المضمَّنة جاهزةً: لكلّ وزنٍ عربيُّه ولاتينيُّه بترميز base64. */
type FontPack = { weight: number; ar: string; lat: string }[];

async function fetchB64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font ${url} ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

let fontsB64: Promise<FontPack | null> | null = null;
function loadFontsB64(): Promise<FontPack | null> {
  if (!fontsB64) {
    fontsB64 = (async () => {
      try {
        return await Promise.all(
          FONT_FILES.map(async (f) => ({
            weight: f.weight,
            ar: await fetchB64(f.ar),
            lat: await fetchB64(f.lat),
          })),
        );
      } catch {
        return null; // تعذّر ⇒ ارتدادٌ إلى رسم canvas بلا مدّ
      }
    })();
  }
  return fontsB64;
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * نصُّ القطعة مُعلَّمًا لـSVG: المحارف المستثناة (`AR_ONLY`) تُلَفّ في `tspan` يقدّم الخطّ العربيّ،
 * وما عداها يبقى على المكدّس كما هو. والتقسيم بمجموعةٍ ملتقَطة فلا يسقط المحرف نفسه.
 */
function markup(text: string): string {
  return text
    .split(AR_ONLY)
    .filter(Boolean)
    .map((part) => (AR_ONLY.test(part) ? `<tspan font-family="LA">${escapeXml(part)}</tspan>` : escapeXml(part)))
    .join("");
}

/** SVG (بمحارف عربيّة) → data URL بترميز UTF-8 سليم (btoa يقبل Latin1 وحده). يخدم الورقة و`lib/qr.ts`. */
export function svgToDataUrl(svg: string): string {
  const utf8 = new TextEncoder().encode(svg);
  let bin = "";
  for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
  return "data:image/svg+xml;base64," + btoa(bin);
}

/* ── القياس ──────────────────────────────────────────────────────────────
   canvas يقيس الحروف **غير ممدودة** فيخرج أضيق من المرسوم، فتطفح السطور عن عرض البياض.
   فنقيس مرّةً نسبةَ «الممدود ÷ المقيس» على عيّنةٍ من النصّ نفسه عبر عنصر SVG خفيّ في DOM
   (يرث خطّ الموقع ومِزاته)، ثمّ نضيّق حدَّ اللفّ بها. قياسٌ واحدٌ لا ألفُ قياس. */

export function elongationRatio(
  ctx: CanvasRenderingContext2D,
  sample: string,
  size: number,
  weight: number,
): number {
  try {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;left:-9999px;top:-9999px;visibility:hidden";
    const text = document.createElementNS(NS, "text");
    text.setAttribute("font-family", FONT);
    text.setAttribute("font-size", String(size));
    text.setAttribute("font-weight", String(weight));
    text.setAttribute("direction", "rtl");
    text.setAttribute("style", `font-feature-settings:${FEATURES}`);
    text.textContent = sample;
    svg.appendChild(text);
    document.body.appendChild(svg);
    const drawn = text.getComputedTextLength();
    document.body.removeChild(svg);
    ctx.font = `${weight} ${size}px ${FONT}`;
    const measured = ctx.measureText(sample).width;
    if (!drawn || !measured) return 1;
    // حارسٌ من قياسٍ شاذّ: النسبة بين 1 و1.35 لا غير
    return Math.min(1.35, Math.max(1, drawn / measured));
  } catch {
    return 1;
  }
}

/** لفُّ الفقرة على عرضٍ معلوم — قياسٌ بالكلمة، فالعربيّة لا تُقصّ في وسط الكلمة. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * أكبرُ مقاسٍ يسع سطرًا **واحدًا** في عرضٍ معلوم — لسطرٍ لا يُلَفّ (اسمٌ طويل، أو مسمًّى
 * طويل). ينزل من المقاس المطلوب ولا يهبط تحت `min`؛ فإن عاند الطولُ خرج مضغوطًا ولم يطفح.
 */
export function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight: number,
  min: number,
): number {
  for (let s = size; s > min; s--) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) return s;
  }
  return min;
}

/* ── الرسم ─────────────────────────────────────────────────────────────── */

/** مسار الارتداد: رسمٌ مباشر على canvas (بلا مدّ) — حين يتعذّر جلب الخطّ للتضمين. */
function drawOnCanvas(ctx: CanvasRenderingContext2D, pieces: Piece[]) {
  for (const p of pieces) {
    ctx.save();
    ctx.direction = "rtl";
    ctx.textAlign = p.anchor === "middle" ? "center" : "right";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${p.weight} ${p.size}px ${FONT}`;
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}

/* ── سباقُ الخطّ المضمَّن ─────────────────────────────────────────────────
   `img.decode()` **يَعِد بالصورة لا بخطوطها**: صورةُ SVG مستندٌ مستقلّ يحمّل خطوطه المضمَّنة
   بنفسه، وقد تُرسَم قبل أن يفرغ منها — فيخرج النصّ بخطّ المتصفّح الافتراضيّ. لا يقع دائمًا:
   يزداد وقوعًا بكِبَر الحمولة (أربعة خطوط ≈ ٢٧٠ كيلوبايت) وبانشغال الجهاز، ولذلك يظهر مرّةً
   ويختفي أخرى — وهو الذي رآه المالك في خطابٍ نصفُه بخطّنا ونصفُه بخطّ المتصفّح.

   فلا نأتمن الوعد بل نُحاكم المرسوم: **شاهدٌ** بالقطع نفسها بخطٍّ لا وجود له (فمطابقتُه تعني
   أنّ الورقة كلَّها بخطّ المتصفّح)، و**مرجعُ حبرٍ** من الرسم المباشر (فنقصانُ الحبر يعني سطرًا
   لم يظهر). فإن أخفق أحدهما أمهلنا وأعدنا. وما نسلّمه لا يكون إلّا مُثبَتًا — أو ارتدادًا
   معلومًا إلى canvas بخطّ الموقع بلا مدّ. (وقد أخفقت المحاولةُ الأولى في قياسنا فعلًا.) */

/** محاولاتُ الرسم ومهلةُ ما بينها — ثمانيةٌ بثمانين جزءًا كافيةٌ لأبطأ ما رأينا. */
const RASTER_TRIES = 8;
const RASTER_WAIT = 80;

/** عائلةٌ لا وجود لها — بها يُرسَم الشاهد فيقع على خطّ المتصفّح الافتراضيّ حتمًا. */
const MISSING_FAMILY = "AdeebNoSuchFace";

/** أدنى ما يُقبل من حبرٍ منسوبًا إلى المرجع — دون ذلك فسطرٌ لم يُرسَم أو كلمةٌ سقطت. */
const INK_FLOOR = 0.6;

/** هل الصورتان حبرٌ واحد؟ عيّنةٌ متباعدة تكفي: أيّ حرفٍ اختلف يكشف الفرق. */
function samePixels(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 13) if (a[i] !== b[i]) return false;
  return true;
}

/** عدُّ الحبر — كلُّ رابعِ بكسلٍ يكفي لنسبةٍ تُقارَن (لا نحتاج عددًا مضبوطًا). */
function inkCount(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] > 16) n++;
  return n;
}

/** لوحٌ شفّافٌ بمقاس الورقة — يُرسَم فيه قبل أن يُنقل إلى الورقة، فلا يُلطَّخ القالب بمحاولة. */
function scratch(page: PageSize): CanvasRenderingContext2D | null {
  const canvas = document.createElement("canvas");
  canvas.width = page.w;
  canvas.height = page.h;
  return canvas.getContext("2d");
}

/** يرسم SVG في لوحٍ شفّافٍ بمقاس الورقة — لوحٌ جديدٌ في كلّ مرّة فلا تُعاد صورةٌ مخبّأة. */
async function rasterize(svg: string, page: PageSize): Promise<CanvasRenderingContext2D | null> {
  const img = new Image();
  img.src = svgToDataUrl(svg);
  try {
    await img.decode();
  } catch {
    return null;
  }
  const c = scratch(page);
  if (!c) return null;
  c.drawImage(img, 0, 0);
  return c;
}

/**
 * **تمريرةُ وزنٍ واحد**: قطعُ هذا الوزن وحدها في SVG لا يحمل إلّا خطّي وزنها (عربيًّا ولاتينيًّا).
 * فالحمولة نصفُ ما كانت، **وكلُّ وزنٍ يُثبت نفسه بنفسه** — فلا يمرّ عنوانٌ سقط خطُّه في زحمة
 * متنٍ نجح. تعيد اللوح مرسومًا، أو `null` إن لم يثبت بعد كلّ المحاولات.
 */
async function drawLayer(
  pieces: Piece[],
  page: PageSize,
  font: FontPack[number],
): Promise<HTMLCanvasElement | null> {
  // عائلتان في SVG كما في الموقع: «ER» للاتينيّ والأرقام، و«LA» للعربيّة — والترتيب يفرزهما.
  // و`font-display:block` عمدًا: ما لم يصل خطُّه **لا يُرسَم** بخطٍّ آخر — بياضٌ يُكشَف بالعدّ
  // أهونُ من حرفٍ يخرج بخطّ المتصفّح فيمرّ كأنّه صحيح.
  const faces =
    `@font-face{font-family:"LA";src:url(data:font/woff2;base64,${font.ar}) format("woff2");font-display:block;}`
    + `@font-face{font-family:"ER";src:url(data:font/ttf;base64,${font.lat}) format("truetype");font-display:block;}`;
  const body = pieces
    .map((p) =>
      `<text x="${p.x}" y="${p.y}" font-size="${p.size}" font-weight="${p.weight}" fill="${p.color}"`
      + ` text-anchor="${p.anchor}">${markup(p.text)}</text>`,
    )
    .join("");
  // الورقةُ وشاهدُها: القطعُ نفسها والمِزاتُ نفسها، ولا يفترقان إلّا في الخطّ
  const page_ = (style: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${page.w}" height="${page.h}">`
    + `<defs><style>${style}</style></defs>${body}</svg>`;
  const real = page_(`${faces}text{font-family:"ER","LA";direction:rtl;font-feature-settings:${FEATURES};}`);
  const control = page_(`text{font-family:"${MISSING_FAMILY}";direction:rtl;font-feature-settings:${FEATURES};}`);

  /**
   * **مرجعان يُرسمان مرّةً، وبهما يُحاكَم كلُّ رسمٍ للورقة:**
   * · `refInk` — حبرُ الرسم المباشر على canvas بخطّ الموقع (بلا مدّ): قدرُ ما يُنتظَر من حبر.
   *   فإن نقص المرسوم عنه كثيرًا فسطرٌ لم يظهر (خطُّه لم يصل و`font-display:block` أخفاه).
   * · `fallbackPixels` — الشاهد بخطٍّ لا وجود له: فإن طابقه المرسوم فالورقة كلّها بخطّ المتصفّح.
   * وما عجزنا عن قراءة بكسلاته (متصفّحٌ يمنع) لا نحكم به — نقبل الرسم كما هو ولا نُعطّل الورقة.
   */
  let refInk = 0;
  let fallbackPixels: Uint8ClampedArray | null = null;
  try {
    const ref = scratch(page);
    if (ref) {
      drawOnCanvas(ref, pieces);
      refInk = inkCount(ref.getImageData(0, 0, page.w, page.h).data);
    }
    const c = await rasterize(control, page);
    fallbackPixels = c ? c.getImageData(0, 0, page.w, page.h).data : null;
  } catch {
    refInk = 0;
    fallbackPixels = null;
  }

  for (let tries = RASTER_TRIES; tries > 0; tries--) {
    const drawn = await rasterize(real, page);
    if (!drawn) return null;

    let sound = true; // بلا مرجعٍ لا حكم: نقبل ما رُسم
    try {
      const ink = drawn.getImageData(0, 0, page.w, page.h);
      if (refInk > 0 && inkCount(ink.data) < refInk * INK_FLOOR) sound = false;
      if (fallbackPixels && samePixels(ink.data, fallbackPixels)) sound = false;
    } catch { /* تعذّرت القراءة ⇒ نقبل */ }

    if (sound) return drawn.canvas;
    if (tries > 1) await new Promise((r) => setTimeout(r, RASTER_WAIT));
  }
  return null; // لم يصل الخطّ بعد كلّ المحاولات ⇒ ارتدادٌ إلى canvas (بخطّ الموقع بلا مدّ)
}

/**
 * المسار الأصل: النصّ ممدودًا فوق القالب — تمريرةً لكلّ وزن. وإن أخفق وزنٌ واحد **سقط المسار
 * كلُّه** ولم تُركَّب ورقةٌ نصفُها ممدودٌ ونصفُها لا: الارتدادُ الموحَّد أصدق من خليطٍ يُوهم.
 */
async function drawWithElongation(
  ctx: CanvasRenderingContext2D,
  pieces: Piece[],
  page: PageSize,
  pack: FontPack,
): Promise<boolean> {
  const weights = [...new Set(pieces.map((p) => p.weight))];
  const layers: HTMLCanvasElement[] = [];
  for (const w of weights) {
    const font = pack.find((f) => f.weight === w) ?? pack[0];
    if (!font) return false;
    const layer = await drawLayer(pieces.filter((p) => p.weight === w), page, font);
    if (!layer) return false;
    layers.push(layer);
  }
  for (const layer of layers) ctx.drawImage(layer, 0, 0);
  return true;
}

/**
 * سياقُ رسمٍ جاهز: قالبٌ مرسومٌ في canvas بمقاسه، وسياقٌ يُقاس به قبل بناء القطع.
 * (القياس يسبق التخطيط: عرضُ السطر يُعرف قبل أن يُعرف موضعُه.)
 */
export async function openPaper(template: string, page: PageSize): Promise<CanvasRenderingContext2D> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = page.w;
  canvas.height = page.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر تجهيز الورقة (canvas).");

  const img = await loadTemplate(template);
  if (!img) throw new Error(`قالب الورقة غير موجود (public${template}).`);
  ctx.drawImage(img, 0, 0, page.w, page.h);
  return ctx;
}

/**
 * يرسم القطع على الورقة المفتوحة ويُغلقها Blob.
 *
 * والصيغة تُطلَب: `image/png` للصورة التي تُرسَل وتُعرَض، و`image/jpeg` لِما يُدرَج في PDF
 * (فـPDF يبتلع JPEG بايتًا ببايت، والPNG يوجب إعادة ترميز — انظر `lib/pdf.ts`).
 */
export async function sealPaper(
  ctx: CanvasRenderingContext2D,
  pieces: Piece[],
  page: PageSize,
  type: "image/png" | "image/jpeg" = "image/png",
  quality = 0.94,
): Promise<Blob> {
  const b64 = await loadFontsB64();
  const drawn = b64 ? await drawWithElongation(ctx, pieces, page, b64) : false;
  if (!drawn) drawOnCanvas(ctx, pieces);

  return await new Promise<Blob>((resolve, reject) => {
    ctx.canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("تعذّر توليد صورة الورقة."))),
      type,
      type === "image/jpeg" ? quality : undefined,
    );
  });
}

// التنزيل ليس شأن الورقة — هو في `lib/download.ts` (مصدرٌ واحد يخدم البطاقة والشهادة والخطاب والCSV).
