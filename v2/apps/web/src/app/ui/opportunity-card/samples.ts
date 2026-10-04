import type { OppCard, OppHandlers } from "../../dashboard/volunteering/OpportunityCard";
import { periodsSeats, type OppPeriod } from "@/lib/volunteerPeriods";

/**
 * عيّنةُ معرض كرت الفرصة، على أحوال الحياة لا على الحقول. في ملفٍّ مستقلّ لأنّ ملفَّ الصفحة في Next
 * لا يُصدِّر إلّا صفحتَه (وكانت تشاركها صفحةُ مقارنةٍ أُعدمت ٢٠٢٦-١٠-٠١).
 */
export const TODAY = "2026-09-30";
export const noop = () => {};
export const H: OppHandlers = { onEdit: noop, onPublish: noop, onCopy: noop, onClose: noop };

const BASE: OppCard = {
  id: "1", title: "مُنظّمة لمعرض اليوم الوطني", status: "open", seats: 2, accepted: 2, pending: 2,
  committee: "لجنة الفعاليات", targetGender: "female", dateLabel: null, timeLabel: "أربع ساعاتٍ يوميًّا", dailyFrom: null, dailyTo: null,
  startsOn: "2026-09-28", endsOn: "2026-09-29", description: "", durationNote: "أربع ساعاتٍ يوميًّا",
  location: "بهو كلّيّة الآداب", committeeId: 1,
  rejected: 1, expired: 0, attended: 0, absent: 0, owed: 0, withheld: 0, certified: 0, attendees: 0,
  // عيّناتُ ما قبل الفترات: موعدُها ومقاعدُها على الفرصة نفسِها
  periods: [], legacy: false, flexible: false, endedAt: null,
};

// عيّنةٌ على أحوال الحياة لا على الحقول (واليومُ ٣٠ سبتمبر): انقضت ولم يُسجَّل حضورُها وفيها طلبان
// معلّقان · انقضت وحضورُها مسجَّلٌ وشهادتُها لم تصدر · قادمةٌ عليها طلبٌ ينتظر · مسوّدةٌ بلا موعد ·
// مغلقةٌ انقضت بلا أحد · مكتملةٌ بشهاداتها
export const SAMPLE: OppCard[] = [
  BASE,
  {
    ...BASE, id: "2", title: "مُنظّمين رُكن أدِيب لمعرض اليوم الوطني", seats: null, accepted: 1, pending: 0,
    targetGender: "male", location: null, durationNote: null, timeLabel: null, rejected: 0, attended: 1, absent: 0, owed: 1, withheld: 0, attendees: 1,
  },
  {
    ...BASE, id: "3", title: "مصوّرو الأمسية الشعريّة الختاميّة لموسم أدِيب الثقافيّ على المسرح الرئيس",
    seats: 5, accepted: 3, pending: 1, committee: "لجنة التصوير", targetGender: null,
    startsOn: "2026-10-12", endsOn: null, durationNote: null, location: "المسرح الرئيس", rejected: 2,
    dailyFrom: "19:00", dailyTo: "22:00", timeLabel: "من 7 م إلى 10 م",
  },
  {
    ...BASE, id: "4", title: "مصوّر في معرض التطوّع", status: "draft", seats: 3, accepted: 0, pending: 0,
    committee: null, committeeId: null, targetGender: null, startsOn: null, endsOn: null,
    location: "مركز الملك سلمان", durationNote: null, timeLabel: null, rejected: 0,
  },
  {
    ...BASE, id: "5", title: "تغطية معرض اليوم الوطني", status: "closed", seats: null, accepted: 0, pending: 0,
    committee: "لجنة التصوير", targetGender: "male", startsOn: "2026-09-27", endsOn: "2026-09-29",
    location: null, durationNote: null, timeLabel: null, rejected: 0,
  },
  {
    ...BASE, id: "6", title: "استقبال ضيوف أمسية الشعر النبطيّ", status: "closed", seats: 4, accepted: 4, pending: 0,
    committee: "لجنة العلاقات العامّة", targetGender: "male", startsOn: "2026-09-20", endsOn: null,
    location: "قاعة الملك فيصل", durationNote: null, timeLabel: null, rejected: 3, attended: 3, absent: 1, owed: 0, withheld: 0, certified: 3, attendees: 3,
  },
  // فرصةُ يومٍ بفترتين (٢٠٢٦-١٠-٠١): الصباحيّةُ عليها طلبان والمسائيّةُ امتلأت. مقاعدُها مجموعُ الفترتين
  {
    ...BASE, id: "10", title: "منظّمو يوم المهنة", status: "open", committee: "لجنة العلاقات العامّة", targetGender: null,
    startsOn: "2026-10-15", endsOn: null, location: "بهو الجامعة", durationNote: null, timeLabel: null,
    seats: 6, accepted: 4, pending: 2, rejected: 0,
    periods: [
      { id: "p1", day: "2026-10-15", from: "08:00", to: "12:00", seats: 3, accepted: 1, pending: 2 },
      { id: "p2", day: "2026-10-15", from: "16:00", to: "20:00", seats: 3, accepted: 3, pending: 0 },
    ],
  },
  // مرنةٌ بلا يومٍ ولا ساعة (٢٠٢٦-١٠-٠١): آخرُ يومها في نوفمبر، والمقبولان يعملان
  {
    ...BASE, id: "11", title: "مصمّمو منشورات حملة التسجيل", status: "closed", committee: "لجنة التصميم", targetGender: null,
    flexible: true, startsOn: null, endsOn: "2026-11-05", location: null, durationNote: null, timeLabel: null,
    seats: 2, accepted: 2, pending: 0, rejected: 1,
  },
  // مغلقةُ التقديم وقد مضى يومُها ولم يُسجَّل حضورُها: «مغلقة» حيّةٌ في «تنتظرك» (لونُ الهويّة لا الرصاص)
  {
    ...BASE, id: "9", title: "مُنظّمو ملتقى القرّاء", status: "closed", seats: 3, accepted: 3, pending: 0, rejected: 1,
    committee: "لجنة الفعاليات", targetGender: null, startsOn: "2026-09-29", endsOn: null,
    location: "المكتبة المركزيّة", durationNote: null, dailyFrom: "17:00", dailyTo: "21:00", timeLabel: "من 5 م إلى 9 م",
  },
  // «في طريقها» (للمبسّط): مفتوحةٌ للتقديم بلا طلبٍ معلّق · مغلقةُ التقديم وموعدُها لم يأتِ، ووقتُها يعبر
  // منتصفَ الليل (أقرّه المالك في اليوم نفسه)
  {
    ...BASE, id: "7", title: "مرشدو زوّار معرض الكتاب", seats: 6, accepted: 2, pending: 0, rejected: 1,
    committee: "لجنة العلاقات العامّة", targetGender: null, startsOn: "2026-10-30", endsOn: "2026-11-02",
    location: "أرض المعارض", durationNote: null, dailyFrom: "16:00", dailyTo: "22:00", timeLabel: "من 4 م إلى 10 م",
  },
  {
    ...BASE, id: "8", title: "تصوير حفل الخرّيجين", status: "closed", seats: 3, accepted: 3, pending: 0, rejected: 2,
    committee: "لجنة التصوير", targetGender: "male", startsOn: "2026-10-08", endsOn: null,
    location: "الصالة الرياضيّة", durationNote: null, dailyFrom: "19:00", dailyTo: "00:00", timeLabel: "من 7 م إلى 12 ص",
  },
];

/* ══ كلُّ الحالات (`/ui/opportunity-card/states`، طلبُ المالك ٢٠٢٦-١٠-٠٣: «بكلّ حالاتها بلا استثناء») ══
   عيّنةٌ لكلّ ما يقوله الكرت: كلُّ خطوةٍ تالية (`nextStep`) وكلُّ شارة (`monoState`) وكلُّ ورقة تقويم (يومٌ ·
   جارية · انتهت · لم يُحدَّد · آخرُ يوم · مرنة)، وصيغُ الموعد كلُّها (فترةٌ · فترتان في يوم · فتراتٌ في أيّام ·
   فترةٌ تعبر منتصفَ الليل · مرنة · ما قبل الفترات)، والغائبُ من الحقائق. والتبويبُ لا يُكتب هنا بل يُحسب
   (`shelfOf`)، فلا تقع عيّنةٌ في غير رفّها. واليومُ ٣٠ سبتمبر كسائر المعرض. */

const CLEAN: OppCard = {
  ...BASE, id: "", title: "", status: "open", seats: null, accepted: 0, pending: 0, rejected: 0,
  attended: 0, absent: 0, owed: 0, withheld: 0, certified: 0, attendees: 0,
  committee: "لجنة الفعاليات", committeeId: 1, targetGender: null, location: "بهو كلّيّة الآداب",
  dateLabel: null, timeLabel: null, dailyFrom: null, dailyTo: null, durationNote: null, startsOn: null, endsOn: null,
  periods: [], legacy: false, flexible: false, endedAt: null,
};
const per = (day: string, from: string, to: string, seats: number | null, accepted = 0, pending = 0): OppPeriod =>
  ({ id: `${day}-${from}`, day, from, to, seats, accepted, pending });
/** فرصةٌ بفترات: أوّلُ يومٍ وآخرُه ومقاعدُها من فتراتها، كما يكتبها المشغّلُ في القاعدة. */
const timed = (o: Partial<OppCard>, ps: OppPeriod[]): OppCard => {
  const days = ps.map((p) => p.day).sort();
  return { ...CLEAN, ...o, periods: ps, startsOn: days[0], endsOn: days.at(-1)!, seats: periodsSeats(ps) };
};
const flex = (o: Partial<OppCard>): OppCard => ({ ...CLEAN, committee: "لجنة المحتوى", location: null, ...o, flexible: true });

export type StateSample = { caption: string; why: string; o: OppCard };

export const STATES: StateSample[] = [
  // ── تنتظرك
  { caption: "مسوّدة بلا موعد", why: "لم تُنشر ولا فترات لها بعد",
    o: { ...CLEAN, id: "d1", title: "مصوّر في معرض التطوّع", status: "draft", committee: null, committeeId: null, location: "مركز الملك سلمان" } },
  { caption: "مسوّدة بفترتين في يوم", why: "موعدُها مكتوبٌ ولم تُنشر",
    o: timed({ id: "d2", title: "مستقبلو ضيوف ملتقى الإعلام", status: "draft", committee: "لجنة العلاقات العامّة", targetGender: "female", location: "قاعة الملك فيصل" },
      [per("2026-10-20", "09:00", "12:00", 4), per("2026-10-20", "13:00", "16:00", 4)]) },
  { caption: "مسوّدة مرنة", why: "بلا يومٍ ولا ساعة، ولم تُنشر",
    o: flex({ id: "d3", title: "كتّاب محتوى نشرة النادي", status: "draft", seats: 3 }) },
  { caption: "طلبات تنتظر المراجعة", why: "متاحة، وفيها ثلاثة طلبات معلّقة (والعنوانُ طويل)",
    o: timed({ id: "d4", title: "مصوّرو الأمسية الشعريّة الختاميّة لموسم أدِيب الثقافيّ على المسرح الرئيس", committee: "لجنة التصوير", location: "المسرح الرئيس", pending: 3, accepted: 1, rejected: 1 },
      [per("2026-10-12", "19:00", "22:00", 5, 1, 3)]) },
  { caption: "انتهت وحضورها لم يُؤكَّد", why: "انتهى التقديم، ومضى يومها",
    o: timed({ id: "d7", title: "مُنظّمو ملتقى القرّاء", status: "closed", accepted: 3, rejected: 1, location: "المكتبة المركزيّة" },
      [per("2026-09-29", "17:00", "21:00", 3, 3)]) },
  { caption: "جارية الآن وحضورها ناقص", why: "ثلاث فترات في ثلاثة أيّام، اليومُ ثانيها",
    o: timed({ id: "d8", title: "مرشدو زوّار معرض الكتاب", status: "closed", committee: "لجنة العلاقات العامّة", location: "أرض المعارض", accepted: 8, attended: 4, absent: 1, owed: 4, attendees: 4, rejected: 2 },
      [per("2026-09-29", "16:00", "22:00", 4, 4), per("2026-09-30", "16:00", "22:00", 4, 4), per("2026-10-01", "16:00", "22:00", 4, 0)]) },
  { caption: "بانتظار شهادات الحاضرين", why: "فرصةٌ قبل الفترات، مدّتُها نصٌّ مكتوب",
    o: { ...CLEAN, id: "d9", title: "استقبال ضيوف أمسية الشعر النبطيّ", status: "closed", committee: "لجنة العلاقات العامّة", targetGender: "male", location: "قاعة الملك فيصل",
      startsOn: "2026-09-20", timeLabel: "أربع ساعات", durationNote: "أربع ساعات", legacy: true,
      seats: 4, accepted: 4, attended: 3, absent: 1, owed: 2, withheld: 0, certified: 1, attendees: 3, rejected: 3 } },
  { caption: "مرنة أُنهيت وإنجازها لم يُؤكَّد", why: "أنهاها المشرف بالزرّ، ولا آخرَ يومٍ لها",
    o: flex({ id: "d10", title: "مصمّمو منشورات حملة التسجيل", status: "closed", committee: "لجنة التصميم", endedAt: "2026-09-29T15:00:00Z", seats: 2, accepted: 2, rejected: 1 }) },
  { caption: "مرنة مضى آخر موعدها وشهاداتها لم تصدر", why: "أنجز اثنان ولم ينجز واحد",
    o: flex({ id: "d11", title: "مترجمو دليل العضو الجديد", status: "closed", endsOn: "2026-09-25", seats: 3, accepted: 3, attended: 2, absent: 1, owed: 2, attendees: 2 }) },

  // ── في طريقها
  { caption: "متاحة ولا متقدّمين بعد", why: "فترةٌ تعبر منتصف الليل",
    o: timed({ id: "f1", title: "تصوير حفل الخرّيجين", committee: "لجنة التصوير", targetGender: "male", location: "الصالة الرياضيّة" },
      [per("2026-10-08", "19:00", "00:00", 3)]) },
  { caption: "متاحة وقُبل بعضهم", why: "فترتان في يومين",
    o: timed({ id: "f2", title: "منظّمو يوم المهنة", committee: "لجنة العلاقات العامّة", location: "بهو الجامعة", accepted: 2, rejected: 1 },
      [per("2026-10-15", "08:00", "12:00", 3, 1), per("2026-10-16", "16:00", "20:00", 3, 1)]) },
  { caption: "متاحة والعدد مفتوح", why: "بلا لجنة، والعددُ متروكٌ فارغًا",
    o: timed({ id: "f3", title: "متطوّعو حملة التبرّع بالدم", committee: null, committeeId: null, location: "المستشفى الجامعيّ", accepted: 3 },
      [per("2026-10-05", "09:00", "13:00", null, 3)]) },
  { caption: "متاحة واكتمل عددها", why: "نادرة: قبولُ آخر مقعدٍ يغلق التقديم",
    o: timed({ id: "f4", title: "مقدّمو فقرات اليوم المفتوح", accepted: 2, rejected: 2 },
      [per("2026-10-10", "10:00", "12:00", 2, 2)]) },
  { caption: "انتهى التقديم والموعد لم يأتِ", why: "اكتمل العدد فأُغلق، فترتان في يوم",
    o: timed({ id: "f5", title: "مُنظّمو بطولة الإلقاء", status: "closed", targetGender: "female", location: "مسرح كلّيّة الآداب", accepted: 4, rejected: 1 },
      [per("2026-10-18", "17:00", "19:00", 2, 2), per("2026-10-18", "19:30", "21:30", 2, 2)]) },
  { caption: "جارية الآن ولا شيء عليك", why: "حضورُ ما مضى مسجّلٌ ومقيَّم",
    o: timed({ id: "f6", title: "مرشدو جناح أدِيب في معرض الجامعة", location: "أرض المعارض", accepted: 4, attended: 4, owed: 0, withheld: 0, certified: 2, attendees: 2 },
      [per("2026-09-29", "10:00", "14:00", 4, 2), per("2026-09-30", "10:00", "14:00", 4, 2), per("2026-10-02", "10:00", "14:00", 4, 0)]) },
  { caption: "مرنة متاحة ولها آخر موعد للإنجاز", why: "تُنهى بالزرّ أو بمرور يومها الأخير",
    o: flex({ id: "f7", title: "مصمّمو هويّة موسم أدِيب الثقافيّ", committee: "لجنة التصميم", endsOn: "2026-11-05", seats: 4, accepted: 1, rejected: 1 }) },
  { caption: "مرنة متاحة بلا آخر موعد", why: "والعددُ مفتوح",
    o: flex({ id: "f8", title: "كتّاب مقالات المدوّنة", accepted: 2 }) },
  { caption: "مرنة انتهى تقديمها والعمل جارٍ", why: "اكتمل عددها، وآخرُ يومها لم يأتِ",
    o: flex({ id: "f9", title: "مدقّقو نصوص الكتيّب السنويّ", status: "closed", endsOn: "2026-10-20", seats: 2, accepted: 2, rejected: 2 }) },
  { caption: "فرصة قبل الفترات بساعات يوميّة", why: "أيّامٌ متّصلة وساعتان تتكرّران",
    o: { ...CLEAN, id: "f10", title: "مرشدو زوّار معرض الكتاب الدوليّ", committee: "لجنة العلاقات العامّة", location: "أرض المعارض",
      startsOn: "2026-10-30", endsOn: "2026-11-02", dailyFrom: "16:00", dailyTo: "22:00", timeLabel: "من 4 م إلى 10 م", legacy: true, seats: 6, accepted: 2 } },

  // ── المنتهية
  { caption: "اكتملت بسجلّها وشهاداتها", why: "حضر الجميع وقُيّموا",
    o: timed({ id: "x1", title: "استقبال وفد جامعة الإمام", status: "closed", location: "مبنى الإدارة", accepted: 4, attended: 4, owed: 0, withheld: 0, certified: 4, attendees: 4, rejected: 1 },
      [per("2026-09-15", "09:00", "13:00", 4, 4)]) },
  { caption: "منتهية وفيها غائبون", why: "غاب اثنان، ولم يستحقّ الشهادةَ واحد",
    o: timed({ id: "x2", title: "منظّمو أمسية الشعر الفصيح", status: "closed", accepted: 5, attended: 3, absent: 2, owed: 0, withheld: 1, certified: 2, attendees: 3, rejected: 2 },
      [per("2026-09-10", "19:00", "22:00", 5, 5)]) },
  { caption: "انتهت بلا متقدّمين", why: "لم يتقدّم أحد",
    o: timed({ id: "x3", title: "تغطية لقاء المبتعثين", status: "closed", committee: "لجنة التصوير", location: null },
      [per("2026-09-22", "18:00", "20:00", 3)]) },
  // انتهى موعدُها والطلبان معلّقان، فأفاتهما الكنّاس وأغلق تقديمَها (٢٠٢٦-١٠-٠٣)
  { caption: "انتهت وطلباتها لم تُراجَع", why: "فات طلبان قبل المراجعة",
    o: timed({ id: "x6", title: "تغطية معرض اليوم الوطني", status: "closed", committee: "لجنة التصوير", targetGender: "male", location: null, expired: 2 },
      [per("2026-09-27", "16:00", "21:00", 4)]) },
  { caption: "انتهت بلا مشاركين بعد الردّ", why: "تقدّم ثلاثة ورُدّوا",
    o: timed({ id: "x4", title: "مقدّمو حفل الاستقبال", status: "closed", rejected: 3 },
      [per("2026-09-18", "18:00", "21:00", 2)]) },
  { caption: "مرنة أُنهيت واكتملت", why: "أنجز الجميع وصدرت شهاداتهم",
    o: flex({ id: "x5", title: "مصمّمو بطاقات اليوم الوطنيّ", status: "closed", committee: "لجنة التصميم", endedAt: "2026-09-24T12:00:00Z", seats: 3, accepted: 3, attended: 3, owed: 0, withheld: 0, certified: 3, attendees: 3 }) },
];
