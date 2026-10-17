/**
 * **بطاقةُ عِرفان** — رسالةُ شكرٍ من عضوٍ إلى قائدٍ في أدِيب، تُرسَم صورةً فيحفظها صاحبُها أو
 * ينشرها في قصّته إن شاء. عميليّةٌ حصرًا (تمسّ DOM).
 *
 * **ولماذا رسّامُ الأوراق (`lib/paper`)؟** للعلّة نفسِها في بطاقة نتيجة الانتخاب: حروفُنا ممدودة
 * وcanvas لا يعرف مِزات الخطّ، فالرسّامُ يحلّها مرّةً للشهادة والخطاب والبطاقتين. والصورةُ التي
 * تُعرَض في البوّابة هي نفسُها التي تُحفَظ: رسّامٌ واحدٌ للعرض والتنزيل، فلا تفترقان.
 *
 * **ومقاسُها ٤:٥** (1080×1350): يُعرَض كاملًا في المنشور والقصّة وواتساب، ويتّسع لرسالةٍ من
 * عشرة أسطر لا يتّسع لها المربّع.
 *
 * **ووجهان معروضان على المالك** في `/ui/irfan` (٢٠٢٦-١٠-١٧): «رسالة» ورقةٌ فاتحة بخطٍّ أيمن
 * كالخطاب، و«شفق» تدرّجُ الهوية بنصٍّ متوسَّطٍ كبطاقة النتيجة. يختار أحدَهما فيُحذف الآخر.
 *
 * **ولا شعارَ فيها ولا تاريخ** (المالك ٢٠٢٦-١٠-١٧: «لا تجعل مكانًا للشعار، وكذلك التاريخ»): البطاقةُ
 * كلامُ شخصٍ لشخص، لا وثيقةٌ تصدرها جهة.
 */
import { shareOrDownloadBlob, type SaveResult } from "@/lib/download";
import {
  openBlank, sealPaper, fitSize, elongationRatio, loadTemplate, svgToDataUrl, wrap, FONT, WEIGHTS,
  type PageSize, type Piece,
} from "@/lib/paper";

export type IrfanCard = {
  /** المستلم باسمه كما كان يوم الإرسال. */
  to: string;
  /** مقعدُه كاملًا يوم الإرسال: «قائدة لجنة الإعلام». */
  seat: string;
  /** المرسل باسمه. */
  from: string;
  /** الرسالة كما كتبها (قد تحمل أسطرًا). */
  body: string;
  /** اسمُ الموسم: «اليوم العالمي للمدير». */
  season: string;
};

export type IrfanLook = "letter" | "aurora";

const CARD: PageSize = { w: 1080, h: 1350 };

/** ألوانُ الهوية مقروءةً من `tokens.css`، والارتدادُ نصُّها هناك (لا لونَ مخترَع). */
function tokens() {
  const cs = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const v = (name: string, fb: string) => cs?.getPropertyValue(name).trim() || fb;
  return {
    steel50: v("--steel-50", "#eef3f8"),
    steel100: v("--steel-100", "#dce5ef"),
    steel200: v("--steel-200", "#bccfe0"),
    steel300: v("--steel-300", "#92aac3"),
    steel400: v("--steel-400", "#5e88ab"),
    steel600: v("--steel-600", "#335c81"),
    navy800: v("--navy-800", "#1e3350"),
    surface: v("--color-surface", "#ffffff"),
  };
}

/** ذهبُ القصّة — مستعارٌ بمصدره كما في بطاقة النتيجة (`--st-accent` في `_story/story.css`). */
const GOLD = "196, 154, 60";

/** صورةٌ متّجهةٌ تُنقَش بمقاسها النهائيّ — العلّةُ مشروحةٌ في `lib/elections/resultCard.ts`. */
async function loadVectorAt(src: string, w: number, h: number): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`svg ${res.status}`);
    const svg = (await res.text()).replace(
      /<svg\b([^>]*)>/,
      (_m, attrs: string) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "")} width="${Math.round(w)}" height="${Math.round(h)}">`,
    );
    return await loadTemplate(svgToDataUrl(svg));
  } catch {
    return await loadTemplate(src);
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(CARD.w / img.width, CARD.h / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (CARD.w - w) / 2, (CARD.h - h) / 2, w, h);
}

/* ── هندسةُ الوجهين ─────────────────────────────────────────────────────── */

type Geo = {
  /** محورُ النصّ: الحافّةُ اليمنى للرسالة (‏start)، أو الوسط للشفق (‏middle). */
  x: number;
  anchor: "start" | "middle";
  maxw: number;
  season: number;
  title: number;
  to: number;
  seat: number;
  bodyTop: number;
  bodyBottom: number;
  sign: number;
  from: number;
};

const GEO: Record<IrfanLook, Geo> = {
  // الرسالة: هامشٌ أيمن كالخطاب، والشعارُ في القاع بعد التوقيع
  letter: {
    x: CARD.w - 132, anchor: "start", maxw: CARD.w - 264,
    season: 196, title: 0, to: 300, seat: 360,
    bodyTop: 470, bodyBottom: 1050, sign: 1130, from: 1192,
  },
  // الشفق: كلُّ شيءٍ متوسَّط
  aurora: {
    x: CARD.w / 2, anchor: "middle", maxw: 840,
    season: 170, title: 268, to: 392, seat: 452,
    bodyTop: 540, bodyBottom: 1080, sign: 1176, from: 1240,
  },
};

const INK = {
  letter: (t: ReturnType<typeof tokens>) => ({ strong: t.navy800, soft: t.steel600, faint: t.steel400 }),
  aurora: () => ({ strong: "#ffffff", soft: "rgba(255,255,255,.88)", faint: "rgba(255,255,255,.62)" }),
} as const;

async function paintLetter(ctx: CanvasRenderingContext2D, t: ReturnType<typeof tokens>) {
  ctx.fillStyle = t.steel50;
  ctx.fillRect(0, 0, CARD.w, CARD.h);
  // ورقةٌ بيضاءُ داخل هامشٍ فولاذيّ خفيف، وزاويتُها من منحنى العلامة
  const m = 56;
  ctx.fillStyle = t.surface;
  ctx.beginPath();
  ctx.roundRect(m, m, CARD.w - m * 2, CARD.h - m * 2, 32);
  ctx.fill();
  ctx.strokeStyle = t.steel200;
  ctx.lineWidth = 3;
  ctx.stroke();

  // علامةُ الاقتباس الكبيرة في الركن المقابل لبداية السطر — صوتُ كاتبٍ لا بيانُ جهة، ولا تزاحم النصّ
  ctx.save();
  ctx.fillStyle = t.steel100;
  ctx.font = `${WEIGHTS.bold} 360px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("“", 120, 400);
  ctx.restore();

  // خيطٌ ذهبيٌّ رفيعٌ تحت التوقيع يختم الرسالة
  ctx.fillStyle = `rgba(${GOLD}, .8)`;
  ctx.fillRect(CARD.w - 132 - 120, 1222, 120, 3);
}

async function paintAurora(ctx: CanvasRenderingContext2D, t: ReturnType<typeof tokens>) {
  const grad = ctx.createLinearGradient(0, 0, CARD.w, CARD.h);
  grad.addColorStop(0, t.steel400);
  grad.addColorStop(1, t.navy800);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD.w, CARD.h);
  ctx.imageSmoothingQuality = "high";

  const pattern = await loadVectorAt("/brand/pattern-white.svg", CARD.h * (1920 / 287), CARD.h);
  if (pattern) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    drawCover(ctx, pattern);
    ctx.restore();
  }

  // خيطٌ ذهبيٌّ تحت الكلمة، وآخرُ خافتٌ قبل التوقيع
  ctx.fillStyle = `rgba(${GOLD}, .95)`;
  ctx.fillRect(CARD.w / 2 - 60, 300, 120, 4);
  ctx.fillStyle = "rgba(255,255,255,.24)";
  ctx.fillRect(CARD.w / 2 - 80, 1124, 160, 2);
}

/**
 * **لفُّ الرسالة بأكبر مقاسٍ يسعها**: ينزل المقاسُ حتّى تقع الأسطرُ كلُّها بين حدّيها. والقياسُ
 * مضيَّقٌ بنسبة المدّ (canvas يقيس الحرفَ غيرَ ممدود)، والأسطرُ الفارغةُ التي كتبها صاحبُها تبقى.
 */
function layoutBody(ctx: CanvasRenderingContext2D, body: string, g: Geo) {
  const room = g.bodyBottom - g.bodyTop;
  const paras = body.trim().split(/\n+/).map((p) => p.trim()).filter(Boolean);
  for (let size = 56; size >= 28; size -= 2) {
    const lead = Math.round(size * (size > 46 ? 1.6 : 1.75));
    ctx.font = `${WEIGHTS.body} ${size}px ${FONT}`;
    const ratio = elongationRatio(ctx, paras.join(" ").slice(0, 80), size, WEIGHTS.body);
    const lines = paras.flatMap((p) => wrap(ctx, p, g.maxw / ratio));
    if (lines.length * lead <= room || size === 28) return { size, lead, lines };
  }
  return { size: 28, lead: 49, lines: [] as string[] };
}

export async function renderIrfanCard(c: IrfanCard, look: IrfanLook = "letter"): Promise<Blob> {
  const ctx = await openBlank(CARD);
  const t = tokens();
  const g = GEO[look];
  const ink = look === "letter" ? INK.letter(t) : INK.aurora();
  await (look === "letter" ? paintLetter(ctx, t) : paintAurora(ctx, t));

  const line = (text: string, y: number, size: number, weight: number, color: string, min = 24): Piece => ({
    text,
    x: g.x,
    y,
    size: fitSize(ctx, text, g.maxw / elongationRatio(ctx, text, size, weight), size, weight, min),
    weight,
    color,
    anchor: g.anchor,
  });

  const pieces: Piece[] = [];
  if (look === "aurora") {
    pieces.push(line(c.season, g.season, 32, WEIGHTS.body, ink.faint));
    pieces.push(line("عِرفان", g.title, 84, WEIGHTS.bold, ink.strong));
  } else {
    pieces.push(line(`عِرفان، ${c.season}`, g.season, 32, WEIGHTS.body, ink.faint));
  }
  pieces.push(line(`إلى ${c.to.trim()}`, g.to, 64, WEIGHTS.bold, ink.strong, 36));
  if (c.seat.trim()) pieces.push(line(c.seat.trim(), g.seat, 36, WEIGHTS.body, ink.soft));

  const b = layoutBody(ctx, c.body, g);
  // الرسالةُ متوسَّطةٌ عموديًّا في حيّزها: قصيرُها لا يترك خلاءً تحته
  const used = b.lines.length * b.lead;
  const top = g.bodyTop + Math.max(0, (g.bodyBottom - g.bodyTop - used) / 2) + b.size;
  b.lines.forEach((text, i) => {
    pieces.push({ text, x: g.x, y: top + i * b.lead, size: b.size, weight: WEIGHTS.body, color: ink.strong, anchor: g.anchor });
  });

  pieces.push(line("بامتنان،", g.sign, 34, WEIGHTS.body, ink.soft));
  pieces.push(line(c.from.trim(), g.from, 46, WEIGHTS.bold, ink.strong, 30));

  return await sealPaper(ctx, pieces, CARD);
}

/* ── صورةُ المعاينة في واتساب ─────────────────────────────────────────────
   واتساب يعرض صورةَ الرابط كبيرةً حين تكون عريضةً (‏1200×630، نسبةُ Open Graph)، وصغيرةً في ركنٍ حين
   تكون قائمة. فالمعاينةُ لوحٌ عريضٌ بأرض التصميم نفسِه، والبطاقةُ قائمةٌ في وسطه بارتفاعه. وهي JPEG
   خفيف: واتساب يُسقط المعاينةَ إن ثقلت صورتُها. */
const OG: PageSize = { w: 1200, h: 630 };

export async function renderIrfanPreview(c: IrfanCard, look: IrfanLook = "letter"): Promise<Blob> {
  const card = await renderIrfanCard(c, look);
  const img = await loadTemplate(URL.createObjectURL(card));
  const canvas = document.createElement("canvas");
  canvas.width = OG.w;
  canvas.height = OG.h;
  const ctx = canvas.getContext("2d");
  if (!ctx || !img) throw new Error("تعذّر رسم معاينة البطاقة.");
  const t = tokens();
  if (look === "aurora") {
    const grad = ctx.createLinearGradient(0, 0, OG.w, OG.h);
    grad.addColorStop(0, t.steel600);
    grad.addColorStop(1, t.navy800);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = t.steel100;
  }
  ctx.fillRect(0, 0, OG.w, OG.h);
  const h = OG.h - 48;
  const w = (CARD.w / CARD.h) * h;
  ctx.save();
  ctx.shadowColor = "rgba(14, 24, 38, .28)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.drawImage(img, (OG.w - w) / 2, 24, w, h);
  ctx.restore();
  URL.revokeObjectURL(img.src);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذّر رسم معاينة البطاقة."))), "image/jpeg", 0.86);
  });
}

export const irfanFileName = (c: IrfanCard): string => `عرفان إلى ${c.to}`.trim() + ".png";

/** يحفظها: ورقةُ المشاركة في الجوّال (فتذهب إلى القصّة أو الاستوديو)، وتنزيلٌ في الحاسب. */
export async function saveIrfanCard(c: IrfanCard, look: IrfanLook = "letter"): Promise<SaveResult> {
  return await shareOrDownloadBlob(await renderIrfanCard(c, look), irfanFileName(c), "عرفان.png");
}
