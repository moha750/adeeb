import "server-only";
import { fmtMonthYear } from "@/lib/dates";
import type { MyApplication, MyCertificate, MyVolunteering, OpenOpportunity } from "@/app/me/volunteering";
import { counted, dayLabel, today } from "./time";

/**
 * **نموذجُ غرفة «تطوّعي»** — يُبنى في الخادم من `getMyVolunteering` وحده، فالرئيسيّةُ والغرفةُ
 * تقرآن مصدرًا واحدًا. والأيقوناتُ أسماءٌ لا مكوّنات (لا تعبر الحدَّ إلى المتصفّح دوالّ).
 *
 * و«رحلتك» تُحسب من الشهادات: ساعاتُ كلّ شهادةٍ في شهر خدمتها. **نافذةٌ متحرّكة** من ستّة أشهرٍ
 * على الأكثر (ومن انضمّ قبل أقلّ منها يرى أشهرَه منذ انضمامه)، والمجموعُ الكامل في الرقم الكبير
 * (قرار المالك ٢٠٢٦-١٠-١٣: «من له سنتان»).
 */

const MONTH_WINDOW = 6;
const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export type UpIcon = "accepted" | "pending" | "ended";
export type HistIcon = "attended" | "star" | "absent" | "off";

export type VolunteerView = {
  /** «متطوّعة أدِيب منذ سبتمبر 2026» — بجنس صاحبها كما في رأس الإطار. */
  since: string;
  trip: { hours: number; nowNote: string | null; months: { key: string; name: string; h: number; now: boolean }[]; joined: number; stars: number; certs: number };
  upcoming: { id: string; oppId: string; when: string; title: string; say: string; tone: "ok" | "wait" | "muted"; icon: UpIcon; act: "withdraw" | "excuse" | null }[];
  history: { id: string; when: string; title: string; out: string; tone: "ok" | "bad" | "muted"; icon: HistIcon; cert: boolean }[];
  prefs: string[];
  opps: { id: string; committee: string | null; fit: boolean; title: string; sub: string }[];
};

const shortDay = (day: string) => dayLabel(day).split(" ").slice(1).join(" ");
const hoursLabel = (h: number) => counted(h, "ساعة", "ساعتان", "ساعات", "ساعة");
const isFit = (o: OpenOpportunity, prefs: string[]) => !!o.committee && prefs.includes(o.committee);

/** الفتراتُ المتاحةُ لك في الفرصة: لم تقدّم عليها ولم تكتمل ولم تمضِ. */
export const openPeriods = (o: OpenOpportunity) => o.periods.filter((p) => !p.mine && !p.full && !p.passed);

export function oppSub(o: OpenOpportunity): string {
  const seats = o.periods.length
    ? counted(openPeriods(o).length, "فترةٌ متاحة", "فترتان متاحتان", "فترات متاحة", "فترةً متاحة")
    : o.seats == null ? null : o.taken >= o.seats ? "اكتمل العدد" : `باقٍ ${o.seats - o.taken} من ${o.seats}`;
  return [o.dateLabel, seats].filter(Boolean).join("، ");
}

/** شهادةُ مشاركةٍ بعينها: بعنوان فرصتها ويوم خدمتها، وإلّا بالعنوان وحده. */
function certOf(a: MyApplication, certs: MyCertificate[]): MyCertificate | undefined {
  return certs.find((c) => c.opportunityTitle === a.title && (!a.day || c.servedFrom === a.day))
    ?? certs.find((c) => c.opportunityTitle === a.title);
}

export function buildVolunteer(vol: MyVolunteering, female: boolean): VolunteerView {
  const now = today();
  const certs = vol.certificates;
  const t = (m: string, f: string) => (female ? f : m);

  // ── رحلتك ──
  const byMonth = new Map<string, number>();
  for (const c of certs) byMonth.set(c.servedFrom.slice(0, 7), (byMonth.get(c.servedFrom.slice(0, 7)) ?? 0) + (c.hours ?? 0));
  const nowKey = now.slice(0, 7);
  const startKey = (vol.since ?? now).slice(0, 7);
  const months: VolunteerView["trip"]["months"] = [];
  let [y, m] = nowKey.split("-").map(Number);
  for (let i = 0; i < MONTH_WINDOW; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (key < startKey && months.length) break;
    months.unshift({ key, name: AR_MONTHS[m - 1], h: byMonth.get(key) ?? 0, now: key === nowKey });
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  const hoursNow = byMonth.get(nowKey) ?? 0;
  const hours = certs.reduce((n, c) => n + (c.hours ?? 0), 0);

  // ── الجاري والسجلّ ──
  const upcoming: VolunteerView["upcoming"] = [];
  const history: VolunteerView["history"] = [];
  for (const a of vol.applications) {
    const when = a.day ? `${dayLabel(a.day)}${a.period ? `، ${a.period.split("، ").slice(1).join("، ")}` : ""}` : a.flexible ? "مرنة، تنجزها في وقتك" : "موعدُها يُعلَن";
    const base = { id: a.id, oppId: a.opportunityId, when: when.replace(/،\s*$/, ""), title: a.title };
    if (a.status === "pending") {
      upcoming.push({ ...base, say: t("طلبك قيد المراجعة", "طلبكِ قيد المراجعة"), tone: "wait", icon: "pending", act: "withdraw" });
      continue;
    }
    if (a.status === "accepted" && !a.attendance) {
      const ended = !!a.day && a.day < now;
      upcoming.push(ended
        ? { ...base, say: t("انتهى الموعد، ويُسجَّل حضورك قريبًا", "انتهى الموعد، ويُسجَّل حضوركِ قريبًا"), tone: "muted", icon: "ended", act: null }
        : { ...base, say: a.day === now ? t("قُبلت، وموعدك اليوم", "قُبلتِ، وموعدكِ اليوم") : t("قُبلت، نراك في موعدك", "قُبلتِ، نراكِ في موعدكِ"), tone: "ok", icon: "accepted", act: a.canExcuse ? "excuse" : null });
      continue;
    }
    const hk = a.day ? shortDay(a.day) : "مرنة";
    if (a.attendance === "attended") {
      const c = certOf(a, certs);
      const done = a.flexible ? t("أنجزت", "أنجزتِ") : t("حضرت", "حضرتِ");
      const out = [c?.distinction ? `${done} بتميّز` : done, c?.hours ? hoursLabel(c.hours) : null,
        a.deservesCertificate === false ? `وحُجبت الشهادة${a.denialReason ? `: ${a.denialReason}` : ""}` : null].filter(Boolean).join("، ");
      history.push({ id: a.id, when: hk, title: a.title, out, tone: "ok", icon: c?.distinction ? "star" : "attended", cert: !!c });
      continue;
    }
    if (a.attendance === "absent") {
      history.push({ id: a.id, when: hk, title: a.title, out: a.flexible ? t("لم تنجزها", "لم تنجزيها") : t("غبت", "غبتِ"), tone: "bad", icon: "absent", cert: false });
      continue;
    }
    const out = {
      rejected: t("لم تُقبل", "لم تُقبلي") + (a.decisionReason ? `: ${a.decisionReason}` : ""),
      withdrawn: t("سحبت طلبك", "سحبتِ طلبكِ"),
      expired: "انتهى الموعد قبل مراجعته",
      excused: t("اعتذرت", "اعتذرتِ"),
      accepted: "",
      pending: "",
    }[a.status];
    history.push({ id: a.id, when: hk, title: a.title, out, tone: "muted", icon: "off", cert: false });
  }
  // الأقربُ موعدًا أوّلًا في الجاري، والأحدثُ أوّلًا في السجلّ (المرنةُ في آخرهما)
  const dayOf = new Map(vol.applications.map((a) => [a.id, a.day ?? ""]));
  upcoming.sort((a, b) => (dayOf.get(a.id) || "9999") < (dayOf.get(b.id) || "9999") ? -1 : 1);
  history.sort((a, b) => (dayOf.get(b.id) ?? "") < (dayOf.get(a.id) ?? "") ? -1 : 1);

  const prefs = vol.prefs.filter(Boolean);
  const opps = vol.open
    .map((o) => ({ id: o.id, committee: o.committee, fit: isFit(o, prefs), title: o.title, sub: oppSub(o) }))
    .sort((a, b) => Number(b.fit) - Number(a.fit));

  return {
    since: `${female ? "متطوّعة" : "متطوّع"} أدِيب${vol.since ? ` منذ ${fmtMonthYear(vol.since)}` : ""}`,
    trip: {
      hours,
      nowNote: hoursNow ? `${hoursNow} منها في ${AR_MONTHS[Number(nowKey.slice(5, 7)) - 1]}` : null,
      months,
      joined: vol.applications.filter((a) => a.attendance === "attended").length,
      stars: certs.filter((c) => c.distinction).length,
      certs: certs.length,
    },
    upcoming,
    history,
    prefs,
    opps,
  };
}

export { isFit };
