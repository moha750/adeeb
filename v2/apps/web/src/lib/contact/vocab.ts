/**
 * مفردات رسائل التواصل — **المصدر الواحد** لأسمائها ونغماتها في اللوحة.
 *
 * الحالاتُ ثلاثٌ: جديدة · مقروءة · أُجيب عنها. والقيم محروسةٌ في القاعدة
 * (`contact_messages_status_check`)، فما هنا ترجمةٌ للعرض لا تعريفٌ ثانٍ.
 *
 * والقيدُ يقبل `archived` وللجدول عمود `priority` — واللوحة لا تكتبهما ولا تعرضهما
 * (٢٠٢٦-٠٨-٠٨): أولويّةٌ أداةُ ترتيب طابورٍ لا طابورَ له، وأرشفةٌ إغلاقٌ بلا جواب لا
 * واقعةَ له. فبقيا في القاعدة أثرًا خامدًا، ولا صفَّ حيًّا يحمل `archived`.
 */

export type ContactStatus = "new" | "read" | "replied";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const CONTACT_STATUSES: { value: ContactStatus; label: string; tone: Tone }[] = [
  // «جديدة» نغمتُها تحذيريّة عمدًا: رسالةٌ لم تُقرأ دَينٌ على النادي لا حالةٌ محايدة.
  { value: "new", label: "جديدة", tone: "warning" },
  { value: "read", label: "مقروءة", tone: "info" },
  { value: "replied", label: "أُجيب عنها", tone: "success" },
];

export const statusLabel = (s: ContactStatus) =>
  CONTACT_STATUSES.find((x) => x.value === s)?.label ?? s;
export const statusTone = (s: ContactStatus): Tone =>
  CONTACT_STATUSES.find((x) => x.value === s)?.tone ?? "neutral";

/** حارس القراءة — ما لا تعرفه اللوحة (قيمةٌ خامدة) يعود «جديدة»، فيُرى ولا يختفي. */
export const asStatus = (v: unknown): ContactStatus => (v === "read" || v === "replied" ? v : "new");
