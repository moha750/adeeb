/**
 * ما تحتاجه رسالةُ واتساب من صياغةٍ عربيّة، مكتوبًا لـDeno.
 *
 * **توأمٌ مقصودٌ لا يُستورَد** لأنّ بين الويب والحافة حدَّ زمنَي تشغيل. ولكلّ دالّةٍ ههنا
 * أصلٌ مسمًّى، ومن غيّر هناك غيّر ههنا:
 *
 * | ههنا | أصلُها |
 * | --- | --- |
 * | `fmtDate` | `v2/packages/core/src/dates.ts` |
 * | `ordinalWord` | `v2/apps/web/src/lib/warnings/vocab.ts` |
 * | `positionLine` | `v2/packages/core/src/positionLabel.ts` |
 * | `salutation` | `v2/apps/web/src/lib/warnings/message.ts` |
 * | `leftPhrase` | `v2/apps/web/src/lib/warnings/message.ts` |
 *
 * **والغايةُ أن يقرأ العضوُ في المحادثة ما يقرؤه في الخطاب سواءً**: القالبُ المعتمَد يحمل
 * النداءَ والرتبةَ والتاريخَ والباقي، وكلُّها هي التي رُسمت على الورقة بعينها.
 */

const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const CLUB_TZ = "Asia/Riyadh";

/** «٢١ أغسطس ٢٠٢٦» بتوقيت النادي لا بتوقيت الخادم (وخوادمُ الحافة تعمل بـUTC). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  const month = Number(get("month"));
  return `${Number(get("day"))} ${MONTHS[month - 1]} ${get("year")}`;
}

/** رتبةُ الإنذار كلمةً. والحدُّ ثلاثةٌ، فما جاوزه يُقال رقمًا لا اجتهادًا في الصرف. */
export function ordinalWord(n: number): string {
  return n === 1 ? "الأوّل" : n === 2 ? "الثاني" : n === 3 ? "الثالث" : `رقم ${n}`;
}

/**
 * مسمّى الشخص: رتبتُه ووحدةُ إسناده **بمسافةٍ لا فاصل** («عضو لجنة التأليف»). ويُرجِع
 * `null` إن لم يبقَ نصّ، فيختار النداءُ ما يليق بالغياب.
 */
export function positionLine(rank?: string | null, unitName?: string | null): string | null {
  return [(rank ?? "").trim(), (unitName ?? "").trim()].filter(Boolean).join(" ").trim() || null;
}

/** تأنيث الرتبة في النداء: «قائد» ← «قائدة». والرتبةُ أوّلُ كلمةٍ في اسم المنصب. */
const FEMININE: Record<string, string> = {
  "قائد": "قائدة",
  "نائب": "نائبة",
  "عضو": "عضوة",
  "منسّق": "منسّقة",
  "منسق": "منسقة",
  "رئيس": "رئيسة",
  "مستشار": "مستشارة",
};

export type Gender = "male" | "female" | null;

/**
 * سطرُ النداء — **المسمّى كاملًا بلا فاصل**: «عضو لجنة التأليف أحمد محمد» ·
 * «قائدة لجنة التصميم زهراء العريفي». وبلا منصبٍ: «الأدِيب فلان» و«الأدِيبة فلانة»
 * (نسبةٌ إلى النادي لا نداءٌ عامّ، قرار المالك).
 *
 * والمجهولُ الجنسِ يأخذ صيغة المذكّر: لا نخترع له جنسًا، ولا نُثقل الجملة بالوجهين.
 */
export function salutation(args: {
  name: string;
  gender: Gender;
  role?: string | null;
  committee?: string | null;
}): string {
  const name = (args.name ?? "").trim();
  const title = positionLine(args.role, args.committee);
  if (!title) return `${args.gender === "female" ? "الأدِيبة" : "الأدِيب"} ${name}`.trim();

  // الرتبةُ أوّلُ كلمةٍ في المسمّى، وهي وحدَها ما يُؤنَّث
  const [head, ...rest] = title.split(" ");
  const named = args.gender === "female" ? [FEMININE[head] ?? head, ...rest].join(" ") : title;
  return `${named} ${name}`.trim();
}

/** «إنذارٌ واحد» · «إنذاران» · «٣ إنذارات» — تمييزٌ عربيّ لِما بقي قبل الحدّ. */
export function leftPhrase(activeCount: number, limit: number): string {
  const left = Math.max(0, limit - activeCount);
  return left === 1 ? "إنذارٌ واحد" : left === 2 ? "إنذاران" : `${left} إنذارات`;
}
