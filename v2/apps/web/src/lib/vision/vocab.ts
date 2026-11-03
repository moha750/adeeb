/**
 * **حالُ هدف الرؤية** — قيمُه تطابق قيدَ `vision_goals.status` في القاعدة (`20261103153757_visions.sql`)،
 * فلا تُضاف قيمةٌ هنا بلا ترحيل. ملفٌّ بلا إطار: يقرؤه الخادمُ والعميل.
 *
 * والنغمةُ لونُ الشارة: «تحقّق» خضراء (الحالُ تملأ الشارةَ بلونها، كـ«منشور»)، و«قيد العمل» بلون الهويّة،
 * و«لم يبدأ» محايدة. والقطعةُ في الهلال لا تُضاء إلّا بـ«تحقّق».
 */
export const GOAL_STATUSES = ["pending", "active", "done"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_STATUS: Record<GoalStatus, { label: string; tone: "neutral" | "info" | "ok" }> = {
  pending: { label: "لم يبدأ", tone: "neutral" },
  active: { label: "قيد العمل", tone: "info" },
  done: { label: "تحقّق", tone: "ok" },
};

export const isGoalStatus = (v: unknown): v is GoalStatus => typeof v === "string" && (GOAL_STATUSES as readonly string[]).includes(v);

/** مفاتيحُ رموز المسارات — تطابق قيدَ `vision_tracks.icon` (حروفٌ لاتينيّة صغيرة). والرسمُ في `app/vision/_parts/trackIcon.tsx`. */
export const TRACK_ICONS = ["users", "presentation", "megaphone", "device", "target"] as const;
export type TrackIcon = (typeof TRACK_ICONS)[number];

/** مسارُ صفحة الرؤية العلنيّة — هنا لا في `page.ts` (خادميٌّ بـ`revalidatePath`) لأنّ غرفةَ البوّابة العميليّة تربط بها أيضًا. */
export const VISION_PATH = "/vision";
