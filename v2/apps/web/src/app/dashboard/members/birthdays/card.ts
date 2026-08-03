// مولّد «تصميم التهنئة» — يُرسَم على canvas ويُنزَّل PNG. يُستدعى في العميل وحده (يمسّ DOM).
//
// الأصل الذي زوّده المالك تصميمٌ **رماديّ كامل** (نادي أديب · «عيد ميلاد سعيد» · كيك · زينة) مقاس 1080×1920.
// «تلوين حسب العضو» = **duotone** (بطاقةٌ فاتحة بحبرٍ ملوّن — اعتمده المالك): إسقاط تدرّج الرماديّ على مِحور
// لونيٍّ من حبرٍ غامق (L=0) بدرجة العضو إلى ورقٍ فاتح (L=1، l0.92) — فيتلوّن التصميم كلّه محفوظًا تباينه.
// null (٦٣ عضوًا) ⇒ درجة العلامة الكحليّة من الرموز. الأسود/الأبيض (s<0.08) ⇒ رماديّ محايد.
//
// القالب في: apps/web/public/brand/birthday-template.png (مضبوط الآن). لتبديله لاحقًا استبدل الملفّ نفسه.
// اسم العضو يُرسَم (DRAW_NAME=true) بحبر التصميم الغامق (يقرأ على البطاقة الفاتحة)، موضعه/حجمه في ثابت NAME.

import { downloadBlob } from "@/lib/download";

const TEMPLATE_SRC = "/brand/birthday-template.png";
const LOGO_SRC = "/brand/logo-horizontal-white.svg";
const PATTERN_SRC = "/brand/pattern-white.svg";

/** مقاس البطاقة — مطابق للقالب (1080×1920، قصّة 9:16). */
const CARD = { w: 1080, h: 1920 } as const;

/** رسمُ اسم العضو في «فراغ الاسم»: أسفل «كل عام وانت طيب» وفوق الكيك (حيث الدائرة المائيّة الفاتحة). */
const DRAW_NAME = true;
const NAME = { cx: 540, y: 1150, maxW: 760, size: 100, weight: 800, minSize: 95 } as const;

const FONT = "Lyon Arabic";

/* ── لون: hex ⇄ HSL/RGB ─────────────────────────────────────────────── */

function parseHex(hex: string | null | undefined): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0, hh = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hh = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh /= 6;
  }
  return [hh * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(hue(h + 1 / 3) * 255), Math.round(hue(h) * 255), Math.round(hue(h - 1 / 3) * 255)];
}

function hslToCss(h: number, s: number, l: number): string {
  return `hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(Math.max(0, Math.min(1, l)) * 100).toFixed(1)}%)`;
}

/**
 * طرفا مِحور الـduotone (ظلّ غامق ↔ فاتح) بدرجة اللون المفضّل. اللون قليل التشبّع (أسود/أبيض/رماديّ)
 * يُعامَل محايدًا (بطاقة رماديّة أنيقة)، وإلّا يُلوَّن بهُويّته. الفاتح يبقى فاتحًا فتُحفَظ خفّة التصميم.
 */
function duotone(color: string | null): { sh: [number, number, number]; hi: [number, number, number] } {
  const rgb = parseHex(color) ?? parseHex(brandHex());
  if (!rgb) return { sh: [38, 55, 82], hi: [225, 231, 240] }; // احتياط أخير: كحليّ محفور
  const [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const chroma = s >= 0.08;
  // بطاقةٌ فاتحة بحبرٍ ملوّن (اعتمده المالك): حبرٌ أوفى لزهو المفضّل — تشبّع أعلى (0.55–0.98)، وإضاءةٌ
  // **تتبع** المفضّل ضمن مدًى أفتح [0.31–0.40] بدل ثابت 0.27. المحايد (s<0.08) ⇒ بطاقةٌ رماديّة أنيقة.
  const S = chroma ? Math.min(0.98, Math.max(0.55, s)) : 0;
  const lInk = chroma ? Math.min(0.40, Math.max(0.31, l * 0.6)) : 0.30;
  return { sh: hslToRgb(h, S, lInk), hi: hslToRgb(h, chroma ? Math.min(0.55, S * 0.42) : 0, 0.92) };
}

/** لون العلامة (كحليّ) من رموز الهوية — لدرجة الارتداد عند غياب اللون المفضّل. */
function brandHex(): string {
  const v = typeof document !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue("--navy-700").trim()
    : "";
  return v || "#274060";
}

/** لونا تدرّج الخلفيّة (فاتح→غامق) للبطاقة البديلة (حين يغيب القالب). */
function brandStops(): [string, string] {
  const cs = getComputedStyle(document.documentElement);
  return [cs.getPropertyValue("--steel-400").trim() || "#5e88ab", cs.getPropertyValue("--navy-800").trim() || "#1e3350"];
}

/* ── تحميل الأصول مرّةً ─────────────────────────────────────────────── */

const imgCache = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(src: string): Promise<HTMLImageElement | null> {
  let p = imgCache.get(src);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imgCache.set(src, p);
  }
  return p;
}

/** رسم صورة تغطيةً (object-fit: cover) في مستطيل البطاقة. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(CARD.w / img.width, CARD.h / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, (CARD.w - w) / 2, (CARD.h - h) / 2, w, h);
}

/** تلوين التصميم الرماديّ بدرجة اللون المفضّل — إسقاط الإضاءة على مِحور duotone (يحفظ الشفافيّة). */
function applyDuotone(ctx: CanvasRenderingContext2D, color: string | null) {
  const { sh, hi } = duotone(color);
  const img = ctx.getImageData(0, 0, CARD.w, CARD.h); // نفس الأصل (‎/brand‎) فلا تلطّخ CORS
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const L = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    d[i] = sh[0] + (hi[0] - sh[0]) * L;
    d[i + 1] = sh[1] + (hi[1] - sh[1]) * L;
    d[i + 2] = sh[2] + (hi[2] - sh[2]) * L;
    // القناة d[i+3] (ألفا) تبقى كما هي
  }
  ctx.putImageData(img, 0, 0);
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load(`900 120px "${FONT}"`),
      document.fonts.load(`${NAME.weight} ${NAME.size}px "${FONT}"`),
    ]);
    await document.fonts.ready;
  } catch { /* غياب واجهة الخطوط لا يوقف الرسم */ }
}

/** بديلٌ بالهوية إن غاب القالب — تدرّج + نقش + شعار + عبارة، ملوّنٌ بدرجة اللون المفضّل. */
async function drawFallback(ctx: CanvasRenderingContext2D, color: string | null) {
  const [top, bottom] = brandStops();
  const grad = ctx.createLinearGradient(0, 0, CARD.w, CARD.h);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD.w, CARD.h);
  // إن كان للعضو لونٌ مفضّل، اصبغ التدرّج بدرجته
  if (parseHex(color)) {
    const rgb = parseHex(color)!;
    const [h] = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const g2 = ctx.createLinearGradient(0, 0, CARD.w, CARD.h);
    g2.addColorStop(0, hslToCss(h, 0.5, 0.42));
    g2.addColorStop(1, hslToCss(h, 0.6, 0.2));
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, CARD.w, CARD.h);
  }
  const pattern = await loadImage(PATTERN_SRC);
  if (pattern) { ctx.save(); ctx.globalAlpha = 0.08; drawCover(ctx, pattern); ctx.restore(); }
  const logo = await loadImage(LOGO_SRC);
  if (logo) { const w = 320, hh = (logo.height / logo.width) * w; ctx.drawImage(logo, (CARD.w - w) / 2, 220, w, hh); }
  ctx.save();
  ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#ffffff";
  ctx.font = `900 120px "${FONT}"`;
  ctx.fillText("عيد ميلاد سعيد", CARD.w / 2, CARD.h * 0.42);
  ctx.restore();
}

/* ── مدّ الحرف الأخير (ss06) ─────────────────────────────────────────────
   Lyon Arabic فيه مجموعة الأنماط ss06 التي تمدّ نهايات الحروف (كالموقع). لكنّ canvas
   لا يملك font-feature-settings، فنرسم الاسم عبر SVG بخطٍّ **مضمّن base64** يُفعّل ss06،
   ثمّ نرسم صورته على البطاقة. الـSVG مكتفٍ ذاتيًّا (بلا مورد خارجيّ) فلا يلوّث canvas —
   والتنزيل يبقى ممكنًا (مثبَت تجريبيًّا). */
// مِزات النهايات الممدودة في Lyon Arabic — مصدرٌ واحد يخدم القياس والرسم معًا:
// ss06 = مدّ آخر الحروف · ss07 = الكاف الممدودة. (زِد المجموعة هنا فتتبعها الطبقتان.)
const NAME_FEATURES = "'ss06' 1, 'ss07' 1";
const NAME_FONT_URL = "/fonts/lyon-arabic-bold.woff2"; // نُسخة للتضمين (نفس خطّ الموقع، وزن 700)
let nameFontB64: Promise<string> | null = null;
function loadNameFontB64(): Promise<string> {
  if (!nameFontB64) {
    nameFontB64 = fetch(NAME_FONT_URL)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("font 404"))))
      .then((buf) => {
        const bytes = new Uint8Array(buf);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      })
      .catch(() => ""); // يتعذّر ⇒ ارتداد لرسم canvas بلا مدّ
  }
  return nameFontB64;
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** SVG (بمحارف عربيّة) → data URL بترميز UTF-8 سليم (btoa يقبل Latin1 وحده). */
function svgToDataUrl(svg: string): string {
  const utf8 = new TextEncoder().encode(svg);
  let bin = "";
  for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
  return "data:image/svg+xml;base64," + btoa(bin);
}

/** الحجم الملائم — يُقاس بعرض ss06 **الحقيقيّ** في DOM (canvas يجهل المِزة فيقيس أضيق). */
function fitNameSize(name: string): number {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg") as SVGSVGElement;
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;left:-9999px;top:-9999px;visibility:hidden";
  const text = document.createElementNS(NS, "text") as SVGTextElement;
  text.setAttribute("font-family", FONT);
  text.setAttribute("font-weight", String(NAME.weight));
  text.setAttribute("direction", "rtl");
  text.setAttribute("style", `font-feature-settings:${NAME_FEATURES}`);
  text.textContent = name;
  svg.appendChild(text);
  document.body.appendChild(svg);
  let size = NAME.size;
  text.setAttribute("font-size", String(size));
  while (size > NAME.minSize && text.getComputedTextLength() > NAME.maxW) {
    size -= 2;
    text.setAttribute("font-size", String(size));
  }
  document.body.removeChild(svg);
  return size;
}

/**
 * رسم اسم العضو بمدّ النهايات (ss06). `color` لون الحبر و`halo` نوع الظلّ:
 * على القالب (فاتح) حبرٌ غامق بهالةٍ فاتحة فيقرأ كأنّه من التصميم؛ وعلى البديل (غامق) أبيض بظلٍّ غامق.
 * المسار عبر SVG بخطٍّ مضمّن، وله ارتدادٌ إلى رسم canvas (بلا مدّ) إن تعذّر الخطّ.
 */
async function drawName(ctx: CanvasRenderingContext2D, name: string, color: string, halo: boolean) {
  const size = fitNameSize(name);
  ctx.save();
  ctx.shadowColor = halo ? "rgba(255,255,255,.75)" : "rgba(0,0,0,.35)";
  ctx.shadowBlur = halo ? 10 : 14;
  if (!halo) ctx.shadowOffsetY = 2;

  const b64 = await loadNameFontB64();
  if (b64) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD.w}" height="${CARD.h}">`
      + `<defs><style>@font-face{font-family:"LC";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${NAME.weight};}</style></defs>`
      + `<text x="${NAME.cx}" y="${NAME.y}" text-anchor="middle" direction="rtl" font-family="LC" font-weight="${NAME.weight}" font-size="${size}" fill="${color}" style="font-feature-settings:${NAME_FEATURES}">${escapeXml(name)}</text>`
      + `</svg>`;
    const img = new Image();
    img.src = svgToDataUrl(svg);
    try {
      await img.decode();
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      return;
    } catch { /* فشل الفكّ ⇒ ارتداد canvas أدناه */ }
  }

  // ارتداد: رسم canvas مباشر (بلا مدّ) — يقع فقط لو تعذّر جلب الخطّ أو فكّه
  ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = `${NAME.weight} ${size}px "${FONT}"`;
  ctx.fillStyle = color;
  ctx.fillText(name, NAME.cx, NAME.y);
  ctx.restore();
}

/** يبني بطاقة التهنئة ويعيدها Blob بصيغة PNG. */
export async function renderBirthdayCard(row: { name: string; favoriteColor: string | null }): Promise<Blob> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = CARD.w;
  canvas.height = CARD.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر تجهيز البطاقة (canvas).");

  const template = await loadImage(TEMPLATE_SRC);
  if (template) {
    ctx.fillStyle = "#ffffff";                    // أساسٌ أبيض فلا تبقى ثقوب شفّافة
    ctx.fillRect(0, 0, CARD.w, CARD.h);
    drawCover(ctx, template);
    applyDuotone(ctx, row.favoriteColor);         // ← تلوين التصميم بدرجة العضو (بطاقة فاتحة بحبرٍ ملوّن)
    if (DRAW_NAME) {
      const { sh } = duotone(row.favoriteColor);  // الاسم بحبر التصميم الغامق (يقرأ على البطاقة الفاتحة)
      await drawName(ctx, row.name, `rgb(${sh[0]}, ${sh[1]}, ${sh[2]})`, true);
    }
  } else {
    await drawFallback(ctx, row.favoriteColor);   // القالب مفقود ⇒ بطاقة الهوية البديلة
    if (DRAW_NAME) await drawName(ctx, row.name, "#ffffff", false); // بطاقة غامقة ⇒ اسم أبيض
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذّر توليد صورة البطاقة."))), "image/png");
  });
}

/** يولّد البطاقة ويُنزّلها ملفَّ PNG باسم العضو. */
export async function downloadBirthdayCard(row: { name: string; favoriteColor: string | null }): Promise<void> {
  const blob = await renderBirthdayCard(row);
  downloadBlob(blob, `تهنئة-${row.name.trim() || "عضو"}.png`);
}
