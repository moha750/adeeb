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
