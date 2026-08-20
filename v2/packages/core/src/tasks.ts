// مفرداتُ المهامّ — **مصدرٌ واحدٌ للّوحة والجوّال**. لا شيءَ خادميّ ههنا ولا إطار.
// وكلُّ قيمةٍ يحرسها قيدٌ في القاعدة (`task_assignments_state_check` · `tasks_status_check`)،
// فلا تُزاد قيمةٌ قبل توسيع القيد بترحيل. ويقرأ منها **الإنذارُ الآليّ** حالَ `missed`،
// فهي مفرداتُ حكمٍ لا زينة.

export type TaskState = "pending" | "delivered" | "missed" | "excused";
export type TaskStatus = "open" | "closed" | "cancelled";

export const STATE_META: Record<TaskState, { label: string; tone: "neutral" | "success" | "danger" | "warning" }> = {
  pending: { label: "معلّقة", tone: "neutral" },
  delivered: { label: "سُلّمت", tone: "success" },
  missed: { label: "لم تُسلَّم", tone: "danger" },
  // «معذور» صمّامُ الأمان: ظرفٌ يعرفه القائد، فلا يصير إنذارًا آليًّا.
  excused: { label: "معذور", tone: "warning" },
};

export const STATE_VALUES = Object.keys(STATE_META) as TaskState[];

/** ما يؤشّره القائد — «معلّقة» ليست تأشيرًا بل عودةٌ إلى الانتظار، فتُعرَض منفصلةً. */
export const MARKABLE: TaskState[] = ["delivered", "missed", "excused"];

export const STATUS_META: Record<TaskStatus, { label: string }> = {
  open: { label: "مفتوحة" },
  closed: { label: "مغلقة" },
  cancelled: { label: "ملغاة" },
};
