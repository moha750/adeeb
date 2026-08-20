import { fmtDate } from "./dates";

/**
 * مهلةُ حذف الحساب — **مصدرٌ واحدٌ لعددٍ يُقال في ثلاث شاشات ودالّةِ قاعدة.**
 *
 * قرارُ المالك ١٩ أغسطس ٢٠٢٦: ثلاثون يومًا بين الطلب والتنفيذ، يعدل فيها صاحبُه بضغطة.
 * وتوأمُه في القاعدة `sweep_account_deletions` (`interval '30 days'`) — فإن تغيّر أحدُهما
 * وجب أن يتبعه الآخر، ولذلك كُتب العددُ ههنا مرّةً واحدةً لا في كلّ شاشةٍ نصًّا.
 */
export const DELETION_GRACE_DAYS = 30;

/**
 * يومُ التنفيذ كما يُعرَض: «١٨ سبتمبر ٢٠٢٦».
 *
 * والصياغةُ بـ`fmtDate` وحدَها لأنّها تثبّت `Asia/Riyadh`: خادمُ Vercel يعمل بـUTC، فطلبٌ
 * سُجّل بعد التاسعة مساءً بتوقيت الرياض يُعرَض بيومٍ سابقٍ لو حُسب بساعة الجهاز.
 */
export function deletionDueLabel(requestedAt: string | null): string | null {
  if (!requestedAt) return null;
  const at = new Date(requestedAt);
  if (Number.isNaN(at.getTime())) return null;
  return fmtDate(new Date(at.getTime() + DELETION_GRACE_DAYS * 86_400_000).toISOString());
}
