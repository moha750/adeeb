/**
 * **معجمُ غرفة الألعاب** — بلا إطارٍ فيقرؤه الخادمُ والمتصفّح معًا.
 *
 * كلُّ قيمةٍ هنا تطابق قيدًا في القاعدة (قيدُ عمود `tone` في `20261017091345_games_01_hall.sql`)،
 * وكلُّ نغمةٍ سطرُها في `components.css` (`.agm [data-tone="…"]`). فنغمةٌ جديدةٌ ثلاثةُ مواضع
 * في تغييرٍ واحد: القيدُ، وهذا الملفّ، وسطرُ اللون.
 */

export const GAME_TONES = ["darb", "amber", "sky", "violet"] as const;
export type GameTone = (typeof GAME_TONES)[number];

export const TONE_LABEL: Record<GameTone, string> = {
  darb: "أخضر",
  amber: "برتقاليّ",
  sky: "سماويّ",
  violet: "بنفسجيّ",
};
export const TONE_OPTIONS = GAME_TONES.map((v) => ({ value: v, label: TONE_LABEL[v] }));

/** حدودُ النصوص كما في قيود القاعدة، فيقول النموذجُ الحدَّ قبل أن يرفضه الخادم. */
export const LIMITS = {
  name: { min: 2, max: 30 },
  line: { min: 10, max: 90 },
  title: { min: 4, max: 60 },
  note: { min: 4, max: 160 },
} as const;

/** لعبةٌ كما تقرؤها الغرفة. */
export type GameRow = {
  slug: string;
  name: string;
  line: string;
  tone: GameTone;
  playPath: string;
  boardPath: string | null;
  attractVideo: string | null;
  attractPoster: string | null;
  inHall: boolean;
  sortOrder: number;
};

/**
 * **ما تستطيع اللعبةُ أن يُتنافس عليه** (`game_metrics`، الترحيل `games_05_contest_metrics`). لعبةٌ بلا
 * مقياسٍ لا مسابقةَ لها: المسابقةُ تُحسب في القاعدة من جولات نافذتها (`game_contest_board`).
 */
export type MetricUnit = "m" | "tamr";
export type GameMetric = { metric: string; label: string; unit: MetricUnit };

/** صفٌّ من صدارة مسابقة. */
export type BoardRow = { rank: number; nickname: string; value: number };

/** مسابقةٌ كما يعلنها الشريط. */
export type ContestRow = {
  id: string;
  gameSlug: string;
  gameName: string;
  tone: GameTone;
  title: string;
  note: string;
  startsAt: string;
  endsAt: string;
  /** مقياسُها. و`null` لمسابقة أكواب oos وحدَها: إعلانٌ قديمٌ حكمُه في `darb_contest`، لا يُعدَّل. */
  metric: GameMetric | null;
};

/** طورُ المسابقة من ساعتها لا من عمود: جارية، وقادمة، وانتهت. */
export type ContestPhase = "live" | "soon" | "over";
export function contestPhase(c: Pick<ContestRow, "startsAt" | "endsAt">, now: number): ContestPhase {
  if (now >= Date.parse(c.endsAt)) return "over";
  if (now < Date.parse(c.startsAt)) return "soon";
  return "live";
}
export const PHASE_META: Record<ContestPhase, { label: string; tone: "success" | "warning" | "neutral" }> = {
  live: { label: "جارية", tone: "success" },
  soon: { label: "قادمة", tone: "warning" },
  over: { label: "انتهت", tone: "neutral" },
};

/** اسمُ المعدود بصيغه الثلاث (`countNoun` أدناه يختار بينها). */
export type Noun = { one: string; few: string; many: string };
export const NOUNS = {
  PLAYER: { one: "لاعب", few: "لاعبين", many: "لاعبًا" },
  RUN: { one: "جولة", few: "جولات", many: "جولةً" },
  NAME: { one: "اسم", few: "أسماء", many: "اسمًا" },
  DATE: { one: "تمرة", few: "تمرات", many: "تمرةً" },
  VISITOR: { one: "زائر", few: "زوّار", many: "زائرًا" },
} as const satisfies Record<string, Noun>;

/** تمييزُ العدد: الواحدُ مفرد، ومن ٣ إلى ١٠ جمع، وما فوقها مفردٌ منصوب (والاثنان جمعٌ هنا تجوّزًا). */
export function countNoun(k: number, n: Noun): string {
  if (k === 1) return n.one;
  const t = k % 100;
  return k === 2 || (t >= 3 && t <= 10) ? n.few : n.many;
}

/** مسودّةُ «الإعداد»: ما يُحفظ بزرّ «حفظ». والظهورُ في الصالة وترتيبُها فعلان فوريّان خارجها. */
export type GameDraft = Pick<GameRow, "name" | "line" | "tone" | "playPath" | "boardPath" | "attractVideo" | "attractPoster">;
export type GameDraftErrors = Partial<Record<keyof GameDraft, string>>;

/**
 * **يومٌ من أيّام لعبة** (`game_days`، الترحيل `games_06_days`) بتوقيت الرياض. `score` تمرُ دربك خضر،
 * و`hits`/`answered` إصاباتُ البنك ومن بلغ سؤالَه، و`null` حيث لا معنى له.
 */
export type GameDay = {
  day: string;
  runs: number;
  players: number;
  visitors: number;
  score: number | null;
  hits: number | null;
  answered: number | null;
};

/** ما تعيده `bank_stats()` (الترحيل `games_01_hall`): منذ أوّل عمليّةٍ في المعرض. */
export type BankStats = {
  plays: number;
  players: number;
  first: string | null;
  last: string | null;
  results: Partial<Record<"correct" | "wrong" | "timeout" | "abandoned", number>>;
  levels: Partial<Record<"easy" | "medium" | "hard" | "none", number>>;
  langs: Partial<Record<"ar" | "en", number>>;
  days: { day: string; plays: number }[];
};

/** أوائلُ «دربك خضر» منذ إطلاقها: أكثرُ تمرٍ وأبعدُ مسافة (`darb_players` بلا المخفيّين). */
export type DarbLeaders = { tamr: { nickname: string; value: number }[]; dist: { nickname: string; value: number }[] };

/** فرائدُ الأسبوع (`game_weeks`): `[آخر سبعة أيام، السبعة قبلها]`. */
export type GameWeek = { players: [number, number]; visitors: [number, number] };
