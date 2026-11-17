import { Fragment } from "react";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { today } from "@/app/dashboard/_portal/time";
import type { MyReservation } from "@/app/me/data";
import type { VolunteerView } from "@/app/dashboard/_portal/volunteer";
import { HomeSummaryRoom, type HomeEvent, type HomeModel } from "@/app/_ad/rooms/HomeSummaryRoom";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٣): **الرئيسية «ملخّصُ الغرف بأشكالها»** بكلّ حالاتها في صفحةٍ واحدة، كلُّ حالٍ باسمه فوقه. السجلّاتُ مصنوعةٌ
 * بأسماءٍ مخترعة **وتواريخُها من اليوم** (كانت مختبرات الرئيسية بتواريخ ثابتةٍ فشاخت: «بعد 5 أيام» بجانب «اليوم 13 نوفمبر»). لا يُنقر فيها
 * ما يحجز أو يلغي: المعرّفاتُ مصنوعة. والرئيسيةُ الحاليّة للمقارنة: `/dashboard/ad/account?room=home&v=old`.
 */
export const metadata = { title: "الرئيسية: كل حالاتها" };

const day = (n: number) => { const d = new Date(`${today()}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const label = (iso: string) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]}`; };

const resv = (o: Partial<MyReservation>): MyReservation => ({
  id: "r", activityId: "a", name: "", type: "workshop", date: day(5), dateLabel: "", timeLabel: "", startTime: null, endTime: null,
  location: null, cancelled: false, upcoming: true, attended: false, whatsappConfirmed: false, ...o,
});
type Up = VolunteerView["upcoming"][number];
const shift = (o: Partial<Up> & { id: string; title: string; d: number }): Up => ({
  oppId: `o-${o.id}`, when: label(day(o.d)), say: "قُبلتِ، نراكِ في موعدكِ", tone: "ok", icon: "accepted", act: "excuse", day: day(o.d), ...o,
});
type Opp = VolunteerView["opps"][number];
const opp = (o: Partial<Opp> & { id: string; title: string; d?: number }): Opp => ({
  committee: "لجنة الفعاليّات", fit: false, sub: "", startsOn: o.d != null ? day(o.d) : null, dateLabel: o.d != null ? label(day(o.d)) : null, timeLabel: "من 4 إلى 8 مساءً",
  location: "بهو المكتبة المركزيّة", seatsLabel: "3 فترات متاحة", ...o,
});
const ev = (o: Partial<HomeEvent> & { id: string; title: string; d: number }): HomeEvent => ({ day: day(o.d), type: "workshop", timeLabel: "من 7 إلى 9 مساءً", location: "مسرح كلّيّة الآداب", seats: "باقٍ 6 مقاعد", ...o });

const EVENTS: HomeEvent[] = [
  ev({ id: "e1", title: "جلسة «القراءة في زمن الشاشات»", d: 6, type: "dialogue", seats: "مفتوحٌ بلا عدد" }),
  ev({ id: "e2", title: "أمسية الشعر الشتويّة", d: 20, type: "activity" }),
  ev({ id: "e3", title: "دورة الإلقاء", d: 25, type: "course", seats: "باقٍ مقعدان" }),
  ev({ id: "e4", title: "ورشة التصوير بالجوّال", d: 32 }),
];
const LAMA = { name: "لمى عبدالعزيز الشمري", avatar: null, gender: "female" as const, standing: "متطوّعة أدِيب", since: "متطوّعة أدِيب منذ سبتمبر 2026" };
const KHALID = { name: "خالد محمد العمر", avatar: null, gender: "male" as const, standing: "صديق أدِيب", since: "صديق أدِيب منذ أبريل 2026" };

const VOL_FULL: HomeModel = {
  firstName: "لمى", headline: "لك موعدٌ بعد يومين، وشهادةٌ جاهزة", volunteer: true, card: LAMA,
  cert: {
    title: "تنظيم معرض الكتاب", sub: "6 ساعات، بتميّز. صدرت قبل يومين.",
    paper: { name: LAMA.name, serial: "ADEEB-VOL-2026-0007-A1B2C3", opportunity: "تنظيم معرض الكتاب", gender: "female", from: day(-6), to: day(-4), hours: 6, distinction: "أدارت ركن الاستقبال وحدها بعد غياب زميلتها." },
  },
  shifts: [
    shift({ id: "s1", title: "استقبال ضيوف الأمسية الشعريّة", d: 2 }),
    shift({ id: "s2", title: "تصوير ورشة الكتابة", d: 9, say: "طلبكِ قيد المراجعة", tone: "wait", icon: "pending", act: "withdraw" }),
    shift({ id: "s3", title: "تنظيم ركن أدِيب في معرض القهوة", d: 14 }),
    shift({ id: "s4", title: "إدارة قاعة دورة الإلقاء", d: 25 }),
  ],
  shiftsTotal: 4,
  bookings: [resv({ id: "b1", activityId: "a1", name: "ورشة كتابة القصّة القصيرة", d: 0, date: day(5), timeLabel: "من 7 إلى 9 مساءً", location: "مسرح كلّيّة الآداب", whatsappConfirmed: true } as Partial<MyReservation>)],
  bookingsTotal: 1,
  trip: { hours: 26, nowNote: "منها 6 في نوفمبر", months: [], joined: 7, stars: 2, certs: 5 },
  prefs: ["لجنة الفعاليّات", "لجنة التصوير"],
  opps: [
    opp({ id: "p1", title: "تنظيم أمسية الشعر الشتويّة", d: 20, fit: true }),
    opp({ id: "p2", title: "تصوير اليوم المفتوح", d: 28, committee: "لجنة التصوير", fit: true }),
    opp({ id: "p3", title: "كتابة محتوى الموجز الشهريّ", committee: "لجنة الإعلام", flexible: true, seatsLabel: null, timeLabel: null, location: null }),
    opp({ id: "p4", title: "استقبال زوّار معرض الكتاب", d: 40 }),
  ],
  oppsTotal: 6,
  events: EVENTS, eventsTotal: 7,
};
const VOL_QUIET: HomeModel = {
  ...VOL_FULL, headline: "لا موعدَ ينتظرك، وفي لجانك فرصٌ مفتوحة", cert: null, shifts: [], shiftsTotal: 0, bookings: [], bookingsTotal: 0,
  opps: VOL_FULL.opps.slice(0, 2), oppsTotal: 2,
};
const VOL_NEW: HomeModel = {
  ...VOL_FULL, headline: "أهلًا بكِ في متطوّعي أدِيب", cert: null, shifts: [], shiftsTotal: 0, bookings: [], bookingsTotal: 0,
  trip: { hours: 0, nowNote: null, months: [], joined: 0, stars: 0, certs: 0 }, prefs: null, opps: [], oppsTotal: 0, events: [], eventsTotal: 0,
};
const FRIEND: HomeModel = {
  firstName: "خالد", headline: "لك حجزٌ بعد 5 أيام", volunteer: false, card: KHALID, cert: null, shifts: [], shiftsTotal: 0,
  bookings: [
    resv({ id: "b1", activityId: "a1", name: "ورشة كتابة القصّة القصيرة", date: day(5), timeLabel: "من 7 إلى 9 مساءً", location: "مسرح كلّيّة الآداب", whatsappConfirmed: true }),
    resv({ id: "b2", activityId: "a2", name: "جلسة «القراءة في زمن الشاشات»", type: "dialogue", date: day(6), location: "قاعة المكتبة المركزيّة" }),
  ],
  bookingsTotal: 2,
  friendTrip: { bookings: 8, upcoming: 2, attended: 4 },
  prefs: null, opps: [], oppsTotal: 0,
  events: EVENTS, eventsTotal: 7,
};
const FRIEND_NEW: HomeModel = {
  ...FRIEND, firstName: "سارة", headline: "أهلًا بكِ في أدِيب", card: { ...KHALID, name: "سارة فهد القحطاني", gender: "female", standing: "صديقة أدِيب", since: "صديقة أدِيب منذ اليوم" },
  bookings: [], bookingsTotal: 0, friendTrip: { bookings: 0, upcoming: 0, attended: 0 }, events: EVENTS.slice(0, 2), eventsTotal: 2,
};

const CASES: { name: string; m: HomeModel }[] = [
  { name: "متطوّعة، يومُها ممتلئ: شهادةٌ جاهزة، وأربعُ مشاركات وستُّ فرص (من كلٍّ اثنتان ثمّ «عرض الكل»)، وحجز، ورحلتُها", m: VOL_FULL },
  { name: "متطوّعة، لا مشاركةَ تنتظرها: رحلتُها، وفرصتان، والفعاليّات", m: VOL_QUIET },
  { name: "متطوّعةٌ جديدة لا شيء لها بعد", m: VOL_NEW },
  { name: "صديق أدِيب له حجزان: رحلتُه، والفعاليّات، والدعوة", m: FRIEND },
  { name: "صديقةٌ جديدة: الفعاليّات والدعوة", m: FRIEND_NEW },
];

export default async function HomeLab() {
  const denied = await denyUnless("/dashboard");
  if (denied) return denied;
  return (
    <>
      {CASES.map((c, i) => (
        <Fragment key={c.name}>
          <h2 className={i ? "ad-lab-h ad-lab-h-next" : "ad-lab-h"}>{c.name}</h2>
          <HomeSummaryRoom m={c.m} />
        </Fragment>
      ))}
    </>
  );
}
