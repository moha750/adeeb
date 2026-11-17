"use client";

/**
 * **الرئيسية: «ملخّصُ الغرف بأشكالها»** (مختبر ٢٠٢٦-١١-١٣، لم يُعتمد — `/dashboard/ad/home`). بعد ثمانية أشكالٍ رُدّت ليلةَ ٢٠٢٦-١١-٠٧ والخيطُ
 * الجامعُ بينها: كلٌّ اخترع رأسًا أو تركيبةً لم تُصمَّم معه، وزاد كتلَ الكحليّ، ولم يُبقِ ما جعل الحاليّةَ قويّة (تنوّعَ أشكالها، والبطاقةَ
 * الحقيقيّةَ في قلبها). فهنا **لا قطعةَ مخترعة**: كلُّ وحدةٍ نسخةٌ مصغّرةٌ من غرفتها بقطعتها المعتمدة فيها — المشاركةُ تذكرةُ «تطوّعي»، والحجزُ
 * تذكرةُ «حجوزاتي»، والشهادةُ الجاهزةُ تنبيهُها الأخضر، و«رحلتك» كما في «تطوّعي»، والفرصُ والفعاليّاتُ تذاكر، والبطاقةُ بطاقتُك.
 * وقواعدُ النموّ (محمد «نعم» ٢٠٢٦-١١-٠٧): من كلّ نوعٍ ثلاثةٌ ثمّ «عرض الكل (N)»، والوحدةُ الفارغةُ تغيب، والترتيبُ بالأهمّيّة (ما يحتاج منك الآن،
 * ثمّ ما ينتظرك، ثمّ أرقامُك، ثمّ ما تستكشفه)، والجوّالُ أوّلًا عمودًا واحدًا. وقطعتان جديدتان أُعلنتا قبل البناء: «عرض الكل (N)» في عنوان
 * المجموعة، و«رحلتك» لصديق أدِيب (حجوزاتُه وحضورُه).
 */
import { useState, useSyncExternalStore } from "react";
import {
  Buildings, CalendarBlank, CalendarCheck, Certificate, Clock, HandHeart, Heart, Hourglass, Infinity as Endless, MapPin, Path, Ticket, UsersThree, WhatsappLogo,
} from "@phosphor-icons/react";
import { CheckCircle, DownloadSimple, PencilSimple, Star } from "@/app/_components/glyphs";
import { TYPE_META } from "@/lib/activities";
import { dateOnlyParts } from "@/lib/dates";
import { greetNow } from "@/lib/timeGreeting";
import { arCount, arCounted, type ArForms } from "@/lib/arabicCount";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { ParticipationCertificate } from "@/lib/certificates/participation";
import type { MyReservation } from "@/app/me/data";
import type { VolunteerView } from "@/app/dashboard/_portal/volunteer";
import { soonLabel } from "@/app/dashboard/_portal/time";
import { AdActs, AdBadge, AdButton, AdCard, AdEmpty, AdGroupTitle, AdNote, AdRoom, type AdMeta, type AdStub, type AdTone } from "../primitives";
import { AdHello, AdIdCard, AdInvite, AdStats } from "../account";
import { dayParts, fmtNum } from "../format";

const AR_HOURS: ArForms = ["ساعة تطوّع", "ساعتا تطوّع", "ساعات تطوّع", "ساعة تطوّع"];
const AR_JOINED: ArForms = ["مشاركة", "مشاركتان", "مشاركات", "مشاركةً"];
const AR_CERTS: ArForms = ["شهادة", "شهادتان", "شهادات", "شهادةً"];
const AR_BOOK: ArForms = ["حجز", "حجزان", "حجوزات", "حجزًا"];
const AR_ATT: ArForms = ["فعاليّة حضرتها", "فعاليّتان حضرتهما", "فعاليّات حضرتها", "فعاليّةً حضرتها"];
/** من كلّ نوعٍ اثنان: قاعدةُ النموّ «ثلاثةٌ على الأكثر»، والتذاكرُ صفّان في العريض فالثالثةُ تبقى وحدها في صفّها — والباقي «عرض الكل (N)» */
const CAP = 2;

export type HomeEvent = { id: string; title: string; day: string; type?: string; timeLabel?: string | null; location?: string | null; seats?: string | null };
export type HomeModel = {
  firstName: string;
  headline: string;
  volunteer: boolean;
  card: { name: string; avatar: string | null; gender: "male" | "female" | null; standing: string; since: string };
  /** شهادةٌ جاهزةٌ لم تُنزَّل بعد (آخرُ أسبوعين): ما يحتاج منك الآن */
  cert?: { title: string; sub: string; paper: ParticipationCertificate } | null;
  shifts: VolunteerView["upcoming"]; shiftsTotal: number;
  bookings: MyReservation[]; bookingsTotal: number;
  trip?: VolunteerView["trip"] | null;
  friendTrip?: { bookings: number; upcoming: number; attended: number } | null;
  prefs: string[] | null;
  opps: VolunteerView["opps"]; oppsTotal: number;
  events: HomeEvent[]; eventsTotal: number;
};

const stubOfDay = (day: string | null | undefined, flexible?: boolean): AdStub | undefined => {
  if (flexible) return { big: "", icon: <Endless />, small: "مرنة" };
  if (!day) return undefined;
  const d = dayParts(`${day}T12:00:00`);
  return { big: d.day, small: d.month };
};
const UP: Record<string, { tone: AdTone; icon: React.ReactNode }> = {
  accepted: { tone: "ok", icon: <CalendarCheck /> },
  pending: { tone: "warn", icon: <Hourglass /> },
  ended: { tone: "neutral", icon: <Clock /> },
};
// eslint-disable-next-line @next/next/no-img-element -- رسمُ ديبو في طرف الدعوة كما في «تطوّعي»
const deeboIdea = <img src="/deebo/idea.webp" alt="" aria-hidden />;
const moreOf = (shown: number, total: number, label: string, href: string) => (total > shown ? { label: `${label} (${fmtNum(total)})`, href } : undefined);

export function HomeSummaryRoom({ m }: { m: HomeModel }) {
  const greet = useSyncExternalStore(() => () => {}, greetNow, () => null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const download = async () => {
    if (!m.cert) return;
    setBusy(true);
    try {
      const { downloadParticipationPdf } = await import("@/lib/certificates/participation");
      await downloadParticipationPdf(m.cert.paper);
    } catch { toast.error("تعذّر رسم الشهادة. جرّب مرّةً أخرى."); } finally { setBusy(false); }
  };
  const female = m.card.gender === "female";
  const oppHref = (id: string) => `/dashboard/volunteer/${id}`;

  /* ── التذاكر: قطعةُ كلّ غرفةٍ كما هي فيها (المصدرُ ههنا نسخةٌ من سطورها حتى يُعتمد الشكل، ثمّ تُستخرج إلى مصدرٍ واحد) ── */
  const shiftTicket = (u: VolunteerView["upcoming"][number]) => {
    const st = UP[u.icon] ?? UP.accepted;
    return (
      <AdCard key={u.id} seed={u.oppId} stub={stubOfDay(u.day, u.flexible)} chips={<AdBadge tone={st.tone} icon={st.icon}>{u.say}</AdBadge>}
        title={u.title} href={oppHref(u.oppId)} meta={[{ icon: <CalendarBlank />, text: u.when }]}
        foot={<AdActs primary={{ label: "افتح الفرصة", icon: <HandHeart />, href: oppHref(u.oppId) }} ops={[]} />} />
    );
  };
  const bookingTicket = (r: MyReservation) => {
    const meta: AdMeta[] = [
      { icon: <Clock />, text: r.timeLabel || "الوقتُ يُعلَن قريبًا" },
      ...(r.location ? [{ icon: <MapPin />, text: r.location }] : []),
      { icon: <CalendarBlank />, text: [dateOnlyParts(r.date)?.weekday, soonLabel(r.date)].filter(Boolean).join("، ") },
    ];
    const d = dayParts(`${r.date}T12:00:00`);
    return (
      <AdCard key={r.id} seed={r.activityId} stub={{ big: d.day, small: d.month }}
        chips={<>
          <AdBadge>{TYPE_META[r.type]?.label ?? "فعاليّة"}</AdBadge>
          {r.whatsappConfirmed ? <AdBadge tone="ok" icon={<CalendarCheck />}>حضورك مؤكَّد</AdBadge> : <AdBadge tone="warn" icon={<WhatsappLogo />}>نؤكّده معك بواتساب</AdBadge>}
        </>}
        title={r.name} href={`/activities/${r.activityId}`} meta={meta}
        foot={<AdActs primary={{ label: "افتح الفعاليّة", icon: <Ticket />, href: `/activities/${r.activityId}` }} ops={[]} />} />
    );
  };
  const oppTicket = (o: VolunteerView["opps"][number]) => {
    const meta: AdMeta[] = [
      ...(o.dateLabel ? [{ icon: <CalendarBlank />, text: o.timeLabel ? `${o.dateLabel}، ${o.timeLabel}` : o.dateLabel }] : []),
      ...(o.location ? [{ icon: <MapPin />, text: o.location }] : []),
      ...(o.seatsLabel ? [{ icon: <UsersThree />, text: o.seatsLabel, tone: o.seatsLabel === "اكتمل العدد" ? "warn" as const : undefined }] : []),
    ];
    return (
      <AdCard key={o.id} seed={o.id} stub={stubOfDay(o.startsOn, o.flexible)}
        chips={<>
          {o.committee ? <AdBadge icon={<Buildings />}>{o.committee}</AdBadge> : null}
          {o.fit ? <AdBadge tone="info" icon={<HandHeart />}>من رغباتك</AdBadge> : null}
        </>}
        title={o.title} href={oppHref(o.id)} meta={meta}
        foot={<AdActs primary={{ label: "افتح الفرصة", icon: <HandHeart />, href: oppHref(o.id) }} ops={[]} />} />
    );
  };
  const eventTicket = (e: HomeEvent) => {
    const d = dayParts(`${e.day}T12:00:00`);
    const meta: AdMeta[] = [
      ...(e.timeLabel ? [{ icon: <Clock />, text: e.timeLabel }] : []),
      ...(e.location ? [{ icon: <MapPin />, text: e.location }] : []),
      ...(e.seats ? [{ icon: <UsersThree />, text: e.seats }] : []),
    ];
    return (
      <AdCard key={e.id} seed={e.id} stub={{ big: d.day, small: d.month }}
        chips={<AdBadge>{(e.type && TYPE_META[e.type as keyof typeof TYPE_META]?.label) || "فعاليّة"}</AdBadge>}
        title={e.title} href={`/activities/${e.id}`} meta={meta}
        foot={<AdActs primary={{ label: "احجز مقعدك", icon: <Ticket />, href: `/activities/${e.id}` }} ops={[]} />} />
    );
  };

  const card = (
    <AdIdCard name={m.card.name} avatar={m.card.avatar} gender={m.card.gender} standing={m.card.standing} since={m.card.since}
      plate={m.volunteer} tierIcon={m.volunteer ? <HandHeart /> : <Heart />} />
  );

  /* ── الوحدات بترتيب الأهمّيّة، والفارغةُ تغيب ── */
  const units: { key: string; node: React.ReactNode }[] = [];
  if (m.cert) units.push({ key: "now", node: (
    <AdNote tone="ok" icon={<Certificate />} label="شهادتك جاهزة" title={m.cert.title}
      action={<AdButton size="sm" icon={<DownloadSimple />} busy={busy} onClick={() => void download()}>تنزيل PDF</AdButton>}>
      {m.cert.sub}
    </AdNote>
  ) });
  const shifts = m.shifts.slice(0, CAP);
  if (shifts.length) units.push({ key: "shifts", node: (
    <section className="ad-hs-unit" aria-label="مشاركاتك">
      <AdGroupTitle icon={<HandHeart />} more={moreOf(shifts.length, m.shiftsTotal, "كل مشاركاتك", "/dashboard/volunteer")}>مشاركاتك</AdGroupTitle>
      <div className="ad-grid">{shifts.map(shiftTicket)}</div>
    </section>
  ) });
  const bookings = m.bookings.slice(0, CAP);
  if (bookings.length) units.push({ key: "bookings", node: (
    <section className="ad-hs-unit" aria-label="حجوزاتك">
      <AdGroupTitle icon={<Ticket />} more={moreOf(bookings.length, m.bookingsTotal, "كل حجوزاتك", "/dashboard/bookings")}>حجوزاتك</AdGroupTitle>
      <div className="ad-grid">{bookings.map(bookingTicket)}</div>
    </section>
  ) });
  if (m.volunteer && m.trip && (m.trip.hours || m.trip.joined || m.trip.certs)) {
    const t = m.trip;
    units.push({ key: "trip", node: (
      <AdStats icon={<Path />} title="رحلتك"
        hero={{ value: fmtNum(t.hours), label: arCounted(t.hours, AR_HOURS), notes: [t.nowNote, m.card.since].filter((x): x is string => !!x) }}
        items={[
          { icon: <HandHeart />, value: fmtNum(t.joined), label: arCounted(t.joined, AR_JOINED) },
          { icon: <Star />, value: fmtNum(t.stars), label: "بتميّز" },
          { icon: <Certificate />, value: fmtNum(t.certs), label: arCounted(t.certs, AR_CERTS) },
        ]} />
    ) });
  }
  // «رحلتك» لصديق أدِيب (قطعةٌ جديدة، أُعلنت): الحجوزاتُ رقمُ اللوح، والحضورُ كرتُه — ولا تُرسم وكلُّها صفر
  if (!m.volunteer && m.friendTrip && m.friendTrip.bookings) {
    const t = m.friendTrip;
    units.push({ key: "trip", node: (
      <AdStats icon={<Path />} title="رحلتك"
        hero={{ value: fmtNum(t.bookings), label: arCounted(t.bookings, AR_BOOK), notes: [t.upcoming ? `${arCount(t.upcoming, ["واحدٌ منها قادم", "اثنان منها قادمان", "منها قادمة", "منها قادمًا"])}` : null, m.card.since].filter((x): x is string => !!x) }}
        items={[{ icon: <CheckCircle />, value: fmtNum(t.attended), label: arCounted(t.attended, AR_ATT) }]} />
    ) });
  }
  const opps = m.volunteer ? m.opps.slice(0, CAP) : [];
  if (m.volunteer && (opps.length || m.prefs)) units.push({ key: "opps", node: (
    <section className="ad-hs-unit" aria-label="فرصٌ تناسب رغباتك">
      <AdGroupTitle icon={<HandHeart />} more={moreOf(opps.length, m.oppsTotal, "كل الفرص المفتوحة", "/dashboard/volunteer")}>فرصٌ تناسب رغباتك</AdGroupTitle>
      {m.prefs?.length ? (
        <AdNote tone="info" icon={<Heart />} label="رغباتك" title={m.prefs.join("، ")} action={<AdButton href="/join" size="sm" icon={<PencilSimple />}>تعديل رغباتك</AdButton>}>
          ما يوافقها من الفرص يأتي أوّلًا.
        </AdNote>
      ) : (
        <AdNote tone="info" icon={<Heart />} label="رغباتك" title="غير محدّدة بعد." action={<AdButton href="/join" size="sm" icon={<PencilSimple />}>تحديد رغباتك</AdButton>}>
          بها نقدّم لك ما يوافقها من الفرص أوّلًا.
        </AdNote>
      )}
      {opps.length ? <div className="ad-grid">{opps.map(oppTicket)}</div> : null}
    </section>
  ) });
  // الفعاليّاتُ للصديق دائمًا، وللمتطوّع حين لا مشاركةَ تنتظره (كما في الحاليّة)
  const events = !m.volunteer || !shifts.length ? m.events.slice(0, CAP) : [];
  if (events.length) units.push({ key: "events", node: (
    <section className="ad-hs-unit" aria-label="فعاليّاتٌ يُحجز فيها الآن">
      <AdGroupTitle icon={<Ticket />} more={moreOf(events.length, m.eventsTotal, "كل الفعاليّات", "/activities")}>فعاليّاتٌ يُحجز فيها الآن</AdGroupTitle>
      <div className="ad-grid">{events.map(eventTicket)}</div>
    </section>
  ) });
  if (!m.volunteer) units.push({ key: "invite", node: (
    <AdInvite icon={<HandHeart />} title="تطوّع في أدِيب" sub="وكن من صنّاع فعاليّاته"
      art={deeboIdea}
      points={[
        { icon: <UsersThree />, k: "لجانٌ تختار منها", v: "الفعاليات والإعلام والتصوير وغيرها" },
        { icon: <Clock />, k: "وقتُك بيدك", v: "تختار الفترات التي تناسبك" },
        { icon: <Certificate />, k: "جهدُك موثّق", v: "شهادةٌ لكلّ مشاركة، وساعاتٌ تُحسب لك" },
      ]}
      action={<AdButton variant="fill" href="/join" icon={<HandHeart />}>{female ? "كوني متطوّعة أدِيب" : "كن متطوّع أدِيب"}</AdButton>} />
  ) });
  // لا شيءَ البتّة: رسالةٌ واحدة (قاعدةُ النموّ)، لا وحداتٌ فارغة
  const nothing = !units.length;

  return (
    <AdRoom label="الرئيسية">
      <div className="ad-hs">
        <div className="ad-hs-head">
          <AdHello hi={`${greet ?? "أهلًا"} ${m.firstName}`} title={m.headline} />
          <div className="ad-hs-card">{card}</div>
        </div>
        {nothing ? (
          <AdEmpty icon={<CalendarCheck />} title="لا شيء ينتظرك الآن" desc="نخبرك في إشعاراتك حين تُفتح فعاليّةٌ أو فرصة."
            action={<AdButton href="/activities" icon={<Ticket />}>تصفّح الفعاليّات</AdButton>} />
        ) : units.map((u) => <div key={u.key} className="ad-hs-slot">{u.node}</div>)}
        <div className="ad-hs-card-end">{card}</div>
      </div>
    </AdRoom>
  );
}
