/**
 * المدّةُ بالعربيّة — مصدرٌ واحد لكلّ عدٍّ تنازليّ في الموقع.
 *
 * كانت محبوسةً في `SurveyStatusLine` (جدولُ الجمع ودالّةُ العدّ)، فلمّا احتاجها كرتُ الانتخاب
 * كان الخياران: نسخُها (توأمٌ يفترق يومًا) أو رفعُها. ورُفعت.
 */

// جمعُ المعدود رُفع إلى `lib/arabicCount` يومَ طلبه عدُّ الكلمات والأسطر — القاعدةُ
// واحدةٌ لا تخصّ المدّة، ونسخُها توأمٌ يفترق يومًا.
import { arCount as ar, type ArForms } from "./arabicCount";

const DAY: ArForms = ["يوم", "يومين", "أيّام", "يومًا"];
const HOUR: ArForms = ["ساعة", "ساعتين", "ساعات", "ساعة"];
const MIN: ArForms = ["دقيقة", "دقيقتين", "دقائق", "دقيقة"];

/**
 * المدّةُ مقروءةً **بأدقّ وحدةٍ وحدها** (لا «٣ أيّام و٤ ساعات»): «٥ أيّام» · «ساعتين» · «دقيقة».
 * وما دون الدقيقة «الآن». تأخذ فرقًا بالمللي ثانية، وإشارتُه لا تعنيها (الاتّجاه للمستدعي).
 */
export const arDuration = (ms: number): string => {
  const a = Math.abs(ms);
  if (a < 60_000) return "الآن";
  if (a < 3_600_000) return ar(Math.round(a / 60_000), MIN);
  if (a < 86_400_000) return ar(Math.round(a / 3_600_000), HOUR);
  return ar(Math.round(a / 86_400_000), DAY);
};

/** «بعد …» للمستقبل و«قبل …» للماضي (دارجة، باختيار المالك). */
export const arCountdown = (target: number, now: number): string => {
  const diff = target - now;
  const d = arDuration(diff);
  return d === "الآن" ? d : `${diff >= 0 ? "بعد" : "قبل"} ${d}`;
};
