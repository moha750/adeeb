/**
 * بطاقةُ نتيجة الانتخاب — صورةٌ مربّعةٌ تُرسَم وتُشارَك في قروب القسم أو اللجنة. عميليّةٌ
 * حصرًا (تمسّ DOM).
 *
 * **ولماذا رسّامُ الأوراق (`lib/paper`) لا رسمٌ ثانٍ؟** لأنّ حروفنا ممدودة (`ss06`/`ss07`)
 * وcanvas لا يعرف مِزات الخطّ، فالرسّامُ يحلّها مرّةً واحدةً للشهادة والخطاب وهذه. والفرقُ
 * أنّ تينك تُرسمان على قالبٍ من المالك، وهذه **لا قالبَ لها**: خلفيّتُها مبنيّةٌ من رموز
 * الهوية نفسِها (تدرّج ‎steel-400 → navy-800‎ · النقش · الشعار الأبيض) فلا لونَ مخترَعٌ فيها.
 * ومتى وصل قالبٌ مصمَّمٌ حلّ محلّ `paintBackground` وحدَه وبقي كلُّ ما عداه.
 *
 * **وما تقوله البطاقة** (قرار المالك ٢٠٢٦-٠٨-١٦): المقعدُ والفائزُ وحصيلتُه من الصندوق
 * **بعدد المصوّتين لا بالأوزان** (الوزنُ رقمٌ داخليٌّ لا يُشرَح لمن يقرأ في قروب)، ولا
 * تُذكَر أصواتُ الخاسرين: النتيجةُ تُعلَن ولا يُشهَّر بأحد.
 */
import { shareOrDownloadBlob, type SaveResult } from "@/lib/download";
import { fmtDate } from "@/lib/dates";
import { openBlank, sealPaper, fitSize, elongationRatio, loadTemplate, svgToDataUrl, WEIGHTS, type PageSize, type Piece } from "@/lib/paper";

export type ResultCard = {
  /** المقعد كاملًا: «قائد لجنة الإعلام». */
  position: string;
  /** اسمُ المقعد البرمجيّ (`roles.role_name`) — منه يُشتقّ ما يتولّاه في نصّ التهنئة. */
  roleName?: string | null;
  /** الفائز باسمه كما هو في صفّه. */
  winner: string;
  gender: "male" | "female" | null;
  /** عددُ من صوّت له (لا وزنُه) — وفي التزكية عددُ المؤيّدين. */
  votes: number;
  /** عددُ من صوّت في هذا الصندوق كلِّه. */
  turnout: number;
  /** تزكيةٌ لا تنافس: مرشّحٌ واحدٌ يُؤيَّد أو يُعترَض عليه. */
  confidence: boolean;
  /** عددُ المعترضين — في التزكية وحدَها. */
  opposeVotes: number;
  /** لحظةُ إعلان النتيجة (ISO) — لا لحظةُ توليد الصورة. */
  declaredAt: string | null;
};

/** مربّعٌ يليق بالقروبات: يُعرَض كاملًا في واتساب بلا قصّ. */
const CARD: PageSize = { w: 1080, h: 1080 };

const LOGO_SRC = "/brand/logo-horizontal-white.svg";
const PATTERN_SRC = "/brand/pattern-white.svg";

/** حبرُ البطاقة أبيضُ بثلاث شدّات — الاسمُ أقواها، والتاريخُ أخفّها. */
const INK = { strong: "#ffffff", soft: "rgba(255,255,255,.86)", faint: "rgba(255,255,255,.62)" } as const;

const CENTER = CARD.w / 2;
/** أوسعُ ما يُكتب فيه سطر — هامشٌ يمنةً ويسرةً يحفظ البطاقة من الازدحام. */
const MAXW = 860;

/**
 * الأسطر بمواضعها ومقاساتها: خطُّ أساسٍ لكلٍّ، وأدنى مقاسٍ ينزل إليه إن طال النصّ.
 *
 * والاسمُ يلي مقعدَه عن قرب (ضبطُ المالك ٢٠٢٦-٠٨-١٦): الجملةُ واحدةٌ — «هذا المقعد،
 * وهذا صاحبُه» — فلا يُفصَل طرفاها بخلاءٍ يجعلهما خبرين.
 */
const LINES = {
  eyebrow: { y: 372, size: 34, weight: WEIGHTS.body, color: INK.faint, min: 26 },
  position: { y: 496, size: 58, weight: WEIGHTS.bold, color: INK.soft, min: 30 },
  winner: { y: 614, size: 104, weight: WEIGHTS.bold, color: INK.strong, min: 42 },
  tally: { y: 772, size: 44, weight: WEIGHTS.body, color: INK.soft, min: 24 },
  date: { y: 940, size: 30, weight: WEIGHTS.body, color: INK.faint, min: 24 },
} as const;

const LOGO = { w: 300, y: 92 } as const;
/** خيطٌ رفيعٌ يفصل الاسمَ عن حصيلته — فاصلٌ بالبياض لا بنقطةٍ ولا شريط. */
const RULE = { y: 676, w: 160, h: 2 } as const;

/* ── القصاصات الذهبيّة ────────────────────────────────────────────────────
   احتفالٌ يليق بالخبر، وشرطاه اثنان:

   **(١) ذهبٌ لنا لا ذهبٌ جديد**: `#c49a3c` هو ذهبُ افتتاحيّة القصّة (`_story/story.css`)،
   وهو محذوفٌ من الرموز العامّة بحجّةٍ مكتوبة (رقمٌ خامٌّ لا سلّم له). فيُستعار هنا **بقيمته
   ومصدرِه مسمًّى**، ولا تُخترَع درجةٌ ثانية: التنويعُ **بالشدّة لا بالصبغة** (وهو نصُّ قاعدة
   الشفق في `tokens.css`) — ذهبٌ واحدٌ بشفافيّاتٍ مختلفة، ومعه بياضُ البطاقة نفسِه.

   **(٢) موضوعةٌ بيدٍ لا مبعثرةٌ عشوائيًّا** — كحروف الفصل الأوّل المتناثرة في القصّة:
   جدولٌ مكتوبٌ بمواضعه، فلا تخرج بطاقتان مختلفتان لمقعدٍ واحد، ولا تقع قصاصةٌ على اسم. */

/** ذهبُ القصّة — مصدرُه `--st-accent` في `_story/story.css`، ولا يُشتقّ منه لونٌ آخر. */
const GOLD = "196, 154, 60";

/** قصاصةٌ واحدة: موضعُها كسرًا من البطاقة، ومقاسُها ودورانُها وشدّتُها، والبيضاءُ تُوسَم. */
type Scrap = { x: number; y: number; w: number; h: number; r: number; a: number; white?: boolean };

/** الزوايا: علوٌّ حول الشعار وسفلٌ تحت التاريخ، والوسطُ متروكٌ للاسم. */
const CORNERS: Scrap[] = [
  { x: 0.07, y: 0.08, w: 26, h: 12, r: -18, a: 0.9 },
  { x: 0.14, y: 0.17, w: 18, h: 18, r: 24, a: 0.65 },
  { x: 0.05, y: 0.25, w: 22, h: 8, r: 8, a: 0.75, white: true },
  { x: 0.20, y: 0.06, w: 14, h: 14, r: -32, a: 0.5 },
  { x: 0.27, y: 0.14, w: 24, h: 9, r: 40, a: 0.8 },
  { x: 0.11, y: 0.33, w: 16, h: 16, r: -12, a: 0.45 },
  { x: 0.93, y: 0.07, w: 24, h: 11, r: 16, a: 0.9 },
  { x: 0.86, y: 0.16, w: 18, h: 18, r: -26, a: 0.6 },
  { x: 0.95, y: 0.24, w: 20, h: 8, r: -8, a: 0.75, white: true },
  { x: 0.79, y: 0.07, w: 14, h: 14, r: 34, a: 0.5 },
  { x: 0.73, y: 0.15, w: 22, h: 9, r: -40, a: 0.8 },
  { x: 0.89, y: 0.32, w: 16, h: 16, r: 10, a: 0.45 },
  { x: 0.08, y: 0.86, w: 22, h: 10, r: 28, a: 0.8 },
  { x: 0.17, y: 0.93, w: 16, h: 16, r: -14, a: 0.55 },
  { x: 0.04, y: 0.75, w: 18, h: 7, r: -6, a: 0.5, white: true },
  { x: 0.28, y: 0.88, w: 14, h: 14, r: 36, a: 0.45 },
  { x: 0.92, y: 0.87, w: 22, h: 10, r: -28, a: 0.8 },
  { x: 0.83, y: 0.94, w: 16, h: 16, r: 12, a: 0.55 },
  { x: 0.96, y: 0.76, w: 18, h: 7, r: 6, a: 0.5, white: true },
  { x: 0.72, y: 0.89, w: 14, h: 14, r: -36, a: 0.45 },
];

/** المطر: الزوايا نفسُها وزيادةٌ تعبر البطاقة، وما مرّ بحزام النصّ خفّت شدّتُه فلا يزاحمه. */
const RAIN: Scrap[] = [
  ...CORNERS,
  { x: 0.38, y: 0.09, w: 18, h: 8, r: 22, a: 0.6 },
  { x: 0.62, y: 0.11, w: 16, h: 16, r: -20, a: 0.5 },
  { x: 0.50, y: 0.05, w: 20, h: 9, r: 12, a: 0.55, white: true },
  { x: 0.33, y: 0.30, w: 14, h: 14, r: -30, a: 0.3 },
  { x: 0.67, y: 0.28, w: 18, h: 8, r: 34, a: 0.32 },
  { x: 0.22, y: 0.48, w: 16, h: 8, r: -16, a: 0.28 },
  { x: 0.79, y: 0.46, w: 14, h: 14, r: 20, a: 0.26 },
  { x: 0.16, y: 0.62, w: 18, h: 8, r: 30, a: 0.24 },
  { x: 0.85, y: 0.60, w: 16, h: 9, r: -24, a: 0.26 },
  { x: 0.30, y: 0.72, w: 14, h: 14, r: 14, a: 0.3 },
  { x: 0.70, y: 0.74, w: 20, h: 9, r: -34, a: 0.32 },
  { x: 0.45, y: 0.94, w: 16, h: 16, r: 26, a: 0.5 },
  { x: 0.57, y: 0.90, w: 22, h: 9, r: -12, a: 0.55 },
  { x: 0.50, y: 0.83, w: 14, h: 14, r: 40, a: 0.35, white: true },
];

/**
 * درجةُ الاحتفال — تُختار عند الرسم، والمُقَرّ (٢٠٢٦-٠٨-١٦) هو **المطر**: الزوايا داخلةٌ فيه
 * وزيادةٌ تعبر البطاقة. والمعاينةُ وحدَها تمرّر غيرَه لتُقارَن الدرجات.
 */
export type ConfettiStyle = "none" | "corners" | "rain";
const SCRAPS: Record<ConfettiStyle, Scrap[]> = { none: [], corners: CORNERS, rain: RAIN };

const g = (gender: ResultCard["gender"], male: string, female: string) => (gender === "female" ? female : male);

/* ── العدد وتمييزه ────────────────────────────────────────────────────────
   العربيّةُ تصرّف معدودَها: الواحدُ يُوصَف، والاثنان يُثنَّى، والثلاثةُ إلى العشرة جمعٌ،
   وما فوقها مفردٌ منصوب. فلا يُكتب «12 أصوات» ولا «2 صوت». */

/** حصيلةُ الفائز منصوبةً بعد «نال»: «صوتًا واحدًا» · «صوتين» · «4 أصوات» · «12 صوتًا». */
function ballots(n: number): string {
  if (n === 1) return "صوتًا واحدًا";
  if (n === 2) return "صوتين";
  if (n >= 3 && n <= 10) return `${n} أصوات`;
  return `${n} صوتًا`;
}

/** عددُ الناس: «مصوّتٍ واحد» · «مصوّتَين» · «5 مصوّتين» · «19 مصوّتًا». */
function voters(n: number): string {
  if (n === 1) return "مصوّتٍ واحد";
  if (n === 2) return "مصوّتَين";
  if (n >= 3 && n <= 10) return `${n} مصوّتين`;
  return `${n} مصوّتًا`;
}

/** عينُ البطاقة: ما هذه الورقة قبل أن يُقرأ فيها اسم. */
const eyebrow = (c: ResultCard): string => (c.confidence ? "نتيجةُ التزكية" : "نتيجةُ الانتخاب");

/**
 * سطرُ الحصيلة: تنافسٌ يُقال نيلًا من صندوق، وتزكيةٌ تُقال تأييدًا واعتراضًا.
 *
 * ومُصدَّرٌ لأنّ نافذةَ تأكيد الإعلان تقوله قبل وقوعه والبطاقةُ تقوله بعده — جملةٌ واحدةٌ
 * في الموضعين، فلا يقرأ المشرفُ حصيلةً بصيغةٍ ثمّ يوزّع صورةً بصيغةٍ أخرى.
 */
export const tallyLine = (c: ResultCard): string => {
  // التزكية: الاعتراضُ إن وقع قيل بعدده، وإلّا قيل نفيُه — ولا يُكتب «واعتراض 0».
  if (c.confidence) {
    const against = c.opposeVotes > 0 ? `واعتراض ${voters(c.opposeVotes)}` : "بلا اعتراض";
    return `${g(c.gender, "زُكّي", "زُكّيت")} بتأييد ${voters(c.votes)} ${against}`;
  }
  // الصندوقُ الفارغ يُقال فراغًا لا «0 صوتًا من 0 مصوّتًا» — والقاعدةُ تُجيز الإعلانَ فيه فيُقرأ حالُه.
  if (c.turnout === 0) return "لم يصوّت أحدٌ في هذا الصندوق";
  if (c.votes === 0) return `${g(c.gender, "لم ينل", "لم تنل")} صوتًا من ${voters(c.turnout)}`;
  return `${g(c.gender, "نال", "نالت")} ${ballots(c.votes)} من ${voters(c.turnout)}`;
};

/** سطرُ التاريخ: يومُ الإعلان لا يومُ التنزيل، فالصورةُ تُستخرَج بعد أسبوعٍ فتصدق. */
const stamp = (c: ResultCard): string => {
  const day = fmtDate(c.declaredAt);
  return day ? `أُعلنت النتيجة في ${day}` : "";
};

/**
 * **أرقامُ الرسالة هنديّةٌ** (نصُّ المالك ٢٠٢٦-٠٨-١٦: «من أصلِ ١٩ صوتًا») — تفارق البطاقةَ
 * عمدًا: البطاقةُ مرسومةٌ بخطّ الموقع وأرقامُه غربيّة، والرسالةُ نصٌّ عربيٌّ يُقرأ في محادثة.
 */
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const ar = (n: number): string => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

/**
 * تمييزُ العدد في الرسالة (بأرقامٍ هنديّة): «صوتٍ واحد» · «صوتين» · «٧ أصوات» · «١٩ صوتًا».
 *
 * **و«٧ صوتًا» خطأ**: الثلاثةُ إلى العشرة معدودُها **جمعٌ مجرور** (٧ أصوات)، والمفردُ المنصوب
 * (صوتًا) لا يصحّ إلّا من أحدَ عشرَ فصاعدًا. ولذلك لا يُكتب لفظُ المعدود في القالب ثابتًا.
 */
function ballotsAr(n: number): string {
  if (n === 1) return "صوتٍ واحد";
  if (n === 2) return "صوتين";
  if (n >= 3 && n <= 10) return `${ar(n)} أصوات`;
  return `${ar(n)} صوتًا`;
}

/** ما يتولّاه صاحبُ كلّ مقعدٍ منتخَب — المفتاحُ `roles.role_name` كما في القاعدة. */
const SEAT_DUTY: Record<string, string> = {
  committee_leader: "قيادةَ اللجنة",
  deputy_committee_leader: "نيابةَ قيادة اللجنة",
  department_head: "تنسيقَ القسم",
};

/**
 * **رسالةُ القروب** التي تصحب البطاقة — لا تُطبَع في الصورة عمدًا: الصورةُ وثيقةٌ تبقى وتُعاد
 * مشاركتُها، والمباركةُ صوتُ لحظةٍ يشيخ لو حُفر. ولأنّ الضاغطَ واحدٌ من ثلاثة (رئيس النادي أو
 * رئيس المجلس التنفيذيّ أو قائد الموارد)، فالتهنئةُ **كلامُه يرسله بيده** لا بيانًا تُصدره
 * الصورةُ باسم جهتين.
 *
 * وختامُها شكرٌ للمترشّحين والمصوّتين: النتيجةُ تُعلَن ولا يُشهَّر بأحد (كالبطاقة سواء).
 */
export function resultMessage(c: ResultCard): string {
  const name = c.winner.trim();
  const seat = c.position.trim();
  // ذيلُ الجملة يتبع المقعدَ المنتخَب: المنتخَبون ثلاثةٌ لا رابعَ لهم (`roles.is_elected`)،
  // ومقعدٌ لا نعرف اسمَه البرمجيّ يسقط ذيلُه ولا يُخترَع له وصف.
  const duty = c.roleName ? SEAT_DUTY[c.roleName] : undefined;
  const tail = duty ? `، ${g(c.gender, "ليتولّى", "لتتولّى")} ${duty}` : "";

  const kind = c.confidence ? "تزكية" : "انتخاب";
  const gained = c.confidence
    ? `${g(c.gender, "نال", "نالت")} ${name} تأييدَ ${ballotsAr(c.votes)}`
    : `${g(c.gender, "حازَ", "حازَت")} ${name} ثقةَ ${ballotsAr(c.votes)}`;
  // صندوقٌ فارغٌ لا يُقال فيه «من أصلِ ٠ صوتًا»
  const opening = c.turnout === 0
    ? `تُعلن إدارةُ الموارد البشريّة نتيجةَ ${kind} ${seat}؛ ولم يُدلِ أحدٌ بصوته، ${g(c.gender, "وأُعلن", "وأُعلنت")} ${name}${tail}.`
    : `تُعلن إدارةُ الموارد البشريّة نتيجةَ ${kind} ${seat}؛ فمن أصلِ ${ballotsAr(c.turnout)}، ${gained}${tail}.`;

  const thanks = c.confidence
    ? "والشكرُ موصولٌ لكلِّ من أدلى بصوته"
    : "والشكرُ موصولٌ لكلِّ من ترشّح، ولكلِّ من أدلى بصوته";
  // الأيقونات ومواضعُها بنصّ المالك حرفًا (٢٠٢٦-٠٨-١٦): صندوقٌ يفتتح الخبرَ وفرحةٌ تختمه،
  // ثمّ هتافٌ يفتتح المباركةَ ونجمةٌ تختمها. (بدّلها هنا وحدَه.)
  return [
    `🗳${opening}🥳`,
    `🎉 يبارك المجلسُ الإداريُّ وإدارةُ الموارد البشريّة ${g(c.gender, "له", "لها")} هذه الثقة، ${thanks}؛ فاختيارُ القائد شراكةٌ في صناعةِ الأثر.🌟`,
  ].join("\n\n");
}

/** اسمُ الملفّ المنزَّل — يقول ما هو ولمن، فلا يضيع في مجلّد التنزيلات. */
export const cardFileName = (c: ResultCard): string => `نتيجة ${c.position} ${c.winner}`.trim() + ".png";

/** لونان من رموز الهوية (لا قيمةَ لونٍ مكتوبةٌ هنا) — والارتدادُ نصُّهما في `tokens.css`. */
function brandStops(): [string, string] {
  const cs = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null;
  return [
    cs?.getPropertyValue("--steel-400").trim() || "#5e88ab",
    cs?.getPropertyValue("--navy-800").trim() || "#1e3350",
  ];
}

/**
 * **صورةٌ متّجهةٌ تُنقَش بمقاسها المطلوب** — لا تُصغَّر إليه.
 *
 * علّةُ ذلك أنّ شعارنا ونقشَنا ملفّان `viewBox` كبيران (‏1842×1080 و1920×287)؛ فإن مُرِّرا إلى
 * `drawImage` بمقاسٍ صغير نُقشا أوّلًا بمقاسهما الكبير ثمّ ضُغطا **ضغطةً واحدة** بلا مراحل،
 * فيتكسّر الحرفُ الرفيع ويخرج الشعارُ باهتًا. وهذه هي «ضعفُ الجودة» التي رآها المالك
 * (٢٠٢٦-٠٨-١٦)، ولا علاقةَ لها بمقاس البطاقة.
 *
 * والعلاج أن نحقن `width`/`height` في نصّ الملفّ نفسِه، فيُنقَش المتّجهُ **مرّةً واحدةً بالمقاس
 * النهائيّ** بلا تصغيرٍ بعده. ويرتدّ إلى التحميل العاديّ إن تعذّر جلبُ النصّ.
 */
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

/** رسمُ صورةٍ تغطيةً (‎object-fit: cover‎) على كامل البطاقة. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(CARD.w / img.width, CARD.h / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (CARD.w - w) / 2, (CARD.h - h) / 2, w, h);
}

/** نثرُ القصاصات — خلف النصّ دائمًا (يُرسَم قبله)، فلا تقع قطعةٌ على حرف. */
function scatter(ctx: CanvasRenderingContext2D, style: ConfettiStyle) {
  for (const s of SCRAPS[style]) {
    ctx.save();
    ctx.translate(s.x * CARD.w, s.y * CARD.h);
    ctx.rotate((s.r * Math.PI) / 180);
    ctx.fillStyle = s.white ? `rgba(255,255,255,${s.a * 0.8})` : `rgba(${GOLD},${s.a})`;
    ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
  }
}

/** الخلفيّةُ من الهوية: تدرّجُها الزاويّ (135°) ثمّ نقشُها خافتًا ثمّ شعارُها الأبيض. */
async function paintBackground(ctx: CanvasRenderingContext2D, confetti: ConfettiStyle) {
  const [from, to] = brandStops();
  const grad = ctx.createLinearGradient(0, 0, CARD.w, CARD.h);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD.w, CARD.h);

  ctx.imageSmoothingQuality = "high";

  // النقشُ يغطّي البطاقة، فيُنقَش بعرضها لا بعرض ملفّه (‏1920 عرضًا نسبتُه 1920:287)
  const pattern = await loadVectorAt(PATTERN_SRC, CARD.w, (287 / 1920) * CARD.w);
  if (pattern) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    drawCover(ctx, pattern);
    ctx.restore();
  }

  scatter(ctx, confetti);

  // الشعارُ يُنقَش بمقاسه في البطاقة تمامًا، فلا يُصغَّر من ١٨٤٢ إلى ٣٠٠ فيتكسّر
  const logoH = (1080 / 1841.8) * LOGO.w;
  const logo = await loadVectorAt(LOGO_SRC, LOGO.w, logoH);
  if (logo) ctx.drawImage(logo, CENTER - LOGO.w / 2, LOGO.y, LOGO.w, logoH);

  ctx.fillStyle = "rgba(255,255,255,.28)";
  ctx.fillRect(CENTER - RULE.w / 2, RULE.y, RULE.w, RULE.h);
}

/**
 * يبني البطاقة ويعيدها PNG. و`confetti` منفذُ المعاينة وحدَها (تعرض الدرجات جنبًا إلى جنب)،
 * والإنتاجُ يأخذ الافتراضَ المُقَرّ فلا تُنثَر بطاقتان بدرجتين.
 */
export async function renderResultCard(c: ResultCard, confetti: ConfettiStyle = "rain"): Promise<Blob> {
  const ctx = await openBlank(CARD);
  await paintBackground(ctx, confetti);

  const rows: [string, keyof typeof LINES][] = [
    [eyebrow(c), "eyebrow"],
    [c.position.trim(), "position"],
    [c.winner.trim(), "winner"],
    [tallyLine(c), "tally"],
    [stamp(c), "date"],
  ];

  const pieces: Piece[] = rows
    .filter(([text]) => text.length > 0)
    .map(([text, key]) => {
      const l = LINES[key];
      /**
       * **حدُّ القياس مضيَّقٌ بنسبة المدّ** (كخطاب الإنذار سواء): canvas يقيس الحرفَ غيرَ ممدود،
       * والبطاقةُ تُرسَم ممدودةً (`ss06`/`ss07`) — فما قِيس ٨٦٠ يُرسَم ١١٢٠ فيخرج طرفا الاسم عن
       * البطاقة. وهو الذي رآه المالك (٢٠٢٦-٠٨-١٦): اسمٌ مقصوصٌ من جانبيه. والنسبةُ تُقاس **لكلّ
       * سطرٍ بنصّه** لا مرّةً للبطاقة: مدُّ «الشمري» ليس مدَّ «نال ٤ أصوات».
       */
      const limit = MAXW / elongationRatio(ctx, text, l.size, l.weight);
      return {
        text,
        x: CENTER,
        y: l.y,
        size: fitSize(ctx, text, limit, l.size, l.weight, l.min),
        weight: l.weight,
        color: l.color,
        anchor: "middle" as const,
      };
    });

  return await sealPaper(ctx, pieces, CARD);
}

/**
 * يولّدها ثمّ يحفظها: ورقةُ مشاركة النظام في الهاتف (فتذهب إلى واتساب مباشرةً أو إلى
 * الاستوديو)، وتنزيلٌ في الحاسب. واللوحةُ منتَجُ جوّالٍ عندنا، فهذا هو الطريق لا التنزيل.
 */
export async function saveResultCard(c: ResultCard, message?: string): Promise<SaveResult> {
  const text = message?.trim() || resultMessage(c);
  return await shareOrDownloadBlob(await renderResultCard(c), cardFileName(c), "نتيجة الانتخاب.png", text);
}
