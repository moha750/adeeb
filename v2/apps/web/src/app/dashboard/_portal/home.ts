import "server-only";
import { fmtMonthYear } from "@/lib/dates";
import { getPublicActivities } from "@/app/activities/data";
import type { MyAccount } from "@/app/me/data";
import type { MyVolunteering } from "@/app/me/volunteering";
import type { ParticipationCertificate } from "@/lib/certificates/participation";
import { counted, dayLabel, daysUntil, seatsLeft, soonLabel, today } from "./time";

/**
 * **رئيسيّةُ البوّابة: ملخّصٌ لا نسخة** (قرار المالك ٢٠٢٦-١٠-١٢). تعرض ما يحتاج فعلًا الآن وحده،
 * وكلُّ سطرٍ يأخذك إلى غرفته؛ إلّا الشهادةُ الجاهزة فتُنزَّل في مكانها (خبرٌ مفرح). وترتيبُ «ينتظرك»:
 * الموعدُ القريب، ثمّ ما جهز لك، ثمّ الحجوزات. وما يُعرض هنا مبنيٌّ من قارئَي الغرف أنفسِهما
 * (`getMyAccount` و`getMyVolunteering`) فلا يفترق ما تقوله الرئيسيةُ عمّا تقوله الغرفة.
 */

/** شهادةٌ «جاهزة» ما صدرت في هذه المدّة: خبرُها جديد. */
const FRESH_DAYS = 14;

export type HomeWaiting =
  | { kind: "volunteer"; k: string; v: string; sub: string; href: string }
  | { kind: "certificate"; k: string; v: string; sub: string; paper: ParticipationCertificate }
  | { kind: "booking"; k: string; v: string; sub: string; href: string };

export type HomeView = {
  firstName: string;
  headline: string;
  volunteer: boolean;
  since: string;
  figs: { key: "hours" | "joined" | "certs" | "bookings" | "attended"; value: number; label: string; note?: string }[];
  waiting: HomeWaiting[];
  prefs: string[] | null;
  opps: { id: string; committee: string | null; fit: boolean; title: string; sub: string }[];
  events: { id: string; title: string; when: string; seats: string }[];
};

const firstWord = (s: string) => s.trim().split(/\s+/)[0] ?? "";


export async function buildHome({ name, account, vol }: {
  name: string;
  account: MyAccount | null;
  vol: MyVolunteering | null;
}): Promise<HomeView> {
  const volunteer = !!vol?.isVolunteer;
  const now = today();
  const month = Number(now.slice(5, 7));

  // ── ينتظرك ──
  const waiting: HomeWaiting[] = [];
  const nextShift = (vol?.applications ?? [])
    .filter((a) => a.status === "accepted" && !a.attendance && a.day && a.day >= now)
    .sort((a, b) => (a.day! < b.day! ? -1 : 1))[0];
  if (nextShift?.day) {
    waiting.push({
      kind: "volunteer",
      k: `موعد تطوّعك، ${soonLabel(nextShift.day)}`,
      v: nextShift.title,
      sub: nextShift.period ?? dayLabel(nextShift.day),
      href: `/dashboard/volunteer/${nextShift.opportunityId}`,
    });
  }
  // الأحدثُ أوّلَ القارئ، و«جاهزةٌ» ما صدرت في الأيّام الأخيرة: خبرُها جديد
  const latest = vol?.certificates[0];
  const freshCert = latest && daysUntil(latest.issuedOn) >= -FRESH_DAYS ? latest : null;
  if (freshCert) {
    waiting.push({
      kind: "certificate",
      k: "شهادتك جاهزة",
      v: freshCert.opportunityTitle,
      sub: [freshCert.hours ? counted(freshCert.hours, "ساعة", "ساعتان", "ساعات", "ساعة") : null, `صدرت في ${freshCert.issuedLabel}`].filter(Boolean).join("، "),
      paper: {
        name: freshCert.holderName, serial: freshCert.serial, opportunity: freshCert.opportunityTitle,
        gender: freshCert.gender ?? "male", from: freshCert.servedFrom, to: freshCert.servedTo,
        hours: freshCert.hours, distinction: freshCert.distinction,
      },
    });
  }
  const nextBooking = account?.upcoming[0];
  if (nextBooking) {
    waiting.push({
      kind: "booking",
      k: `حجزك القادم، ${soonLabel(nextBooking.date)}`,
      v: nextBooking.name,
      sub: [dayLabel(nextBooking.date), nextBooking.timeLabel].filter(Boolean).join("، "),
      href: "/dashboard/bookings",
    });
  }

  // ── الخلاصة عنوانًا ──
  const parts: string[] = [];
  if (nextShift?.day) parts.push(`لك موعدٌ ${soonLabel(nextShift.day)}`);
  if (freshCert) parts.push(parts.length ? "وشهادةٌ جاهزة" : "لك شهادةٌ جاهزة");
  if (!parts.length && nextBooking) parts.push(`لك حجزٌ ${daysUntil(nextBooking.date) <= 6 ? `يوم ${dayLabel(nextBooking.date).split(" ")[0]}` : soonLabel(nextBooking.date)}`);
  const headline = parts.length ? parts.join("، ") : "لا شيء ينتظرك الآن";

  // ── الأرقام ──
  const certs = vol?.certificates ?? [];
  const hours = certs.reduce((n, c) => n + (c.hours ?? 0), 0);
  const hoursNow = certs.filter((c) => Number(c.servedFrom.slice(5, 7)) === month && c.servedFrom.slice(0, 4) === now.slice(0, 4)).reduce((n, c) => n + (c.hours ?? 0), 0);
  const joined = (vol?.applications ?? []).filter((a) => a.attendance === "attended").length;
  const stars = certs.filter((c) => c.distinction).length;
  const booked = [...(account?.upcoming ?? []), ...(account?.past ?? [])].filter((r) => !r.cancelled);
  const attended = booked.filter((r) => r.attended).length;
  const figs: HomeView["figs"] = volunteer
    ? [
        { key: "hours", value: hours, label: "ساعة تطوّع", note: hoursNow ? `${hoursNow} منها في هذا الشهر` : undefined },
        { key: "joined", value: joined, label: "مشاركات", note: stars ? `${stars} منها بتميّز` : undefined },
        { key: "certs", value: certs.length, label: "شهادات" },
      ]
    : [
        { key: "bookings", value: booked.length, label: "حجوزات", note: account?.upcoming.length ? `${account.upcoming.length} منها قادم` : undefined },
        { key: "attended", value: attended, label: "فعاليّات حضرتها" },
      ];

  // ── ما تستكشفه ──
  const prefs = volunteer ? (vol?.prefs ?? []).filter(Boolean) : null;
  const opps = volunteer
    ? (vol?.open ?? [])
        .map((o) => ({
          id: o.id,
          committee: o.committee,
          fit: !!o.committee && (prefs ?? []).includes(o.committee),
          title: o.title,
          sub: [o.dateLabel, o.periods.length ? counted(o.periods.filter((p) => !p.mine && !p.full && !p.passed).length, "فترةٌ متاحة", "فترتان متاحتان", "فترات متاحة", "فترةً متاحة") : null].filter(Boolean).join("، "),
        }))
        .sort((a, b) => Number(b.fit) - Number(a.fit))
        .slice(0, 3)
    : [];

  const mine = new Set([...(account?.upcoming ?? [])].map((r) => r.activityId));
  const events = (await getPublicActivities())
    .filter((a) => !mine.has(a.id) && !a.full && a.date >= now)
    .slice(0, 3)
    .map((a) => ({ id: a.id, title: a.name, when: dayLabel(a.date), seats: seatsLeft(a.totalRemaining, a.unlimited) }));

  return {
    firstName: firstWord(name),
    headline,
    volunteer,
    since: volunteer ? (vol?.since ? `منذ ${fmtMonthYear(vol.since)}` : "") : account?.since ? `منذ ${fmtMonthYear(account.since)}` : "",
    figs,
    waiting,
    prefs,
    opps,
    events,
  };
}
