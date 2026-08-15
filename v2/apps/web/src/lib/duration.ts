/**
 * المدّةُ بالعربيّة — مصدرٌ واحد لكلّ عدٍّ تنازليّ في الموقع.
 *
 * كانت محبوسةً في `SurveyStatusLine` (جدولُ الجمع ودالّةُ العدّ)، فلمّا احتاجها كرتُ الانتخاب
 * كان الخياران: نسخُها (توأمٌ يفترق يومًا) أو رفعُها. ورُفعت.
 */

/** جمعٌ عربيّ للمعدود: [مفرد · مثنّى · جمع ٣–١٠ · مفرد منصوب ١١+]. */
const ar = (n: number, f: readonly [string, string, string, string]): string =>
  n === 1 ? f[0] : n === 2 ? f[1] : n >= 3 && n <= 10 ? `${n} ${f[2]}` : `${n} ${f[3]}`;

const DAY: readonly [string, string, string, string] = ["يوم", "يومين", "أيّام", "يومًا"];
const HOUR: readonly [string, string, string, string] = ["ساعة", "ساعتين", "ساعات", "ساعة"];
const MIN: readonly [string, string, string, string] = ["دقيقة", "دقيقتين", "دقائق", "دقيقة"];

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
