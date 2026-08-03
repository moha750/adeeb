/**
 * خطاب الإنذار — يُرسَم ويُنزَّل PNG. عميليّ حصرًا (يمسّ DOM).
 *
 * القالب الذي زوّده المالك (`public/brand/warning-template.png`، 1241×1755) **ورقةٌ رسميّة
 * كاملة**: إطارٌ منقوش وشعارا الجامعة والنادي أعلى، والختمُ وتوقيعا رئيس النادي وقائدة
 * الموارد أسفل — ولا نصّ فيه. فما نرسمه هو **المتن وحده** في بياض الورقة، بحبرٍ أبيض
 * لأنّ أرضيّتها كحليّة.
 *
 * ونصُّ المتن ليس هنا: مصدره `message.ts` — هو نفسه الذي تحمله رسالة واتساب، فلا ينحرف
 * المكتوب عن المُرسَل. **والرسم** ليس هنا كذلك: `lib/paper.ts` يحمل ما يشترك فيه هذا
 * الخطاب وشهادةُ الخبرة (الخطّ المضمَّن ومِزات المدّ والقياس واللفّ والتنزيل). فهذا الملفّ
 * **تخطيطٌ لا رسّام ولا كاتب**.
 */
import { fmtDate } from "@/lib/date";
import { downloadBlob } from "@/lib/download";
import {
  elongationRatio, fitSize, openPaper, sealPaper, wrap, FONT, WEIGHTS,
  type PageSize, type Piece,
} from "@/lib/paper";
import { greeting, letterParagraphs, salutation, signature, type WarningLetter } from "./message";
import { ordinalBare, ordinalWord } from "./vocab";

/** مقاس الورقة — مطابقٌ للقالب. */
const PAGE: PageSize = { w: 1241, h: 1755 };

/**
 * حدود بياض الورقة — **مقيسةٌ على بكسلات القالب لا مقدَّرة بالعين** (مسحُ سطورٍ بحثًا عن أوّل
 * حبرٍ فاتح): الشعاران ينتهيان عند y=284، وأوّل حبرٍ للختم عند **y=1357**. فالمتن يسكن ما
 * بينهما، والحدّ الأدنى يترك للنازل من الحروف اثني عشر بكسلًا فلا يلمس الختم.
 */
const BOX = { right: 1085, left: 156, top: 340, bottom: 1345 } as const;
const MAXW = BOX.right - BOX.left;

const INK = "#ffffff";
const INK_SOFT = "rgba(255,255,255,.72)";

const T = {
  title: { size: 62, weight: WEIGHTS.bold, y: BOX.top + 20 },
  date: { weight: WEIGHTS.body, y: BOX.top + 90 },
  greet: { weight: WEIGHTS.body, y: BOX.top + 152 },
  hail: { weight: WEIGHTS.bold, y: BOX.top + 206 },
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

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * **الترويسة تُشتقّ من المتن ولا تُحفَر أرقامًا** (قرار المالك): المتن يُقاس فيكبر ويصغر بطول
 * السبب، فلو ثبتت الترويسة لتقلّب التراتب بينهما — رأينا النداء يساوي المتن في خطابٍ ويصغر
 * عنه في آخر. فالنداء **درجةٌ فوق المتن أبدًا**، والتحيّة درجةٌ دونه، والتاريخ أصغرهما.
 *
 * وحدّان لا يُتجاوزان: لا يصغر النداء عمّا يُقرأ به عنوانًا، ولا يكبر حتى يزاحم عنوان الإنذار.
 */
const headSizes = (body: number) => {
  // والتراتب مضمونٌ لا مأمول: التاريخ ≤ التحيّة ≤ المتن < النداء — حتّى في أقصى الطرفين
  const hail = Math.max(body + 2, clamp(Math.round(body * 1.15), 30, 44));
  const greet = Math.min(body, clamp(Math.round(body * 0.9), 24, 34));
  const date = Math.min(greet, Math.max(20, Math.round(greet * 0.85)));
  return { hail, greet, date };
};

/** يبني خطاب الإنذار ويعيده Blob بصيغة PNG. */
export async function renderWarningLetter(l: WarningLetter): Promise<Blob> {
  const ctx = await openPaper("/brand/warning-template.png", PAGE);

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

  // الترويسة على اليمين، والمتن متوسَّط — وكلّها قطعٌ تُرسَم بمسارٍ واحد.
  // ومقاساتُها من مقاس المتن (`headSizes`) فيثبت التراتب مهما طال السبب أو قصر.
  const head = headSizes(size);
  const pieces: Piece[] = [
    { text: `إنذار ${ordinalBare(l.ordinal)}`, x: center, y: T.title.y, size: T.title.size, weight: T.title.weight, color: INK, anchor: "middle" },
    { text: `التاريخ: ${fmtDate(l.issuedAt)}`, x: BOX.right, y: T.date.y, size: head.date, weight: T.date.weight, color: INK_SOFT, anchor: "start" },
    // التحيّة ثمّ النداء — ترتيبُ البوست القديم نفسه، ولكلٍّ سطرُه
    { text: greeting, x: BOX.right, y: T.greet.y, size: head.greet, weight: T.greet.weight, color: INK, anchor: "start" },
    // النداء سطرٌ لا يُلَفّ، وقد كبر بكِبَر المتن — فمسمًّى طويلٌ باسمٍ طويل يُضيَّق حتى يسع
    {
      text: salutation(l), x: BOX.right, y: T.hail.y,
      size: fitSize(ctx, salutation(l), limit, head.hail, T.hail.weight, head.greet),
      weight: T.hail.weight, color: INK, anchor: "start",
    },
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

  return await sealPaper(ctx, pieces, PAGE);
}

/** يولّد الخطاب ويُنزّله ملفَّ PNG باسم صاحبه ورتبة إنذاره. */
export async function downloadWarningLetter(l: WarningLetter): Promise<void> {
  const blob = await renderWarningLetter(l);
  downloadBlob(blob, `إنذار-${l.name || "عضو"}-${ordinalWord(l.ordinal)}.png`);
}
