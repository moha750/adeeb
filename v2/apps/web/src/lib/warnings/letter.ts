/**
 * خطاب الإنذار — يُرسَم ويُنزَّل PNG. عميليّ حصرًا (يمسّ DOM).
 *
 * القالب الذي زوّده المالك (`public/brand/warning-template.png`، 1241×1755) **ورقةٌ رسميّة
 * كاملة**: إطارٌ منقوش وشعارا الجامعة والنادي أعلى، والختمُ وتوقيعا رئيس النادي وقائدة
 * الموارد أسفل — ولا نصّ فيه. فما نرسمه هو **المتن وحده** في بياض الورقة، بحبرٍ أبيض
 * لأنّ أرضيّتها كحليّة.
 *
 * ونصُّ المتن ليس هنا: مصدره `message.ts` — هو نفسه الذي تحمله رسالة واتساب، فلا ينحرف
 * المكتوب عن المُرسَل. وهذا الملفّ **رسّامٌ لا كاتب**.
 *
 * **والحروف ممدودةٌ كسائر الموقع** (`ss06`/`ss07`/`salt`): وcanvas لا يعرف
 * `font-feature-settings`، فيُرسَم النصّ كلّه في **SVG واحد بخطٍّ مضمَّن** يُفعّل المِزات ثمّ
 * تُرسَم صورتُه فوق القالب — نفس حيلة بطاقة التهنئة، معمَّمةً على الخطاب كلّه. وإن تعذّر
 * جلبُ الخطّ ارتددنا إلى رسم canvas المباشر (بلا مدّ) فلا يبقى المستخدم بلا ورقة.
 */
import { fmtDate } from "@/lib/date";
import { greeting, letterParagraphs, salutation, signature, type WarningLetter } from "./message";
import { ordinalBare, ordinalWord } from "./vocab";

/** مقاس الورقة — مطابقٌ للقالب. */
const PAGE = { w: 1241, h: 1755 } as const;

/**
 * حدود بياض الورقة — **مقيسةٌ على بكسلات القالب لا مقدَّرة بالعين** (مسحُ سطورٍ بحثًا عن أوّل
 * حبرٍ فاتح): الشعاران ينتهيان عند y=284، وأوّل حبرٍ للختم عند **y=1357**. فالمتن يسكن ما
 * بينهما، والحدّ الأدنى يترك للنازل من الحروف اثني عشر بكسلًا فلا يلمس الختم.
 */
const BOX = { right: 1085, left: 156, top: 340, bottom: 1345 } as const;
const MAXW = BOX.right - BOX.left;

/**
 * **مكدّس الخطّ كما في الموقع** (`--font-latin`): Eras أوّلًا فتُرسَم به الأرقام واللاتينيّ،
 * ثمّ Lyon Arabic يلتقط ما عجز عنه — أيْ العربيّة كلَّها. فلا رقمٌ يخرج بخطّ النصّ العربيّ.
 * (وهذا هو ترتيبُ الخطوط لا تخصيصٌ لكلّ محرف: المتصفّح يختار لكلّ رمزٍ أوّلَ خطٍّ يملك رسمه.)
 */
const FONT = '"Eras", "Lyon Arabic"';

/**
 * **الاستثناء الوحيد من المكدّس: الفاصل «|»** (قرار المالك) — يُردّ إلى الخطّ العربيّ وحده،
 * لأنّ رسمه في Eras يفارق ما اعتادته الورقة. واستثناءٌ **مسمًّى في موضعٍ واحد** أصدقُ من
 * تخصيصٍ يتناثر: من أراد ردَّ محرفٍ آخر زاده هنا ولا يمسّ الرسم.
 */
const AR_ONLY = /(\|)/;
const INK = "#ffffff";
const INK_SOFT = "rgba(255,255,255,.72)";

/** مِزات المدّ — نفسها المكتوبة على `html` في `globals.css`، فالورقة تُقرأ كالموقع. */
const FEATURES = "'ss06' 1, 'ss07' 1, 'salt' 1";

/** وزنان يكفيان الخطاب: متنٌ متوسّط وعنوانٌ عريض. (الطلب أخفّ، والفرق لا يُرى.) */
const WEIGHTS = { body: 500, bold: 700 } as const;

/** ملفّات التضمين — لكلّ وزنٍ عربيُّه ولاتينيُّه، فالمكدّس داخل SVG كالمكدّس في الموقع. */
const FONT_FILES: { weight: number; ar: string; lat: string }[] = [
  { weight: 500, ar: "/fonts/lyon-arabic-medium.woff2", lat: "/fonts/eras-medium.ttf" },
  { weight: 700, ar: "/fonts/lyon-arabic-bold.woff2", lat: "/fonts/eras-bold.ttf" },
];

const T = {
  title: { size: 62, weight: WEIGHTS.bold, y: BOX.top + 20 },
  date: { size: 25, weight: WEIGHTS.body, y: BOX.top + 90 },
  greet: { size: 29, weight: WEIGHTS.body, y: BOX.top + 152 },
  hail: { size: 35, weight: WEIGHTS.bold, y: BOX.top + 206 },
  // المتن **متوسَّطٌ** (قرار المالك) — والترويسة أعلاه تبقى على اليمين: التاريخُ والتحيّةُ
  // والنداء مُلتصقةٌ بالحافّة كما هي.
  //
  // وبينه وبين سطر النداء **فسحةٌ ظاهرة** (نحو سطرٍ كامل): النداء خطابٌ لصاحبه، والمتن خبرٌ
  // يليه — فلا يلتصق أحدهما بالآخر كأنّهما فقرةٌ واحدة (قرار المالك).
  body: { weight: WEIGHTS.body, y: BOX.top + 300 },
} as const;

/**
 * **مقاسُ المتن يُقاس ولا يُفرَض** (قرار المالك): يكبر حتى يبلغ ما قبل الختم، ويصغر إن طال
 * السبب — فالمعيار المساحةُ لا رقمٌ محفور. نجرّب من الأكبر إلى الأصغر ونأخذ **أوّل ما يسع**.
 *
 * والتباعدُ نسبةٌ من المقاس لا قيمةٌ مستقلّة، فيكبران ويصغران معًا ولا ينفكّ أحدهما عن الآخر.
 */
const SIZE_MAX = 52;
const SIZE_MIN = 18;
const leadFor = (size: number): number => Math.round(size * 1.72);
const gapFor = (size: number): number => Math.round(size * 0.45);

/** قطعةُ نصٍّ مرسومة — تُبنى مرّةً، ثمّ تُرسَم بمسار SVG (ممدودة) أو بمسار canvas (ارتدادًا). */
type Piece = {
  text: string;
  x: number;
  y: number;
  size: number;
  weight: number;
  color: string;
  /** `start` = ملتصقٌ بالحافّة اليمنى (اتّجاهنا rtl) · `middle` = متوسَّط. */
  anchor: "start" | "middle";
};

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load(`${WEIGHTS.bold} 62px ${FONT}`),
      document.fonts.load(`${WEIGHTS.body} 32px ${FONT}`),
    ]);
    await document.fonts.ready;
  } catch { /* غياب واجهة الخطوط لا يوقف الرسم */ }
}

function loadTemplate(src: string): Promise<HTMLImageElement | null> {
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

/** SVG (بمحارف عربيّة) → data URL بترميز UTF-8 سليم (btoa يقبل Latin1 وحده). */
function svgToDataUrl(svg: string): string {
  const utf8 = new TextEncoder().encode(svg);
  let bin = "";
  for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
  return "data:image/svg+xml;base64," + btoa(bin);
}

/* ── القياس ──────────────────────────────────────────────────────────────
   canvas يقيس الحروف **غير ممدودة** فيخرج أضيق من المرسوم، فتطفح السطور عن عرض البياض.
   فنقيس مرّةً نسبةَ «الممدود ÷ المقيس» على عيّنةٍ من النصّ نفسه عبر عنصر SVG خفيّ في DOM
   (يرث خطّ الموقع ومِزاته)، ثمّ نضيّق حدَّ اللفّ بها. قياسٌ واحدٌ لا ألفُ قياس. */

function elongationRatio(ctx: CanvasRenderingContext2D, sample: string, size: number, weight: number): number {
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

/** لفُّ الفقرة على عرض البياض — قياسٌ بالكلمة، فالعربيّة لا تُقصّ في وسط الكلمة. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

/** المسار الأصل: SVG واحدٌ بخطٍّ مضمَّن ومِزات المدّ، يُرسَم فوق القالب دفعةً واحدة. */
async function drawWithElongation(
  ctx: CanvasRenderingContext2D,
  pieces: Piece[],
  pack: FontPack,
): Promise<boolean> {
  // عائلتان في SVG كما في الموقع: «ER» للاتينيّ والأرقام، و«LA» للعربيّة — والترتيب يفرزهما
  const faces = pack
    .map((f) =>
      `@font-face{font-family:"LA";src:url(data:font/woff2;base64,${f.ar}) format("woff2");font-weight:${f.weight};}`
      + `@font-face{font-family:"ER";src:url(data:font/ttf;base64,${f.lat}) format("truetype");font-weight:${f.weight};}`,
    )
    .join("");
  const body = pieces
    .map((p) =>
      `<text x="${p.x}" y="${p.y}" font-size="${p.size}" font-weight="${p.weight}" fill="${p.color}"`
      + ` text-anchor="${p.anchor}">${markup(p.text)}</text>`,
    )
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE.w}" height="${PAGE.h}">`
    + `<defs><style>${faces}`
    + `text{font-family:"ER","LA";direction:rtl;font-feature-settings:${FEATURES};}`
    + `</style></defs>${body}</svg>`;

  const img = new Image();
  img.src = svgToDataUrl(svg);
  try {
    await img.decode();
    ctx.drawImage(img, 0, 0);
    return true;
  } catch {
    return false;
  }
}

/** يبني خطاب الإنذار ويعيده Blob بصيغة PNG. */
export async function renderWarningLetter(l: WarningLetter): Promise<Blob> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = PAGE.w;
  canvas.height = PAGE.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر تجهيز الخطاب (canvas).");

  const template = await loadTemplate("/brand/warning-template.png");
  if (!template) throw new Error("قالب الخطاب غير موجود (public/brand/warning-template.png).");
  ctx.drawImage(template, 0, 0, PAGE.w, PAGE.h);

  const center = (BOX.left + BOX.right) / 2;
  const paragraphs = [...letterParagraphs(l), signature];

  // حدُّ اللفّ مضيَّقٌ بنسبة المدّ — فما يُقاس ضيّقًا يُرسَم ممدودًا ولا يطفح
  const ratio = elongationRatio(ctx, paragraphs[0], 32, T.body.weight);
  const limit = MAXW / ratio;

  /**
   * تخطيطُ المتن بمقاسٍ ما: أسطرُه ملفوفةً (والفارغُ فاصلُ فقرة)، و**المدى من أوّل قاعدةِ سطرٍ
   * إلى آخرها** — لا مجموعَ الارتفاعات. الفرق سطرٌ كامل: ما بعد آخر سطرٍ لا يُحجَز له شيء.
   */
  const layout = (s: number): { lines: string[]; span: number } => {
    ctx.font = `${T.body.weight} ${s}px ${FONT}`;
    const out: string[] = [];
    for (const p of paragraphs) out.push(...wrap(ctx, p, limit), "");
    out.pop();
    const lead = leadFor(s);
    const gap = gapFor(s);
    const span = out.slice(0, -1).reduce((h, ln) => h + (ln ? lead : gap), 0);
    return { lines: out, span };
  };

  // أوّلُ مقاسٍ يسع ما بين مبدأ المتن وحدّ الختم — من الأكبر نزولًا. والأصغرُ ملاذٌ أخير.
  const AVAILABLE = BOX.bottom - T.body.y;
  let size = SIZE_MIN;
  let plan = layout(size);
  for (let s = SIZE_MAX; s >= SIZE_MIN; s--) {
    const p = layout(s);
    if (p.span <= AVAILABLE) { size = s; plan = p; break; }
  }

  const lead = leadFor(size);
  const gap = gapFor(size);

  /**
   * **الفراغُ الباقي يُوزَّع لا يُترَك.** المقاس يقفز درجاتٍ خشنة (نقصانُ بكسلٍ واحد قد يطوي
   * سطرًا كاملًا)، فيبقى تحت المتن فراغٌ لا يبلغ الختم. فيُبسَط ما بقي على **فراغات الفقرات**
   * — وهي مساحةُ التنفّس، بخلاف ما بين سطور الفقرة الواحدة الذي يُشوّهه التمديد.
   * (وإن كانت فقرةً واحدة بلا فراغات، وُزّع على السطور.)
   */
  const gapCount = plan.lines.filter((ln) => !ln).length;
  const slack = Math.max(0, AVAILABLE - plan.span);
  // وسقفٌ للتوسعة: فراغُ الفقرة لا يتجاوز سطرًا كاملًا مهما بقي (نصٌّ قصيرٌ جدًّا لا يُبعثَر)
  const gapPlus = gapCount > 0 ? Math.min(slack / gapCount, lead) : 0;
  const leadPlus = gapCount === 0 && plan.lines.length > 1 ? slack / (plan.lines.length - 1) : 0;

  // الترويسة على اليمين، والمتن متوسَّط — وكلّها قطعٌ تُرسَم بمسارٍ واحد
  const pieces: Piece[] = [
    { text: `إنذار ${ordinalBare(l.ordinal)}`, x: center, y: T.title.y, size: T.title.size, weight: T.title.weight, color: INK, anchor: "middle" },
    { text: `التاريخ: ${fmtDate(l.issuedAt)}`, x: BOX.right, y: T.date.y, size: T.date.size, weight: T.date.weight, color: INK_SOFT, anchor: "start" },
    // التحيّة ثمّ النداء — ترتيبُ البوست القديم نفسه، ولكلٍّ سطرُه
    { text: greeting, x: BOX.right, y: T.greet.y, size: T.greet.size, weight: T.greet.weight, color: INK, anchor: "start" },
    { text: salutation(l), x: BOX.right, y: T.hail.y, size: T.hail.size, weight: T.hail.weight, color: INK, anchor: "start" },
  ];

  let y = T.body.y;
  for (const ln of plan.lines) {
    // سطر التوقيع أعرضُ من المتن — يُقرأ خاتمةً لا فقرةً سادسة
    if (ln) {
      pieces.push({
        text: ln, x: center, y, size,
        weight: ln === signature ? WEIGHTS.bold : T.body.weight,
        color: INK, anchor: "middle",
      });
    }
    y += ln ? lead + leadPlus : gap + gapPlus;
  }

  const b64 = await loadFontsB64();
  const drawn = b64 ? await drawWithElongation(ctx, pieces, b64) : false;
  if (!drawn) drawOnCanvas(ctx, pieces);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذّر توليد صورة الخطاب."))), "image/png");
  });
}

/** يولّد الخطاب ويُنزّله ملفَّ PNG باسم صاحبه ورتبة إنذاره. */
export async function downloadWarningLetter(l: WarningLetter): Promise<void> {
  const blob = await renderWarningLetter(l);
  const safe = l.name.replace(/[\\/:*?"<>|]/g, "").trim() || "عضو";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `إنذار-${safe}-${ordinalWord(l.ordinal)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
