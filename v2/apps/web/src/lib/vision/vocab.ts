/**
 * **حالُ هدف الرؤية** — قيمُه تطابق قيدَ `vision_goals.status` في القاعدة (`20261103153757_visions.sql`، و«أُنجز» من
 * `20261122110810_vision_workflow.sql`)، فلا تُضاف قيمةٌ هنا بلا ترحيل. ملفٌّ بلا إطار: يقرؤه الخادمُ والعميل.
 *
 * والنغمةُ لونُ الشارة: «تحقّق» خضراء (الحالُ تملأ الشارةَ بلونها، كـ«منشور»)، و«أُنجز» كهرمانيّة (تنتظر من يؤكّدها)،
 * و«قيد العمل» بلون الهويّة، و«لم يبدأ» محايدة. والقطعةُ في الهلال لا تُضاء إلّا بـ«تحقّق»، والصفحةُ العلنيّة ترى «أُنجز» «قيد العمل».
 */
export const GOAL_STATUSES = ["pending", "active", "reported", "done"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_STATUS: Record<GoalStatus, { label: string; tone: "neutral" | "info" | "warn" | "ok" }> = {
  pending: { label: "لم يبدأ", tone: "neutral" },
  active: { label: "قيد العمل", tone: "info" },
  reported: { label: "أُنجز", tone: "warn" },
  done: { label: "تحقّق", tone: "ok" },
};

/**
 * **أفعالُ الحال** (`vision_goal_act` في القاعدة، وفيها قيودُها): قائدُ المسار يبدأ ويُرجع ويرفع «أُنجز» ويسحبه، والمشرفُ العامّ
 * وقائدُ الرؤية يؤكّدان «تحقّق» أو يُرجعان بسبب أو يُلغيان التحقّق — ومن رفع «أُنجز» لا يؤكّده.
 */
export const GOAL_ACTS = ["start", "unstart", "report", "withdraw", "confirm", "return", "unconfirm"] as const;
export type GoalAct = (typeof GOAL_ACTS)[number];
export const isGoalAct = (v: unknown): v is GoalAct => typeof v === "string" && (GOAL_ACTS as readonly string[]).includes(v);

export const isGoalStatus = (v: unknown): v is GoalStatus => typeof v === "string" && (GOAL_STATUSES as readonly string[]).includes(v);

/** مفاتيحُ رموز المسارات — تطابق قيدَ `vision_tracks.icon` (حروفٌ إنجليزيّة صغيرة وشرطات). والرسمُ في `app/vision/_parts/trackIcon.tsx`. */
export const TRACK_ICONS = [
  "users", "presentation", "megaphone", "device", "book", "handshake", "lightbulb", "chart",
  "trophy", "target", "heart", "graduation", "microphone", "pen", "globe", "compass",
] as const;
export type TrackIcon = (typeof TRACK_ICONS)[number];
export const isTrackIcon = (v: unknown): v is TrackIcon => typeof v === "string" && (TRACK_ICONS as readonly string[]).includes(v);
/** اسمُ الرمز في شبكة اختياره بمحرّر الرؤية (تلميحُه واسمُه لقارئ الشاشة) */
export const TRACK_ICON_LABEL: Record<TrackIcon, string> = {
  users: "الأعضاء والفريق", presentation: "الفعاليات", megaphone: "الإعلام والصدى", device: "الرقمي", book: "المعرفة والثقافة",
  handshake: "الشراكات", lightbulb: "الأفكار والإبداع", chart: "النموّ والأرقام", trophy: "التميّز", target: "هدفٌ عامّ",
  heart: "التطوّع والأثر", graduation: "التعليم والتدريب", microphone: "الحوار والمنابر", pen: "الكتابة والأدب", globe: "الانتشار والوصول", compass: "التوجّه والقيم",
};

/** يومٌ يقع في التقويم (لا «٣١ فبراير» تجتاز الصيغةَ ثمّ يسقط بها التحويلُ في القاعدة) */
export const isRealDay = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** مسارُ صفحة الرؤية العلنيّة — هنا لا في `page.ts` (خادميٌّ بـ`revalidatePath`) لأنّ غرفةَ البوّابة العميليّة تربط بها أيضًا. */
export const VISION_PATH = "/vision";
