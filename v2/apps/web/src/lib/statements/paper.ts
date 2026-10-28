/**
 * **ورقةُ البيان** (٢٠٢٦-١٠-٢٣) — البيانُ الرسميّ على قالب أدِيب: عنوانٌ بين خطّين (سطرٌ إلى ثلاثة)، ومتنٌ
 * من فقراتٍ وبنودٍ مرقّمة، وتوقيعُ رئيس أدِيب أو الرئيس التنفيذيّ أو كليهما، والختم. صفحةٌ أو صفحات، ولكلّ
 * صفحةٍ رقمُها حين تتعدّد. عميليّ حصرًا (يمسّ DOM).
 *
 * **الرسمُ ليس هنا**: `lib/paper.ts` يرسم الحرف (الخطّ المضمَّن ومِزات المدّ وسباقُ الخطّ). وهذا الملفّ
 * تخطيطٌ: ماذا يُكتب وأين، وكيف يُوزَّع على الصفحات.
 *
 * **والمقاساتُ مقيسةٌ على بكسلات القالب** (`public/templates/statement.png`، 2551×3579 = A4 بـ300dpi):
 * خطّا الإطار العموديّان عند x=136 وx=2414، والشعارُ ينتهي عند y=668، وزخرفةُ الأسفل الأيمن تبدأ عند
 * (x=2200, y≈2976) وتنزل يسارًا حتى (x=1700, y≈3294)، وخطُّ الأسفل الأيسر عند y≈3440. والمواضعُ نفسُها
 * مقيسةٌ على بيانٍ صمّمه المالك في الفوتوشوب («بيان تكليف»).
 *
 * **ولونا الهويّة** (قرار المالك): العنوانُ والتوقيعُ وأرقامُ البنود بالكحليّ الغامق، والمتنُ بالأزرق الفاتح —
 * كلاهما مأخوذٌ من زخرفة القالب نفسها (`#27405f` و`#345c80`).
 *
 * **والضبطُ كلمةً كلمة**: SVG لا يضبط سطرًا عربيًّا، فتُقاس كلُّ كلمةٍ ممدودةً كما تُرسَم (عنصرُ SVG خفيّ
 * يرث خطّ الموقع ومِزاته)، ثمّ تُوضَع كلمةً كلمة ويُوزَّع الفائضُ على الفراغات.
 *
 * **والبندُ المرقّم بمسافةٍ معلّقة**: رقمُه («أولًا:») في عمودٍ على اليمين بعرض أعرضِ رقمٍ في البيان، ونصُّه
 * وأسطرُه التالية تبدأ كلُّها من حدٍّ واحد بعده — فلا يلتفّ سطرٌ تحت الرقم، وتصطفّ البنودُ كلُّها على عمودين.
 */
import { downloadBlob } from "@/lib/download";
import { imagesPdf } from "@/lib/pdf";
import { ensureFonts, fitSize, openPaper, sealPaper, FEATURES, FONT, WEIGHTS, type PageSize, type Piece } from "@/lib/paper";

/**
 * كتلةٌ في المتن — سطرٌ ممّا كُتب في مربّع المتن:
 * فقرة (`p`)، أو عنصرُ قائمةٍ نقطيّة (`bullet`)، أو عنصرُ قائمةٍ مرقّمة (`number`: 1، 2، 3 — تبدأ من 1 في كلّ
 * قائمة)، أو بندٌ بأسلوب البيانات (`item`: أولًا، ثانيًا — متّصلُ الترقيم في البيان كلّه).
 */
export type Block = { kind: "p" | "bullet" | "number" | "item"; text: string };

/** ما يُرسَم — وهو ما يُحفظ في السجلّ فيُعاد الرسمُ منه مطابقًا. */
export type StatementDoc = {
  title: string;
  blocks: Block[];
  signers: "president" | "ceo" | "both";
  names: { president: Signer; ceo: Signer };
};
export type Signer = { title: string; name: string };

/** القالبُ بمقاسه الأصليّ؛ والمعاينةُ ترسمه بنسبةٍ (`k`) أخفّ على الجهاز. */
const BASE: PageSize = { w: 2551, h: 3579 };
const TEMPLATE = "/templates/statement.png";
const NAVY = "#27405f";
const BLUE = "#345c80";

/** حدودُ المتن، والعنوان وخطّاه، وأبوابُ التوقيع — بوحدات القالب الأصليّ. */
const L = {
  right: 2330,
  left: 225,
  // العنوانُ سطرًا واحدًا بمقاسه الكامل؛ فإن لم يسعه التفّ بمقاسٍ أصغر إلى ثلاثة أسطر، وارتفع أوّلُها قليلًا
  title: { y: 985, size: 150, multi: 116, min: 90, maxW: 1500, maxLines: 3, lead: 1.35, lift: 90, lineGap: 70, lineOut: 285, lineThick: 7 },
  body: { size: 78, lead: 142, gapP: 70, gapItem: 40, top: 1215, contTop: 900, bottom: 2880 },
  // البنودُ («أولًا»): عمودُ العنوان بعرض أعرضِه، ثمّ فسحةٌ في وسطها خطٌّ عموديٌّ رفيع يمتدّ بطول البند كلّه
  item: { gap: 0.95, rule: 4, ruleAlpha: 0.32 },
  // علاماتُ القوائم بنسبة مقاس المتن: عمودُ النقطة وقطرُها، وفسحةُ ما بعد رقم القائمة المرقّمة («1.»)
  list: { bulletCol: 0.95, dot: 0.26, numberGap: 0.5 },
  // التوقيع: موقّعٌ واحدٌ نصُّه محاذٍ لليمين عند 1880 وتوقيعُه بجانبه؛ والتوقيعان معًا عمودان، والتوقيعُ تحت كلٍّ —
  // أعلى قليلًا فلا يلمس الأيمنُ زخرفةَ الأسفل الأيمن. و`bottom` آخرُ ما ينزل إليه المتنُ فوق الفاصل.
  sign: {
    lineThick: 4, size: 64, min: 44, stamp: { x: 430, y: 3120, d: 380 },
    // موقّعٌ واحد (قرار المالك): المسمّى والاسم محاذيان لليمين، والتوقيعُ **بجانبهما** يسارًا في منتصف ارتفاعهما
    // والكتلةُ كلُّها (المسمّى والاسم والتوقيع) في منتصف الختم ارتفاعًا (3120) — قرار المالك؛ وحافّتُها اليمنى عند
    // 1740 فلا يلمس الاسمُ زخرفةَ الأسفل الأيمن وقد نزل إليها
    single: { lineY: 2960, titleY: 3097, nameY: 3187, right: 1740, w: 640, sigGap: 90, sigArea: 110000, sigMaxH: 280, sigMaxW: 620, line: [640, 1800] as const, bottom: 2830 },
    // والتوقيعان على خطٍّ واحد: منتصفاهما في ارتفاعٍ واحد (`sigMid`)، لا أعلاهما — فلا يلتصق العرضيُّ القصير باسمه
    both: { lineY: 2700, titleY: 2815, nameY: 2905, sigMid: 3075, sigArea: 90000, sigBoost: { president: 1.3, ceo: 1 }, sigMaxH: 300, president: 1640, ceo: 960, w: 520, line: [640, 2000] as const, bottom: 2570 },
  },
  // رقمُ الصفحة بلغة العنوان: «الصفحة 1 من 2» بين خطّين يرقّان، والرقمُ الحاليّ عريضًا كحليًّا أكبرَ ممّا حوله.
  // في البياض بين ختم الأسفل الأيسر وزخرفة الأسفل الأيمن.
  folio: { x: 1110, y: 3355, size: 44, num: 62, gap: 34, line: 120, lineThick: 4 },
} as const;

const BOLD = WEIGHTS.bold;
const BODY = WEIGHTS.body;

/** أرقامُ البنود بأسلوب بيانات أدِيب: «أولًا:»، «ثانيًا:»… وما بعد العشرين أرقامًا. */
const ORDINALS = [
  "أولًا", "ثانيًا", "ثالثًا", "رابعًا", "خامسًا", "سادسًا", "سابعًا", "ثامنًا", "تاسعًا", "عاشرًا",
  "حادي عشر", "ثاني عشر", "ثالث عشر", "رابع عشر", "خامس عشر", "سادس عشر", "سابع عشر", "ثامن عشر", "تاسع عشر", "عشرون",
];
export const ordinalLabel = (n: number) => `${ORDINALS[n - 1] ?? String(n)}:`;

/* ── المتنُ نصًّا: ما يُكتب في المربّع ← كتل، والعكس ─────────────────────────── */

const ORDINAL_RE = new RegExp(`^(${ORDINALS.join("|")})\\s*:\\s*`);
const BULLET_RE = /^[•\-–*]\s+/;
const NUMBER_RE = /^[0-9٠-٩]+\s*[.)\-–]\s+/;

/** علامةُ السطر في المربّع: ما يُكتب قبل نصّه (يُعاد ترقيمُه دائمًا). */
export function lineKind(line: string): { kind: Block["kind"]; rest: string } {
  const t = line.trimStart();
  let m = t.match(BULLET_RE);
  if (m) return { kind: "bullet", rest: t.slice(m[0].length) };
  m = t.match(NUMBER_RE);
  if (m) return { kind: "number", rest: t.slice(m[0].length) };
  m = t.match(ORDINAL_RE);
  if (m) return { kind: "item", rest: t.slice(m[0].length) };
  return { kind: "p", rest: t };
}

/** المربّعُ ← كتل: كلُّ سطرٍ كتلة، والفارغُ فاصلٌ لا يُرسَم. */
export function textToBlocks(text: string): Block[] {
  return text.split("\n").map(lineKind).filter((b) => b.rest.trim()).map((b) => ({ kind: b.kind, text: b.rest.trim() }));
}

/**
 * كتلٌ ← المربّع، بعلاماتٍ مُعادٍ ترقيمُها: «• » للنقطيّة، «1. » للمرقّمة تبدأ من 1 في كلّ قائمة، و«أولًا: »
 * للبنود متّصلةً. (يُعاد به ترقيمُ المربّع حين يتغيّر، فيبقى ما يُرى فيه هو ما يُرسَم.)
 */
export function renumberText(text: string): string {
  let ord = 0, num = 0;
  return text.split("\n").map((line) => {
    const { kind, rest } = lineKind(line);
    // القائمةُ المرقّمة تنقطع بأيّ سطرٍ غيرها، إلّا السطرَ الفارغ (لا يُرسَم، فلا يقطع)
    if (kind !== "number" && (kind !== "p" || rest.trim())) num = 0;
    if (kind === "bullet") return `• ${rest}`;
    if (kind === "number") return `${++num}. ${rest}`;
    if (kind === "item") return `${ordinalLabel(++ord)} ${rest}`;
    return line;
  }).join("\n");
}

export function blocksToEditorText(blocks: Block[]): string {
  return renumberText(blocks.map((b) => (b.kind === "bullet" ? `• ${b.text}` : b.kind === "number" ? `1. ${b.text}` : b.kind === "item" ? `أولًا: ${b.text}` : b.text)).join("\n"));
}

/* ── القياس: كلُّ كلمةٍ ممدودةً كما تُرسَم ─────────────────────────────────── */

/** يقيس نصوصًا بمقاسٍ ووزن في SVG خفيّ واحد (يرث خطّ الموقع ومِزاته) — قياسٌ واحدٌ لكلّ دفعة. */
function measure(words: string[], size: number, weight: number): number[] {
  if (!words.length) return [];
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;left:-99999px;top:-99999px;visibility:hidden";
  const nodes = words.map((w) => {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("font-family", FONT);
    t.setAttribute("font-size", String(size));
    t.setAttribute("font-weight", String(weight));
    t.setAttribute("direction", "rtl");
    t.setAttribute("style", `font-feature-settings:${FEATURES}`);
    t.textContent = w;
    svg.appendChild(t);
    return t;
  });
  document.body.appendChild(svg);
  const out = nodes.map((t) => t.getComputedTextLength());
  document.body.removeChild(svg);
  return out;
}

/** عرضُ المسافة بمقاسٍ ووزن: «ا ا» ناقصَ «اا» (الألفُ لا تتّصل بما بعدها، فلا يكذب الفرق). */
function spaceWidth(size: number, weight: number): number {
  const [spaced, joined] = measure(["ا ا", "اا"], size, weight);
  return Math.max(size * 0.18, spaced - joined);
}

/** لفٌّ بالعرض المقيس: كلماتٌ إلى أسطر لا يتجاوز أحدُها `maxW`. */
function wrapMeasured<T extends { w: number }>(words: T[], space: number, maxW: number): T[][] {
  const lines: T[][] = [];
  let cur: T[] = [];
  let width = 0;
  for (const w of words) {
    const next = cur.length ? width + space + w.w : w.w;
    if (next > maxW && cur.length) {
      lines.push(cur);
      cur = [w];
      width = w.w;
    } else {
      cur.push(w);
      width = next;
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

/* ── التخطيط ──────────────────────────────────────────────────────────────── */

type Word = { text: string; w: number };
/** سطرٌ في المتن: كلماتُه تبدأ من `indent` (من الحافّة اليمنى)، وقد يحمل رقمَ بندٍ في عموده. */
type Marker = { kind: "bullet" } | { kind: "number"; text: string } | { kind: "item"; text: string };
type Line = { words: Word[]; justify: boolean; indent: number; marker?: Marker; block: number; kind: Block["kind"] } | { gap: number };

/**
 * **الأرقامُ والرموزُ من الخطّ الإنجليزيّ وحده** (قرار المالك): الأرقامُ الهنديّة والفارسيّة تُردّ إلى 0–9، والنسبةُ
 * والفاصلتان العشريّتان إلى نظائرها اللاتينيّة — فتُرسَم كلُّها بخطّ Eras. (الفاصلةُ «،» والاستفهامُ «؟» عربيّان
 * لا نظيرَ لهما، فيبقيان.) ويُستعمل في المحرّر أيضًا وأنت تكتب.
 */
export function latinDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٪/g, "%").replace(/٫/g, ".").replace(/٬/g, ",");
}

const clean = (s: string) => latinDigits(s).replace(/\s+/g, " ").trim();

/**
 * يلفّ المتنَ أسطرًا: الفقرةُ على العرض كلّه، وعنصرُ القائمة بعد عمود علامته. والسطرُ الأخير في كتلته لا يُضبط.
 * أعمدةُ العلامات: النقطةُ والدائرةُ المرقّمة بعرضٍ ثابت، والبنودُ بعرض أعرضِ «أولًا:» في البيان فتصطفّ كلُّها.
 */
function layoutBody(blocks: Block[], k: number): { lines: Line[]; space: number } {
  const size = L.body.size * k;
  const maxW = (L.right - L.left) * k;
  const list = blocks.map((b) => ({ ...b, text: clean(b.text) })).filter((b) => b.text);
  const space = spaceWidth(size, BODY);

  let ord = 0, num = 0;
  const markers: (Marker | undefined)[] = list.map((b, i) => {
    if (b.kind !== "number") num = 0;
    if (b.kind === "bullet") return { kind: "bullet" };
    if (b.kind === "number") return { kind: "number", text: `${(num = (list[i - 1]?.kind === "number" ? num : 0) + 1)}.` };
    if (b.kind === "item") return { kind: "item", text: ordinalLabel(++ord) };
    return undefined;
  });
  // عمودا الرقمين بعرض أعرضِ ما فيهما، فتصطفّ العناصرُ كلُّها على حدٍّ واحد
  const labelsOf = (kind: "number" | "item") => markers.filter((m): m is Extract<Marker, { kind: typeof kind }> => m?.kind === kind).map((m) => m.text);
  const numberW = measure(labelsOf("number"), size, BOLD);
  const itemW = measure(labelsOf("item"), size, BOLD);
  const col = {
    bullet: size * L.list.bulletCol,
    number: numberW.length ? Math.max(...numberW) + size * L.list.numberGap : 0,
    item: itemW.length ? Math.max(...itemW) + size * L.item.gap : 0,
  };

  // كلماتُ الكتل كلِّها في دفعة قياسٍ واحدة
  const tokens = list.map((b) => b.text.split(" "));
  const widths = measure(tokens.flat(), size, BODY);
  let wi = 0;

  const lines: Line[] = [];
  list.forEach((b, bi) => {
    const words: Word[] = tokens[bi].map((text) => ({ text, w: widths[wi++] }));
    const marker = markers[bi];
    const indent = b.kind === "p" ? 0 : col[b.kind];
    const rows = wrapMeasured(words, space, maxW - indent);
    rows.forEach((ws, ri) => lines.push({ words: ws, justify: ri < rows.length - 1, indent, marker: ri === 0 ? marker : undefined, block: bi, kind: b.kind }));
    const next = list[bi + 1];
    if (next) lines.push({ gap: (b.kind !== "p" && next.kind === b.kind ? L.body.gapItem : L.body.gapP) * k });
  });
  return { lines, space };
}

/** العنوانُ أسطرًا: يلتفّ إلى ثلاثة على الأكثر، ولا يصغر إلّا إن جاوزها. */
function layoutTitle(title: string, k: number): { rows: { text: string; w: number }[]; size: number; lead: number } {
  const t = L.title;
  const text = clean(title);
  if (!text) return { rows: [], size: t.size * k, lead: 0 };
  const words = text.split(" ");
  // سطرٌ واحدٌ بالمقاس الكامل إن وسعه
  const full = measure(words, t.size * k, BOLD);
  const fullSpace = spaceWidth(t.size * k, BOLD);
  const fullW = full.reduce((a, w) => a + w, 0) + fullSpace * (words.length - 1);
  if (fullW <= t.maxW * k) return { rows: [{ text, w: fullW }], size: t.size * k, lead: t.size * k * t.lead };
  for (let s = t.multi * k; s >= t.min * k; s -= 6 * k) {
    const ws = measure(words, s, BOLD).map((w, i) => ({ text: words[i], w }));
    const space = spaceWidth(s, BOLD);
    const rows = wrapMeasured(ws, space, t.maxW * k);
    if (rows.length <= t.maxLines || s - 6 * k < t.min * k) {
      return {
        rows: rows.map((r) => ({ text: r.map((x) => x.text).join(" "), w: r.reduce((a, x) => a + x.w, 0) + space * (r.length - 1) })),
        size: s,
        lead: s * t.lead,
      };
    }
  }
  return { rows: [], size: t.size * k, lead: 0 };
}

/** يوزّع الأسطر على الصفحات: الأولى تحت العنوان، وما بعدها تحت الشعار، والأخيرةُ تترك مكانَ التوقيع. */
function paginate(lines: Line[], k: number, firstTop: number, signedBottom: number): Line[][] {
  const lead = L.body.lead * k;
  const pages: Line[][] = [[]];
  let y = firstTop;
  const bottom = L.body.bottom * k;
  lines.forEach((ln, li) => {
    const page = pages[pages.length - 1];
    if ("gap" in ln) {
      if (page.length) { page.push(ln); y += ln.gap; }
      return;
    }
    if (y > bottom) {
      while (page.length && "gap" in page[page.length - 1]) page.pop();
      const tail = page[page.length - 1];
      const same = page.filter((x) => !("gap" in x) && x.block === ln.block).length;
      const next = lines[li + 1];
      const lastOfBlock = !next || "gap" in next || next.block !== ln.block;
      const carry: Line[] = [];
      // لا يبقى سطرٌ وحيدٌ من كتلته: لا أوّلُها في ذيل صفحة، ولا آخرُها في رأس التالية — ينزل معه سطرٌ آخر منها
      if (tail && !("gap" in tail) && tail.block === ln.block && page.length > 1 && (same === 1 || lastOfBlock)) {
        carry.push(page.pop() as Line);
        while (page.length && "gap" in page[page.length - 1]) page.pop();
      }
      pages.push([...carry, ln]);
      y = L.body.contTop * k + lead * (carry.length + 1);
      return;
    }
    page.push(ln);
    y += lead;
  });
  // الصفحةُ الأخيرة تحمل التوقيع: ما نزل تحت حدّه يُنقل إلى صفحةٍ تليها
  const last = pages[pages.length - 1];
  let yy = pages.length === 1 ? firstTop : L.body.contTop * k, cut = -1;
  last.forEach((ln, i) => {
    if (cut < 0 && !("gap" in ln) && yy > signedBottom * k) cut = i;
    yy += "gap" in ln ? ln.gap : lead;
  });
  if (cut >= 0) {
    // لا يُفصَل سطرٌ عن كتلته وحيدًا: تنتقل الكتلةُ كلُّها إن بدأت في هذه الصفحة (ولم تكن أوّلَها)
    const cl = last[cut];
    const blk = "gap" in cl ? -1 : cl.block;
    const start = last.findIndex((ln) => !("gap" in ln) && ln.block === blk);
    if (start > 0) cut = start;
    const moved = last.splice(cut);
    while (last.length && "gap" in last[last.length - 1]) last.pop();
    while (moved.length && "gap" in moved[0]) moved.shift();
    pages.push(moved);
  }
  return pages;
}

/* ── الرسم ────────────────────────────────────────────────────────────────── */

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** التوقيعان والختم من بابهما المقفول (`/api/statements/asset/*`) — يُجلبان مرّةً ويُخبّآن. */
let assets: Promise<{ president: HTMLImageElement | null; ceo: HTMLImageElement | null; stamp: HTMLImageElement | null }> | null = null;
function loadAssets() {
  if (!assets) {
    assets = Promise.all([
      loadImage("/api/statements/asset/signature-president"),
      loadImage("/api/statements/asset/signature-ceo"),
      loadImage("/api/statements/asset/stamp"),
    ]).then(([president, ceo, stamp]) => ({ president, ceo, stamp }));
  }
  return assets;
}

/** خطٌّ يرقّ نحو طرفه البعيد — خطّا العنوان كما في القالب. `x1` الطرفُ القريب (غليظ)، و`x2` البعيد (رقيق). */
function taper(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, thick: number) {
  ctx.save();
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.moveTo(x1, y - thick / 2);
  ctx.lineTo(x2, y - thick / 6);
  ctx.lineTo(x2, y + thick / 6);
  ctx.lineTo(x1, y + thick / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function rule(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, thick: number) {
  ctx.save();
  ctx.fillStyle = NAVY;
  ctx.fillRect(Math.min(x1, x2), y - thick / 2, Math.abs(x2 - x1), thick);
  ctx.restore();
}

/**
 * **التوقيعُ بمساحةٍ مرئيّةٍ واحدة، لا بصندوقٍ واحد** (ملاحظة المالك): توقيعُ رئيس أدِيب يقارب المربّع، وتوقيعُ
 * الرئيسة التنفيذيّة عرضيّ؛ فإن حُشرا في صندوقٍ واحد ملأ العرضيُّ عرضَه وصغر المربّعُ بارتفاعه — فبدا أصغر.
 * فيُعطى كلٌّ المساحةَ نفسها (`area` = العرض × الارتفاع) بنسبته هو، ثمّ يُحدّ بالعرض والارتفاع الأقصيين.
 * ملتصقًا بأعلاه: متوسَّطًا عند `x`، أو حافّتُه اليمنى عند `x`.
 */
function signature(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, mid: number, area: number, maxW: number, maxH: number, align: "center" | "right") {
  const ratio = img.naturalWidth / img.naturalHeight;
  let h = Math.sqrt(area / ratio), w = h * ratio;
  const s = Math.min(1, maxW / w, maxH / h);
  w *= s; h *= s;
  ctx.drawImage(img, align === "center" ? x - w / 2 : x - w, mid - h / 2, w, h);
}

/**
 * علامةُ عنصرِ القائمة في عموده، وحافّتُه اليمنى `right` وقاعدةُ سطره `y`:
 * النقطةُ دائرةٌ كحليّة صغيرة في منتصف ارتفاع الحرف، والرقمُ «1.» والبندُ «أولًا:» عريضان كحليّان.
 */
function drawMarker(ctx: CanvasRenderingContext2D, pieces: Piece[], m: Marker, right: number, y: number, size: number) {
  if (m.kind !== "bullet") {
    pieces.push({ text: m.text, x: right, y, size, weight: BOLD, color: NAVY, anchor: "start" });
    return;
  }
  const r = (size * L.list.dot) / 2;
  ctx.save();
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.arc(right - size * 0.3 - r, y - size * 0.34, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * رقمُ الصفحة: أربعُ قطعٍ تُصفّ من اليمين («الصفحة»، الرقمُ الحاليّ، «من»، العدد) متوسَّطةً عند `folio.x`، والرقمُ
 * الحاليّ أكبرُها وأثقلُها؛ وعلى جانبيها خطّان يرقّان نحو طرفيهما كخطّي العنوان — فيُقرأ جزءًا من الورقة لا حاشية.
 */
function drawFolio(ctx: CanvasRenderingContext2D, pieces: Piece[], page: number, total: number, k: number) {
  const f = L.folio;
  const small = f.size * k, big = f.num * k;
  const parts = [
    { text: "الصفحة", size: small, weight: BODY, color: BLUE },
    { text: String(page), size: big, weight: BOLD, color: NAVY },
    { text: "من", size: small, weight: BODY, color: BLUE },
    { text: String(total), size: small, weight: BOLD, color: BLUE },
  ];
  const widths = parts.map((p) => measure([p.text], p.size, p.weight)[0]);
  const space = spaceWidth(small, BODY) * 1.4;
  const width = widths.reduce((a, w) => a + w, 0) + space * (parts.length - 1);
  const cx = f.x * k, y = f.y * k;
  let x = cx + width / 2;
  parts.forEach((p, i) => {
    pieces.push({ text: p.text, x, y, size: p.size, weight: p.weight, color: p.color, anchor: "start" });
    x -= widths[i] + space;
  });
  const lineY = y - small * 0.36;
  taper(ctx, cx + width / 2 + f.gap * k, cx + width / 2 + (f.gap + f.line) * k, lineY, f.lineThick * k);
  taper(ctx, cx - width / 2 - f.gap * k, cx - width / 2 - (f.gap + f.line) * k, lineY, f.lineThick * k);
}

/** يرسم البيانَ صفحاتٍ (Blob لكلّ صفحة). `k` نسبةُ الرسم: 1 للتنزيل، وأصغر للمعاينة. */
export async function renderStatement(
  doc: StatementDoc,
  opts: { k?: number; type?: "image/png" | "image/jpeg" } = {},
): Promise<Blob[]> {
  const k = opts.k ?? 1;
  const type = opts.type ?? "image/png";
  const page: PageSize = { w: Math.round(BASE.w * k), h: Math.round(BASE.h * k) };
  await ensureFonts();
  const art = await loadAssets();

  const title = layoutTitle(doc.title, k);
  const lift = title.rows.length > 1 ? L.title.lift * k : 0;
  const firstTop = L.body.top * k + Math.max(0, title.rows.length - 1) * title.lead - lift;
  const { lines, space } = layoutBody(doc.blocks, k);
  const pages = paginate(lines, k, firstTop, L.sign[doc.signers === "both" ? "both" : "single"].bottom);
  const total = pages.length;
  const out: Blob[] = [];
  const center = (BASE.w / 2) * k;
  const maxW = (L.right - L.left) * k;
  const size = L.body.size * k;

  for (let pi = 0; pi < total; pi++) {
    const ctx = await openPaper(TEMPLATE, page);
    const pieces: Piece[] = [];
    const isFirst = pi === 0, isLast = pi === total - 1;

    // العنوانُ بين خطّين — في الصفحة الأولى وحدها. والخطّان في منتصف كتلته، من حافّة أعرض أسطره
    if (isFirst && title.rows.length) {
      const t = L.title;
      title.rows.forEach((r, i) => pieces.push({ text: r.text, x: center, y: t.y * k - lift + i * title.lead, size: title.size, weight: BOLD, color: NAVY, anchor: "middle" }));
      const widest = Math.max(...title.rows.map((r) => r.w));
      const half = widest / 2 + t.lineGap * k;
      // منتصفُ الكتلة: منتصفُ سطرها الأوّل نازلًا بنصف ما زاد من أسطر (ومنتصفُ السطر فوق قاعدته بثلث مقاسه)
      const y = t.y * k - lift - title.size * 0.36 + ((title.rows.length - 1) * title.lead) / 2;
      if (center + half < (BASE.w - t.lineOut - 60) * k) {
        taper(ctx, center + half, (BASE.w - t.lineOut) * k, y, t.lineThick * k);
        taper(ctx, center - half, t.lineOut * k, y, t.lineThick * k);
      }
    }

    // المتنُ كلمةً كلمة، مضبوطًا إلّا آخرَ سطرٍ في كتلته. والبندُ رقمُه في عموده ونصُّه بعده
    let y = isFirst ? firstTop : L.body.contTop * k;
    // امتدادُ كلّ بندٍ («أولًا») في هذه الصفحة: من أعلى سطره الأوّل إلى أسفل الأخير، ليُرسَم خطُّه العموديّ
    const spans = new Map<number, { top: number; bottom: number; x: number }>();
    for (const ln of pages[pi]) {
      if ("gap" in ln) { y += ln.gap; continue; }
      if (ln.kind === "item") {
        const sp = spans.get(ln.block);
        const x = L.right * k - ln.indent + size * L.item.gap * 0.5;
        spans.set(ln.block, { top: sp?.top ?? y - size * 0.82, bottom: y + size * 0.3, x });
      }
      if (ln.marker) drawMarker(ctx, pieces, ln.marker, L.right * k, y, size);
      const width = maxW - ln.indent;
      const natural = ln.words.reduce((s, w) => s + w.w, 0);
      const slots = ln.words.length - 1;
      let gapW = space;
      if (ln.justify && slots > 0) {
        const more = (width - natural - space * slots) / slots;
        // سقفٌ للتوزيع: سطرٌ فيه كلماتٌ قليلة لا تُبعثَر على العرض كلّه
        if (more > 0 && more < space * 4) gapW = space + more;
      }
      let x = L.right * k - ln.indent;
      for (const w of ln.words) {
        pieces.push({ text: w.text, x, y, size, weight: BODY, color: BLUE, anchor: "start" });
        x -= w.w + gapW;
      }
      y += L.body.lead * k;
    }
    ctx.save();
    ctx.globalAlpha = L.item.ruleAlpha;
    ctx.fillStyle = NAVY;
    for (const sp of spans.values()) ctx.fillRect(sp.x - (L.item.rule * k) / 2, sp.top, L.item.rule * k, sp.bottom - sp.top);
    ctx.restore();

    // التوقيعُ والختم — في الصفحة الأخيرة
    if (isLast) {
      const s = L.sign;
      if (doc.signers === "both") {
        const b = s.both;
        rule(ctx, b.line[0] * k, b.line[1] * k, b.lineY * k, s.lineThick * k);
        for (const who of ["president", "ceo"] as const) {
          const x = b[who] * k, w = b.w * k, n = doc.names[who];
          pieces.push({ text: n.title, x, y: b.titleY * k, size: fitSize(ctx, n.title, w, s.size * k, BOLD, s.min * k), weight: BOLD, color: NAVY, anchor: "middle" });
          pieces.push({ text: n.name, x, y: b.nameY * k, size: fitSize(ctx, n.name, w, s.size * k, BOLD, s.min * k), weight: BOLD, color: NAVY, anchor: "middle" });
          const sig = art[who];
          if (sig) signature(ctx, sig, x, b.sigMid * k, b.sigArea * b.sigBoost[who] * k * k, w, b.sigMaxH * k, "center");
        }
      } else {
        const b = s.single, who = doc.signers, n = doc.names[who];
        const x = b.right * k, w = b.w * k;
        rule(ctx, b.line[0] * k, b.line[1] * k, b.lineY * k, s.lineThick * k);
        const tSize = fitSize(ctx, n.title, w, s.size * k, BOLD, s.min * k);
        const nSize = fitSize(ctx, n.name, w, s.size * k, BOLD, s.min * k);
        pieces.push({ text: n.title, x, y: b.titleY * k, size: tSize, weight: BOLD, color: NAVY, anchor: "start" });
        pieces.push({ text: n.name, x, y: b.nameY * k, size: nSize, weight: BOLD, color: NAVY, anchor: "start" });
        // التوقيعُ بجانب النصّ: حافّتُه اليمنى بعد أعرضِ السطرين بفسحة، ومنتصفُه في منتصف ارتفاعهما
        const [tw, nw] = [measure([n.title], tSize, BOLD)[0], measure([n.name], nSize, BOLD)[0]];
        const sig = art[who];
        const mid = ((b.titleY + b.nameY) / 2) * k - s.size * k * 0.35;
        if (sig) signature(ctx, sig, x - Math.max(tw, nw) - b.sigGap * k, mid, b.sigArea * k * k, b.sigMaxW * k, b.sigMaxH * k, "right");
      }
      if (art.stamp) {
        const d = s.stamp.d * k;
        ctx.drawImage(art.stamp, s.stamp.x * k - d / 2, s.stamp.y * k - d / 2, d, d);
      }
    }

    // رقمُ الصفحة حين تتعدّد: «الصفحة 1 من 2» بين خطّين، والرقمُ الحاليّ عريضًا كحليًّا أكبر
    if (total > 1) drawFolio(ctx, pieces, pi + 1, total, k);

    out.push(await sealPaper(ctx, pieces, page, type, 0.92));
  }
  return out;
}

/** اسمُ الملفّ: «بيان تكليف 2026-7». */
const fileBase = (title: string, number?: string) => `${clean(title) || "بيان"}${number ? ` ${number.replace("/", "-")}` : ""}`;

/** يرسم البيانَ بمقاسه الكامل ويُنزّله: صورةً إن كان صفحةً واحدة، وPDF إن تعدّدت صفحاته. يُعيد عدد الصفحات. */
export async function downloadStatement(doc: StatementDoc, number?: string): Promise<number> {
  // يُعرف عددُ الصفحات من التخطيط أوّلًا، فيُرسَم البيانُ مرّةً واحدةً بالصيغة التي يحتاجها
  const pages = await countPages(doc);
  if (pages === 1) {
    const [png] = await renderStatement(doc, { type: "image/png" });
    downloadBlob(png, `${fileBase(doc.title, number)}.png`, "بيان.png");
    return 1;
  }
  const jpegs = await renderStatement(doc, { type: "image/jpeg" });
  const images = await Promise.all(jpegs.map(async (b) => ({ jpeg: new Uint8Array(await b.arrayBuffer()), size: BASE })));
  // صفحةُ PDF بنسبة القالب نفسه (عرضُ A4 بالنقاط، والطولُ بنسبة 2551×3579)
  downloadBlob(imagesPdf(images, { w: 595.28, h: (595.28 * BASE.h) / BASE.w }), `${fileBase(doc.title, number)}.pdf`, "بيان.pdf");
  return images.length;
}

/** كم صفحةً يأخذ البيان — يُقاس بالتخطيط نفسه بلا رسم (يُحفظ في السجلّ مع الإصدار). */
export async function countPages(doc: Pick<StatementDoc, "title" | "blocks" | "signers">): Promise<number> {
  await ensureFonts();
  const title = layoutTitle(doc.title, 1);
  const firstTop = L.body.top + Math.max(0, title.rows.length - 1) * title.lead - (title.rows.length > 1 ? L.title.lift : 0);
  return paginate(layoutBody(doc.blocks, 1).lines, 1, firstTop, L.sign[doc.signers === "both" ? "both" : "single"].bottom).length;
}

/** المتنُ نصًّا مقروءًا (للسجلّ والبحث): كما يُكتب في المربّع بعلاماتٍ مُعادٍ ترقيمُها. */
export function blocksToText(blocks: Block[]): string {
  return blocksToEditorText(blocks.map((b) => ({ ...b, text: clean(b.text) })).filter((b) => b.text));
}
