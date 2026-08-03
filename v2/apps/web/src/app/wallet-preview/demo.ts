/**
 * بيانات المعاينة — **وهميّةٌ كلُّها**، لا صفٌّ منها من القاعدة ولا اتّصال بها.
 *
 * هذا المجلّد معاينةٌ تُعرَض ثمّ تُحذف، فبياناتُه هنا في ملفٍّ واحد: من أراد تغيير
 * اسمٍ أو نقطةٍ أو عرضٍ غيّره في هذا الملفّ وحده ولم يفتح واجهةً ولا خادمًا.
 *
 * والأسماء والرعاة **مُختلَقون بيّنو الاختلاق** — لا نضع اسم جهةٍ حقيقيّة في عرضٍ لم
 * تتّفق عليه.
 */

/* ── الرتب ──────────────────────────────────────────────────────────────── */

export type Tier = {
  key: string;
  /** اسمُ الرتبة كما يُرسَم على البطاقة. */
  name: string;
  /** أدنى رصيدٍ يبلغها. */
  from: number;
  /** ما تفتحه الرتبة — يُقرأ في ظهر البطاقة وفي سلّم الرتب. */
  perk: string;
};

/**
 * سلّمٌ رباعيّ بأسماءٍ من معجم الأدب لا من المعادن — النادي أدبيّ، و«ذهبيّ/فضّيّ»
 * لغةُ مطاراتٍ لا لغةُ أديب.
 */
export const TIERS: Tier[] = [
  { key: "murid", name: "مُريد", from: 0, perk: "عروض الرعاة الافتتاحيّة" },
  { key: "rawi", name: "راوٍ", from: 150, perk: "أولويّةُ الحجز في الأمسيات" },
  { key: "katib", name: "كاتب", from: 400, perk: "دعوةٌ لِلقاءات الضيوف المغلقة" },
  { key: "baligh", name: "بليغ", from: 800, perk: "مقعدٌ في لجنة اختيار الإصدارات" },
];

/** رتبةُ رصيدٍ ما — أعلى عتبةٍ بلغها. */
export function tierOf(points: number): Tier {
  return [...TIERS].reverse().find((t) => points >= t.from) ?? TIERS[0];
}

/** الرتبة التالية وما ينقص لبلوغها — أو `null` عند القمّة. */
export function nextTier(points: number): { tier: Tier; remaining: number } | null {
  const next = TIERS.find((t) => t.from > points);
  return next ? { tier: next, remaining: next.from - points } : null;
}

/* ── الإنجازات ──────────────────────────────────────────────────────────── */

/**
 * إنجازٌ **يُرصَد يدويًّا** (قرارُك): مخوَّلٌ يكتب ما جرى ونقاطَه، فيبقى في السجلّ
 * باسمه — لا احتسابَ آليًّا ولا نظامَ مهامٍّ يُبنى قبل أن يُحتاج إليه.
 */
export type Achievement = {
  id: string;
  label: string;
  points: number;
  /** بصيغة ISO — تُعرَض ميلاديّةً مختصرة. */
  date: string;
  /** من رصده — العمود الذي يجعل الرصد اليدويّ مُساءلًا لا اعتباطيًّا. */
  by: string;
};

/* ── عروض الرعاة ────────────────────────────────────────────────────────── */

export type Offer = {
  id: string;
  /** الراعي — **مُختلَق**، انظر رأس الملفّ. */
  sponsor: string;
  title: string;
  /** ما يُخصَم من الرصيد عند الاستبدال. */
  cost: number;
  /** أدنى رتبةٍ تفتح العرض. */
  minTier: string;
  /** عددُ ما بقي من العرض — يجعل الندرة مرئيّةً في العرض على الراعي. */
  left: number;
};

export const OFFERS: Offer[] = [
  { id: "o1", sponsor: "مقهى «سَطْر»", title: "خصم ٢٥٪ على كلّ مشروب", cost: 120, minTier: "murid", left: 48 },
  { id: "o2", sponsor: "استوديو «الضوء»", title: "جلسة تصوير شخصيّة", cost: 180, minTier: "rawi", left: 12 },
  { id: "o3", sponsor: "مطبعة «قِرطاس»", title: "طباعة مئة نسخة بنصف السعر", cost: 240, minTier: "rawi", left: 20 },
  { id: "o4", sponsor: "مكتبة «الهامش»", title: "كتابٌ مجّانيّ من رفّ الأدب", cost: 300, minTier: "katib", left: 30 },
  { id: "o5", sponsor: "دار «مِداد» للنشر", title: "مراجعةُ مخطوطةٍ مع محرّر", cost: 650, minTier: "baligh", left: 5 },
];

/* ── الأعضاء ────────────────────────────────────────────────────────────── */

export type DemoMember = {
  id: string;
  name: string;
  gender: "male" | "female";
  /** المسمّى كاملًا كما يُرسَم على البطاقة. */
  position: string;
  unit: string;
  joined: string;
  points: number;
  /** رقم البطاقة — المرسوم في الباركود والمقروء بالعين. */
  serial: string;
  achievements: Achievement[];
};

/**
 * أربعةُ حساباتٍ وهميّة تغطّي ما يختلف فعلًا: قمّةُ السلّم · وسطُه · أوّلُه · ومن لم
 * يبلغ عتبةَ أوّل عرضٍ بعد (فتُرى البطاقةُ وهي **لا** تفتح شيئًا — وهذا نصفُ الحقيقة
 * الذي تُخفيه المعاينات المتفائلة).
 */
export const MEMBERS: DemoMember[] = [
  {
    id: "m1",
    name: "لمى صالح الدوسري",
    gender: "female",
    position: "قائدة لجنة السفراء والتصوير",
    unit: "إدارة العلاقات",
    joined: "2024-09-14",
    points: 940,
    serial: "ADEEB-CARD-2026-0117",
    achievements: [
      { id: "a1", label: "أدارت أمسية «ما لم يُقَل»", points: 90, date: "2026-07-28", by: "قائد إدارة الفعاليات" },
      { id: "a2", label: "مثّلت النادي في معرض الكتاب", points: 120, date: "2026-06-11", by: "رئيس النادي" },
      { id: "a3", label: "قدّمت ورشة التصوير الأدبيّ", points: 80, date: "2026-05-03", by: "قائد لجنة التدريب" },
      { id: "a4", label: "أنجزت أرشيف الموسم بالصور", points: 60, date: "2026-03-19", by: "قائد إدارة الضمان" },
    ],
  },
  {
    id: "m2",
    name: "عبدالله أحمد باجعيفر",
    gender: "male",
    position: "عضو إدارة الموارد البشرية",
    unit: "إدارة الموارد البشرية",
    joined: "2025-02-02",
    points: 465,
    serial: "ADEEB-CARD-2026-0233",
    achievements: [
      { id: "a5", label: "أعدّ دليل العضو الجديد", points: 100, date: "2026-07-02", by: "قائد إدارة الموارد" },
      { id: "a6", label: "أجرى ثماني مقابلات قبول", points: 80, date: "2026-04-22", by: "قائد إدارة الموارد" },
      { id: "a7", label: "كتب خبرًا نُشر في المنصّة", points: 40, date: "2026-02-14", by: "رئيس التحرير" },
    ],
  },
  {
    id: "m3",
    name: "ريّان محمد الحربي",
    gender: "male",
    position: "عضو لجنة التصميم",
    unit: "إدارة الإعلام",
    joined: "2025-10-05",
    points: 215,
    serial: "ADEEB-CARD-2026-0341",
    achievements: [
      { id: "a8", label: "صمّم هويّة حملة «اقرأ معنا»", points: 95, date: "2026-06-30", by: "قائد لجنة التصميم" },
      { id: "a9", label: "حضر ستّ أمسيات في الموسم", points: 60, date: "2026-05-20", by: "قائد إدارة الفعاليات" },
      { id: "a10", label: "راجع إصدار «مساءات»", points: 60, date: "2026-01-18", by: "قائد لجنة الإصدارات" },
    ],
  },
  {
    id: "m4",
    name: "جُمانة فهد القحطاني",
    gender: "female",
    position: "عضو لجنة التقارير والأرشفة",
    unit: "إدارة الضمان والجودة",
    joined: "2026-03-01",
    points: 60,
    serial: "ADEEB-CARD-2026-0402",
    achievements: [
      { id: "a11", label: "حضرت أمسيتين", points: 40, date: "2026-06-05", by: "قائد إدارة الفعاليات" },
      { id: "a12", label: "أعدّت تقرير ورشة السرد", points: 20, date: "2026-04-17", by: "قائد لجنة التقارير" },
    ],
  },
];

/** عضوٌ بمعرّفه — أوّلُ القائمة إن لم يُطابِق شيء. */
export const memberById = (id: string): DemoMember => MEMBERS.find((m) => m.id === id) ?? MEMBERS[0];

/** هل تفتح رتبةُ العضو هذا العرض؟ (الرصيد يُفحَص على حدة.) */
export function tierUnlocks(points: number, offer: Offer): boolean {
  const have = TIERS.findIndex((t) => t.key === tierOf(points).key);
  const need = TIERS.findIndex((t) => t.key === offer.minTier);
  return have >= need;
}

/* ── الصياغة ────────────────────────────────────────────────────────────── */

/** تاريخٌ عربيّ مختصر — مصدرٌ واحد للبطاقة والسجلّ معًا. */
export function arDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("ar-SA-u-ca-gregory-nu-arab", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** رقمٌ بفواصل عربيّة — الأرقام على البطاقة تُقرأ لا تُحسَب. */
export const arNum = (n: number): string => n.toLocaleString("ar-SA-u-nu-arab");
