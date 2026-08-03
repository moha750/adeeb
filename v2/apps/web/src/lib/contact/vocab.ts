/**
 * مفردات رسائل التواصل — **المصدر الواحد** لأسمائها ونغماتها في اللوحة.
 *
 * القيم نفسها محروسةٌ في القاعدة بقيدَي `contact_messages_status_check` و
 * `contact_messages_priority_check`؛ فما هنا ترجمةٌ للعرض لا تعريفٌ ثانٍ. ومن زاد
 * قيمةً زادها في القيد أوّلًا، وإلّا رُدّت الكتابة عند الحدّ.
 */

export type ContactStatus = "new" | "read" | "replied" | "archived";
export type ContactPriority = "low" | "normal" | "high" | "urgent";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const CONTACT_STATUSES: { value: ContactStatus; label: string; tone: Tone }[] = [
  // «جديدة» نغمتُها تحذيريّة عمدًا: رسالةٌ لم تُقرأ دَينٌ على النادي لا حالةٌ محايدة.
  { value: "new", label: "جديدة", tone: "warning" },
  { value: "read", label: "مقروءة", tone: "info" },
  { value: "replied", label: "أُجيب عنها", tone: "success" },
  { value: "archived", label: "مؤرشفة", tone: "neutral" },
];

export const CONTACT_PRIORITIES: { value: ContactPriority; label: string; tone: Tone }[] = [
  { value: "low", label: "منخفضة", tone: "neutral" },
  { value: "normal", label: "عاديّة", tone: "info" },
  { value: "high", label: "عالية", tone: "warning" },
  { value: "urgent", label: "عاجلة", tone: "danger" },
];

export const statusLabel = (s: ContactStatus) =>
  CONTACT_STATUSES.find((x) => x.value === s)?.label ?? s;
export const statusTone = (s: ContactStatus): Tone =>
  CONTACT_STATUSES.find((x) => x.value === s)?.tone ?? "neutral";

export const priorityLabel = (p: ContactPriority) =>
  CONTACT_PRIORITIES.find((x) => x.value === p)?.label ?? p;
export const priorityTone = (p: ContactPriority): Tone =>
  CONTACT_PRIORITIES.find((x) => x.value === p)?.tone ?? "neutral";

/** حارسا القراءة — القاعدة قد تحمل قيمةً قديمةً لا نعرفها، فتُردّ إلى أقرب معنًى. */
export const asStatus = (v: unknown): ContactStatus =>
  v === "read" || v === "replied" || v === "archived" ? v : "new";
export const asPriority = (v: unknown): ContactPriority =>
  v === "low" || v === "high" || v === "urgent" ? v : "normal";
