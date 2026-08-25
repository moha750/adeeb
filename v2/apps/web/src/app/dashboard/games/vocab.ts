// مفردات «خمّن الكلمة» — لا تعتمد على شيء خادميّ، فيستوردها الخادم والعميل معًا
// بأمان (مِقوَدُ المضيف · شاشةُ العرض · شاشةُ اللاعب العلنيّة `/g/[code]`).
//
// وكلُّ قيمةٍ هنا يحرسها قيدٌ مقابل في القاعدة: `guess_word_sessions_status_check` ·
// `guess_word_sessions_code_shape` · `guess_word_sessions_time_per_word_check` ·
// `guess_word_players_name_check` · `guess_word_answers_answer_check`.
// لا تُضِف قيمةً قبل توسيع القيد بترحيلٍ مقابل.

import { ROOM_ALPHABET, codeShapeGuard } from "@/lib/shortCode";

/* ────────────────────────── الرمز ────────────────────────── */

/** طولُ رمز الغرفة. يطابق `guess_word_sessions_code_shape`، وتبديلُه يقتضي ترحيلًا. */
export const ROOM_CODE_LEN = 6;

/** يُسأل قبل أيّ نداءِ قاعدة في `/g/[code]`: الخُردةُ تُردّ بلا استعلام. */
export const isRoomCode = codeShapeGuard(ROOM_CODE_LEN, ROOM_ALPHABET);

/** مسارُ الغرفة في موقعنا. مصدرٌ واحد: يقرؤه الباركودُ والمسارُ العلنيّ والاختبار. */
export const roomPath = (code: string): string => `/g/${code}`;

/* ────────────────────────── حالُ الغرفة ────────────────────────── */

export type RoomStatus = "waiting" | "active" | "finished";

export const ROOM_STATUS_META: Record<
  RoomStatus,
  { label: string; tone: "neutral" | "success" | "warning" }
> = {
  waiting: { label: "في الانتظار", tone: "warning" },
  active: { label: "جارية", tone: "success" },
  finished: { label: "منتهية", tone: "neutral" },
};

/* ────────────────────────── حالُ الجولة ────────────────────────── */

/** الجولةُ الواحدة (الكلمة). حالُها **مشتقّةٌ** من أزمنتها لا مخزَّنةٌ عمودًا يتناقض معها. */
export type RoundState = "pending" | "running" | "paused" | "ended";

export const ROUND_STATE_META: Record<
  RoundState,
  { label: string; tone: "neutral" | "success" | "warning" }
> = {
  pending: { label: "لم تبدأ", tone: "neutral" },
  running: { label: "جارية", tone: "success" },
  paused: { label: "موقوفة", tone: "warning" },
  ended: { label: "انتهت", tone: "neutral" },
};

/** أزمنةُ الجولة كما تُقرأ من الصفّ. */
export type RoundTiming = {
  startedAt: string | null;
  endedAt: string | null;
  pausedAt: string | null;
  pausedMs: number;
};

export function roundState(t: RoundTiming): RoundState {
  if (t.endedAt) return "ended";
  if (!t.startedAt) return "pending";
  return t.pausedAt ? "paused" : "running";
}

/**
 * ما بقي من الجولة بالمِلّي، مطروحًا منه ما وقفت فيه.
 *
 * **ووقفةُ المضيف لا تأكل مهلةَ اللاعب:** الرصيدُ المتراكم `pausedMs` يُطرح دائمًا،
 * وما دامت الجولةُ موقوفةً الآن تُطرح معه الوقفةُ الجارية. فالعدُّ يتجمّد ولا يتراجع.
 *
 * و`nowMs` يُمرَّر ولا يُقرأ من `Date.now()` هنا: الساعةُ المُعتمَدة ساعةُ الخادم
 * معايَرةً بفارقها (`clockOffset`)، ودالّةٌ تقرأ ساعتَها لا تُختبَر ولا تُعايَر.
 */
export function roundRemainingMs(t: RoundTiming, seconds: number, nowMs: number): number {
  if (!t.startedAt) return seconds * 1000;
  const started = Date.parse(t.startedAt);
  const cursor = t.endedAt ? Date.parse(t.endedAt) : t.pausedAt ? Date.parse(t.pausedAt) : nowMs;
  const elapsed = cursor - started - (t.pausedMs || 0);
  return Math.max(0, seconds * 1000 - Math.max(0, elapsed));
}

/* ────────────────────────── أوضاعُ اختيار الكلمات ────────────────────────── */

export type PickMode = "all" | "chosen" | "random";

export const PICK_MODES: readonly { value: PickMode; label: string; hint: string }[] = [
  { value: "all", label: "كلُّ الكلمات", hint: "كلماتُ التصنيفات المختارة كلُّها، بترتيبٍ عشوائيّ" },
  { value: "chosen", label: "عددٌ معيّن", hint: "تؤشّر على ما تريد بيدك، والترتيبُ ترتيبُ تأشيرك" },
  { value: "random", label: "عددٌ عشوائيّ", hint: "تكتب العددَ فيُسحَب من النشطات" },
];

/* ────────────────────────── الحدود ────────────────────────── */

export const LIMITS = {
  /** يطابق `guess_word_sessions_title_required` وفحصَ الدالّة. */
  titleMax: 100,
  /** يطابق `guess_word_players_name_check` بعد تضييقه في `gw_join_session`. */
  nameMin: 2,
  nameMax: 24,
  /** يطابق `guess_word_answers_answer_check`. */
  answerMax: 500,
  /** يطابق `guess_word_sessions_time_per_word_check`. */
  secondsMin: 10,
  secondsMax: 600,
  /** يطابق فحصَ `gw_create_session`. */
  wordsMax: 200,
  bankWordMax: 100,
  bankHintMax: 200,
  bankCategoryMax: 40,
  /** أقصى ما تحمله اللصقةُ الواحدة. حدٌّ يُقال ولا يُقصّ صامتًا. */
  bulkMax: 300,
} as const;

export const SECONDS_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "30", label: "ثلاثون ثانية" },
  { value: "45", label: "خمسٌ وأربعون ثانية" },
  { value: "60", label: "دقيقة" },
  { value: "90", label: "دقيقةٌ ونصف" },
  { value: "120", label: "دقيقتان" },
];

/* ────────────────────────── رسائلُ العطل ────────────────────────── */

/**
 * ترجمةُ رموز العطل التي ترفعها دوالُّ القاعدة.
 *
 * بعضُها يحمل عربيّتَه في نصّ الاستثناء وبعضُها لا، فلو اعتمدنا على «ما بعد النقطتين»
 * لظهرت للمستخدم شفرةٌ لاتينيّةٌ عارية في نصف الحالات. **فالمصدرُ الواحد هذا الجدول**،
 * ونصُّ القاعدة يبقى للسجلّ لا للعين.
 */
export const GAME_ERRORS: Record<string, string> = {
  GW_FORBIDDEN: "لا تملك قدرةَ إدارة الألعاب.",
  GW_SESSION_NOT_FOUND: "لا غرفةَ بهذا الرمز.",
  GW_SESSION_FINISHED: "انتهت هذه اللعبة.",
  GW_TITLE_REQUIRED: "عنوانُ الغرفة مطلوب.",
  GW_TITLE_TOO_LONG: "العنوانُ طويل، الحدُّ مئةُ حرف.",
  GW_TITLE_DUPLICATE: "توجد غرفةٌ جاريةٌ بهذا العنوان.",
  GW_BAD_PICK_MODE: "وضعُ اختيارٍ غيرُ معروف.",
  GW_BAD_PICK_COUNT: "العددُ واحدٌ فأكثر.",
  GW_NO_WORDS: "لم تُختَر كلمةٌ واحدة.",
  GW_TOO_MANY_WORDS: "الحدُّ الأقصى مئتا كلمة.",
  GW_CODE_GEN_FAILED: "تعذّر توليدُ رمزٍ فريد، حاول ثانيةً.",
  GW_WORD_NOT_FOUND: "لا كلمةَ بهذا المعرّف.",
  GW_WORD_NOT_IN_SESSION: "هذه الكلمةُ ليست في هذه الغرفة.",
  GW_ROUND_PLAYED: "لُعِبت هذه الجولة، أعِدها أوّلًا.",
  GW_NO_ACTIVE_ROUND: "لا جولةَ جارية.",
  GW_ROUND_NOT_OPEN: "الجولةُ مغلقة.",
  GW_ROUND_PAUSED: "الجولةُ موقوفةٌ الآن.",
  GW_TIME_UP: "انتهى وقتُ الجولة.",
  GW_ALREADY_ANSWERED: "أرسلتَ إجابتَك بالفعل.",
  GW_INVALID_ANSWER: "الإجابةُ مطلوبةٌ ولا تتجاوز خمس مئة حرف.",
  GW_INVALID_NAME: "الاسمُ من حرفين إلى أربعةٍ وعشرين.",
  GW_NAME_TAKEN: "هذا الاسمُ مأخوذ، اختر غيره.",
  GW_INVALID_TOKEN: "جلستُك غيرُ صالحة، أعِد مسحَ الرمز.",
  GW_PLAYER_NOT_FOUND: "لم تنضمّ إلى هذه الغرفة بعد.",
  GW_PLAYER_KICKED: "أُخرِجتَ من هذه الغرفة.",
  GW_PLAYER_NOT_IN_SESSION: "هذا اللاعبُ ليس في هذه الغرفة.",
};

/** رسالةٌ عربيّةٌ من عطلِ قاعدة. وما لا يُعرَف يُقال عامًّا ولا يُعرَض خامًا. */
export function gameError(raw: string | null | undefined): string {
  const key = raw?.match(/GW_[A-Z_]+/)?.[0];
  return (key && GAME_ERRORS[key]) || "تعذّر تنفيذُ الطلب. حاول ثانيةً.";
}

/* ────────────────────────── تنقيةُ المُدخَل ────────────────────────── */

/**
 * محارفُ الاتّجاه الخفيّة تلتصق باللصق العربيّ فتُفسد العرضَ والمقارنةَ معًا، وهي
 * غيرُ مرئيّةٍ فلا يفهم كاتبُها لِمَ رُدّ اسمُه. تُنقّى ولا يُشتكى منها.
 * (نظيرُ `clean` في `dashboard/surveys/actions.ts`، ومكرَّرٌ هنا لأنّ هذا الملفّ
 * يُستورَد في المتصفّح وذاك خادميٌّ محض.)
 */
export function cleanText(v: string | null | undefined): string {
  return (v ?? "").replace(/[‎‏‪-‮]/g, "").trim();
}

/** تحقّقُ اسم اللاعب — يُنادى في المتصفّح تجربةً، وفي `gw_join_session` حراسةً. */
export function validatePlayerName(raw: string): string | null {
  const name = cleanText(raw);
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
    return GAME_ERRORS.GW_INVALID_NAME;
  }
  return null;
}

/* ────────────────────────── مُدخَلُ الغرفة وتحقّقُه ────────────────────────── */

export type CreateRoomInput = {
  title: string;
  seconds: number;
  pickMode: PickMode;
  categories: string[];
  wordIds: string[];
  pickCount: number;
  /** كلماتٌ خاصّةٌ بهذه الغرفة، سطرٌ لكلّ كلمة. */
  customWords: string;
};

/**
 * نفسُ قيود القاعدة برسائلَ عربيّة. يُنادى في المتصفّح تجربةً وفي الخادم حراسةً.
 *
 * **وموضعُه هنا لا في `actions.ts`** — لسببين لا واحد: ملفُّ `"use server"` لا يُصدِّر
 * إلّا دوالَّ لاتزامنيّة (والبناءُ يسقط عليه، وقد سقط)، وهذا تحقّقٌ متزامنٌ يقرؤه
 * النموذجُ مع كلّ ضغطة. والأصلُ أنّ المنطقَ الخالصَ يسكن المفرداتِ لا الأفعال.
 */
export function validateRoom(input: CreateRoomInput): string | null {
  const title = cleanText(input.title);
  if (!title) return "عنوانُ الغرفة مطلوب.";
  if (title.length > LIMITS.titleMax) return `العنوانُ طويل، الحدُّ ${LIMITS.titleMax} حرفًا.`;

  if (
    !Number.isInteger(input.seconds) ||
    input.seconds < LIMITS.secondsMin ||
    input.seconds > LIMITS.secondsMax
  ) {
    return "مهلةُ الجولة خارج المدى.";
  }

  if (input.pickMode === "chosen" && input.wordIds.length === 0 && !cleanText(input.customWords)) {
    return "أشّر على كلمةٍ واحدةٍ على الأقلّ.";
  }
  if (input.pickMode === "random" && (!Number.isInteger(input.pickCount) || input.pickCount < 1)) {
    return "العددُ واحدٌ فأكثر.";
  }
  return null;
}

/** سطرٌ لكلّ كلمة. الفارغُ يُسقَط، والمكرَّرُ تُسقطه القاعدةُ عند الإدراج. */
export function splitCustomWords(raw: string): string[] {
  return raw
    .split("\n")
    .map((w) => cleanText(w))
    .filter(Boolean)
    .slice(0, LIMITS.wordsMax);
}

/* ────────────────────────── اللصقُ الجماعيّ ────────────────────────── */

/**
 * **فاصلُ الكلمة عن معناها.**
 *
 * المسافةُ الجدوليّة أوّلًا لأنّها **لا تلتبس**: من نسخ خلايا إكسل أو Google Sheets
 * وصلته القيمُ مفصولةً بها، فيلصق ما نسخ ولا يتعلّم صيغةً جديدة. ثمّ النقطتان لمن
 * يكتب بيده.
 *
 * **والقسمةُ على أوّل فاصلٍ لا آخره:** المعنى العربيُّ قد يحمل نقطتين («الوَجْد: شدّةُ
 * الحبّ») فلو قُسِم على الأخير لضاع صدرُ المعنى.
 */
const BULK_SPLIT = /\t|:/;

export type BulkRow = { line: number; word: string; hint: string };
export type BulkError = { line: number; raw: string; reason: string };
export type BulkParse = { rows: BulkRow[]; errors: BulkError[] };

/**
 * يقرأ ما لُصِق سطرًا سطرًا: كلمةٌ ومعناها.
 *
 * **والمعنى إجباريّ** (قرار المالك ٢٠٢٦-٠٨-٢٦): سطرٌ بلا معنًى **خطأٌ يُعرَض** لا
 * صفٌّ يُحفَظ ناقصًا. وقيدُ القاعدة `guess_word_bank_hint_check` هو الحارسُ الأخير،
 * وهذا يمنع الرحلةَ إليه أصلًا ويقول للكاتب أيُّ سطرٍ أعوج.
 *
 * والفارغُ يُتخطّى بلا شكوى: من يلصق من جدولٍ تجيئه أسطرٌ خاليةٌ في الذيل.
 */
export function parseBulkWords(raw: string): BulkParse {
  const rows: BulkRow[] = [];
  const errors: BulkError[] = [];
  // المكرَّرُ داخل اللصقة نفسِها يُمسَك هنا: القاعدةُ تردّه بعُطلٍ لاتينيٍّ غامض،
  // وردُّه هنا يقول للكاتب أيُّ سطرٍ كرّر وأيُّ سطرٍ سبقه.
  const seen = new Map<string, number>();

  raw.split("\n").forEach((rawLine, i) => {
    const line = i + 1;
    const text = cleanText(rawLine);
    if (!text) return;

    const at = text.search(BULK_SPLIT);
    const word = cleanText(at === -1 ? text : text.slice(0, at));
    const hint = at === -1 ? "" : cleanText(text.slice(at + 1));

    if (!word) {
      errors.push({ line, raw: text, reason: "لا كلمةَ في السطر." });
      return;
    }
    if (word.length > LIMITS.bankWordMax) {
      errors.push({ line, raw: text, reason: `الكلمةُ تتجاوز ${LIMITS.bankWordMax} حرفًا.` });
      return;
    }
    if (!hint) {
      errors.push({ line, raw: text, reason: "بلا معنًى. اكتب: الكلمة ثمّ «:» ثمّ معناها." });
      return;
    }
    if (hint.length > LIMITS.bankHintMax) {
      errors.push({ line, raw: text, reason: `المعنى يتجاوز ${LIMITS.bankHintMax} حرفًا.` });
      return;
    }

    const key = word.toLocaleLowerCase("ar");
    const first = seen.get(key);
    if (first !== undefined) {
      errors.push({ line, raw: text, reason: `مكرَّرةٌ مع السطر ${first}.` });
      return;
    }
    seen.set(key, line);
    rows.push({ line, word, hint });
  });

  return { rows, errors };
}
