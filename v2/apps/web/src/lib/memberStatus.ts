/**
 * حالة العضويّة — **المصدر الواحد** لمفرداتها ولمفردات عرضها.
 *
 * كانت تُكتب ثلاث مرّات: خريطة القاعدة في `members/data.ts`، والتسمية/النغمة/نقطة الأفتار في
 * `MembersView`، وتسميةٌ ونغمةٌ ثالثة في `credentials/CredentialsView` — ثلاثة أجوبةٍ لسؤالٍ واحد
 * تفترق يوم تُضاف حالة. فجُمعت هنا: الحالات الأربع، ومن أين تُقرأ، وكيف تُقال.
 *
 * المفردات الحيّة في العمود `account_status` أربع لا خامس لها (لا `terminated`) — وتاريخ الإنهاء
 * في `terminated_at` لا في `updated_at`.
 */
export type MemberStatus = "active" | "pending" | "suspended" | "inactive";

/** عمود `account_status` ← حالة العرض. وما لا يُعرَف يقع «غير نشط» (آمنٌ افتراضًا). */
export const MEMBER_STATUS_OF: Record<string, MemberStatus> = {
  active: "active",
  pending_onboarding: "pending",
  suspended: "suspended",
  inactive: "inactive",
};

/**
 * كيف تُقال الحالة: تسميتها · نغمة شارتها · لون نقطة الأفتار (نظام `.av-dot`).
 * الثلاثة في صفٍّ واحد لأنّها وجوهُ حالةٍ واحدة — فلا تُغيَّر تسميةٌ وتبقى نغمتها على القديم.
 */
export const MEMBER_STATUS: Record<
  MemberStatus,
  { label: string; tone: "success" | "warning" | "danger" | "neutral"; dot: "online" | "away" | "busy" | "offline" }
> = {
  active: { label: "نشط", tone: "success", dot: "online" },
  pending: { label: "قيد الإكمال", tone: "warning", dot: "away" },
  suspended: { label: "موقوف", tone: "danger", dot: "busy" },
  inactive: { label: "غير نشط", tone: "neutral", dot: "offline" },
};
