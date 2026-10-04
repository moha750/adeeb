import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { fmtDate } from "@/app/activities/data";
import { oppTimeLabel } from "@/lib/volunteering";
import { clubNow, periodEnded, periodLabel, periodStarted, sortPeriods, toPeriod, type PeriodRaw } from "@/lib/volunteerPeriods";

/**
 * قارئُ تطوّعِ صاحب الحساب.
 *
 * **الأعمدةُ تُنتقى صراحةً** ولا يُمرَّر الصفُّ كاملًا: في `volunteer_applications` عمودُ
 * `admin_note` — ملاحظةٌ إداريّةٌ لا يراها صاحبُها. ولذلك أيضًا لا سياسةَ قراءةٍ للمتطوّع على
 * ذلك الجدول أصلًا: يقرأ الخادمُ ما يُعرَض، ولا يصل المتصفّحُ إليه بحال.
 */

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

export type OpenOpportunity = {
  id: string;
  title: string;
  description: string;
  committee: string | null;
  /** `null` = مفتوحٌ بلا سقف. */
  seats: number | null;
  taken: number;
  dateLabel: string | null;
  /** «من 4 م إلى 8 م»، أو المدّةُ النصّيّة القديمة حين لا مدى: مصدرُها `oppTimeLabel` كلوحة الفرص. */
  timeLabel: string | null;
  location: string | null;
  /**
   * **فتراتُها** (٢٠٢٦-١٠-٠١): المتطوّعُ يختار منها فترةً أو أكثر. وفارغةٌ في فرصةٍ قبل الفترات، فيقدّم
   * على الفرصة كلِّها كما كان.
   */
  periods: MyPeriod[];
};

export type MyPeriod = {
  id: string;
  /** «الخميس 8 أكتوبر، من 8 ص إلى 12 م» */
  label: string;
  seats: number | null;
  taken: number;
  /** قدّم عليها (معلَّقًا أو مقبولًا أو مردودًا): لا يُعاد التقديمُ عليها. */
  mine: boolean;
  full: boolean;
  /** مضى يومُها: لا يُقدَّم عليها (`PERIOD_PASSED` في القاعدة). */
  passed: boolean;
};

export type MyApplication = {
  id: string;
  title: string;
  /** فترتُه، و`null` لتقديمٍ على فرصةٍ قبل الفترات أو مرنة. */
  period: string | null;
  /** فرصتُه مرنة: الحضورُ فيها إنجاز (٢٠٢٦-١٠-٠١). */
  flexible: boolean;
  status: "pending" | "accepted" | "rejected" | "withdrawn" | "expired" | "excused";
  decisionReason: string | null;
  /** سببُ اعتذاره إن اعتذر بعد قبوله (٢٠٢٦-١٠-٠٣). */
  excuseReason: string | null;
  /** أله أن يعتذر الآن؟ مقبولٌ لم يُسجَّل حضورُه ولم تبدأ فترتُه (حكمُ `excuse_my_application` نفسُه). */
  canExcuse: boolean;
  attendance: "attended" | "absent" | null;
  deservesCertificate: boolean | null;
  denialReason: string | null;
};

export type MyCertificate = {
  id: string;
  serial: string;
  /** لقطاتٌ من يوم الإصدار — تُرسَم كما هي ولا تُشتقّ اليوم. */
  holderName: string;
  gender: "male" | "female" | null;
  opportunityTitle: string;
  servedFrom: string;
  servedTo: string;
  /** ساعاتُ تطوّعه، و`null` للمرنة ولما صدر قبل حسابها. */
  hours: number | null;
  /** جملةُ تميّزه إن رُشّح: تُطبع في الورقة بختم «بتميّز». */
  distinction: string | null;
  issuedLabel: string;
};

export type MyVolunteering = {
  isVolunteer: boolean;
  /** رغباتُه بأسماء اللجان، مرتّبةً */
  prefs: string[];
  open: OpenOpportunity[];
  applications: MyApplication[];
  certificates: MyCertificate[];
};

type RawOpp = {
  id: string; title: string; description: string; seats: number | null;
  starts_on: string | null; ends_on: string | null; duration_note: string | null;
  daily_from: string | null; daily_to: string | null;
  location: string | null; committee_id: number | null; target_gender: string | null;
  flexible: boolean;
};

export async function getMyVolunteering(userId: string): Promise<MyVolunteering | null> {
  const sb = service();
  if (!sb) return null;

  const { data: vol } = await sb.from("volunteers").select("status").eq("user_id", userId).maybeSingle();
  const isVolunteer = (vol as { status?: string } | null)?.status === "active";
  if (!isVolunteer) return { isVolunteer: false, prefs: [], open: [], applications: [], certificates: [] };

  const [{ data: prefRows }, { data: profile }, { data: appRows }] = await Promise.all([
    sb.from("volunteer_preferences").select("rank, committee_id").eq("user_id", userId).order("rank"),
    sb.from("profiles").select("gender").eq("id", userId).maybeSingle(),
    sb.from("volunteer_applications")
      .select("id, opportunity_id, period_id, status, decision_reason, excuse_reason, attendance, deserves_certificate, denial_reason")
      .eq("user_id", userId)
      .order("applied_at", { ascending: false }),
  ]);

  const gender = (profile as { gender?: string | null } | null)?.gender ?? null;

  const { data: certRows } = await sb
    .from("participation_certificates")
    .select("id, serial, holder_name, paper_name, holder_gender, opportunity_title, served_from, served_to, hours, distinction_note, issued_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("issued_at", { ascending: false });

  const { data: openRows } = await sb
    .from("volunteer_opportunities")
    .select("id, title, description, seats, starts_on, ends_on, daily_from, daily_to, duration_note, location, committee_id, target_gender, flexible")
    .eq("status", "open")
    .order("starts_on", { ascending: true });

  const opps = (openRows ?? []) as RawOpp[];
  const myApps = (appRows ?? []) as { opportunity_id: string; period_id: string | null; status: string }[];
  // الفرصةُ قبل الفترات: قدّم عليها كلِّها. وذاتُ الفترات: قدّم على فتراتٍ بعينها
  // والمعتذرُ والفائتُ كالمسحوب: لا يحجبان الفرصةَ عنه، فله أن يقدّم ثانيةً ما دام في موعدها وقت
  const gone = (st: string) => st === "withdrawn" || st === "excused" || st === "expired";
  const applied = new Set(myApps.filter((a) => !gone(a.status) && a.period_id == null).map((a) => a.opportunity_id));
  const myPeriods = new Set(myApps.filter((a) => !gone(a.status) && a.period_id).map((a) => a.period_id!));
  // الفترةُ تبقى للتقديم حتى تنتهي آخرُ ساعةٍ منها (حكمُ القاعدة نفسُه، ٢٠٢٦-١٠-٠٣)
  const now = clubNow();

  // أسماءُ اللجان لمرّةٍ واحدة (الرغباتُ والفرصُ تسألان عنها معًا)
  const committeeIds = [
    ...new Set([
      ...((prefRows ?? []) as { committee_id: number }[]).map((p) => p.committee_id),
      ...opps.map((o) => o.committee_id).filter((v): v is number => v != null),
    ]),
  ];
  const { data: committees } = committeeIds.length
    ? await sb.from("committees").select("id, committee_name_ar").in("id", committeeIds)
    : { data: [] as { id: number; committee_name_ar: string }[] };
  const nameOf = new Map(
    ((committees ?? []) as { id: number; committee_name_ar: string }[]).map((c) => [c.id, c.committee_name_ar]),
  );

  // المقاعدُ المأخوذة — للفرص المعروضة وحدها، وللفترة إن كان الطلبُ عليها
  const [{ data: takenRows }, { data: periodRows }] = opps.length
    ? await Promise.all([
        sb.from("volunteer_applications")
          .select("opportunity_id, period_id")
          .eq("status", "accepted")
          .in("opportunity_id", opps.map((o) => o.id)),
        sb.from("volunteer_opportunity_periods")
          .select("id, opportunity_id, day, starts_at, ends_at, seats")
          .in("opportunity_id", opps.map((o) => o.id)),
      ])
    : [{ data: [] as { opportunity_id: string; period_id: string | null }[] }, { data: [] as PeriodRaw[] }];
  const taken = new Map<string, number>();
  const takenInPeriod = new Map<string, number>();
  for (const r of (takenRows ?? []) as { opportunity_id: string; period_id: string | null }[]) {
    taken.set(r.opportunity_id, (taken.get(r.opportunity_id) ?? 0) + 1);
    if (r.period_id) takenInPeriod.set(r.period_id, (takenInPeriod.get(r.period_id) ?? 0) + 1);
  }
  const periodsOf = new Map<string, MyPeriod[]>();
  const byOpp = new Map<string, ReturnType<typeof toPeriod>[]>();
  for (const r of (periodRows ?? []) as PeriodRaw[]) {
    byOpp.set(r.opportunity_id, [...(byOpp.get(r.opportunity_id) ?? []), toPeriod(r)]);
  }
  for (const [oppId, ps] of byOpp) {
    periodsOf.set(oppId, sortPeriods(ps).map((p) => {
      const n = takenInPeriod.get(p.id) ?? 0;
      return {
        id: p.id, label: periodLabel(p), seats: p.seats, taken: n,
        mine: myPeriods.has(p.id), full: p.seats != null && n >= p.seats, passed: periodEnded(p, now),
      };
    }));
  }

  const titleOf = new Map(opps.map((o) => [o.id, o.title]));
  // المرنةُ يُقال فيها «أنجزت» لا «حضرت»
  const flexibleOf = new Map(opps.map((o) => [o.id, o.flexible]));
  // موعدُ كلّ فرصةٍ قدّم عليها: به يُعرف أله أن يعتذر بعد قبوله
  type When = { starts_on: string | null; ends_on: string | null; daily_from: string | null; flexible: boolean; ended_at: string | null };
  const whenOf = new Map<string, When>(opps.map((o) => [o.id, { ...o, ended_at: null }]));
  const otherIds = ((appRows ?? []) as { opportunity_id: string }[])
    .map((a) => a.opportunity_id)
    .filter((id) => !titleOf.has(id));
  if (otherIds.length) {
    const { data: more } = await sb.from("volunteer_opportunities")
      .select("id, title, flexible, starts_on, ends_on, daily_from, ended_at").in("id", otherIds);
    for (const o of (more ?? []) as ({ id: string; title: string } & When)[]) {
      titleOf.set(o.id, o.title);
      flexibleOf.set(o.id, o.flexible);
      whenOf.set(o.id, o);
    }
  }

  // أسماءُ فترات تقديماته، وفيها فتراتُ فرصٍ أُغلقت فلا تأتي مع المفتوحة
  const appPeriodIds = [...new Set(myApps.map((a) => a.period_id).filter((v): v is string => Boolean(v)))];
  const { data: appPeriods } = appPeriodIds.length
    ? await sb.from("volunteer_opportunity_periods").select("id, opportunity_id, day, starts_at, ends_at, seats").in("id", appPeriodIds)
    : { data: [] as PeriodRaw[] };
  const periodNameOf = new Map(((appPeriods ?? []) as PeriodRaw[]).map((r) => [r.id, periodLabel(toPeriod(r))]));
  const periodStartOf = new Map(((appPeriods ?? []) as PeriodRaw[]).map((r) => [r.id, { day: r.day, from: r.starts_at }]));
  /** **اعتذارُ المقبول** (٢٠٢٦-١٠-٠٣): ما لم تبدأ فترتُه (أو موعدُ الفرصة القديمة)، والمرنةُ ما لم تنتهِ. */
  const canExcuse = (a: { opportunity_id: string; period_id: string | null; status: string; attendance: string | null }) => {
    if (a.status !== "accepted" || a.attendance) return false;
    const p = a.period_id ? periodStartOf.get(a.period_id) : null;
    if (p) return !periodStarted(p, now);
    const w = whenOf.get(a.opportunity_id);
    if (!w) return false;
    if (w.flexible) return !w.ended_at && !(w.ends_on && w.ends_on < now.day);
    return !w.starts_on || !periodStarted({ day: w.starts_on, from: w.daily_from ?? "00:00" }, now);
  };

  return {
    isVolunteer: true,
    prefs: ((prefRows ?? []) as { committee_id: number }[]).map((p) => nameOf.get(p.committee_id) ?? ""),
    open: opps
      // فئةُ الفرصة تحجبها عمّن ليست له (كما في الفعاليّات)، والمقدَّم عليها لا يُعرَض ثانيةً. وذاتُ الفترات
      // تبقى ما بقيت فيها فترةٌ لم يقدّم عليها ولم يمضِ يومُها
      .filter((o) => (o.target_gender == null || o.target_gender === gender) && !applied.has(o.id))
      .filter((o) => {
        const ps = periodsOf.get(o.id);
        return !ps || ps.some((p) => !p.mine && !p.passed);
      })
      .map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        committee: o.committee_id != null ? (nameOf.get(o.committee_id) ?? null) : null,
        seats: o.seats,
        taken: taken.get(o.id) ?? 0,
        // المرنةُ بلا يومٍ ولا ساعة (٢٠٢٦-١٠-٠١)، وآخرُ يومها إن كُتب. ولا تسميةَ لموعدٍ لم يُحسم بعد
        dateLabel: o.flexible
          ? (o.ends_on ? `مرنة، حتى ${fmtDate(o.ends_on)}` : "مرنة، بلا يومٍ محدّد")
          : !o.starts_on
          ? null
          : o.ends_on && o.ends_on !== o.starts_on
            ? `${fmtDate(o.starts_on)} إلى ${fmtDate(o.ends_on)}`
            : fmtDate(o.starts_on),
        timeLabel: oppTimeLabel(o),
        location: o.location,
        periods: periodsOf.get(o.id) ?? [],
      })),
    applications: ((appRows ?? []) as {
      id: string; opportunity_id: string; period_id: string | null; status: MyApplication["status"];
      decision_reason: string | null; excuse_reason: string | null; attendance: MyApplication["attendance"];
      deserves_certificate: boolean | null; denial_reason: string | null;
    }[]).map((a) => ({
      id: a.id,
      title: titleOf.get(a.opportunity_id) ?? "فرصة",
      flexible: flexibleOf.get(a.opportunity_id) ?? false,
      period: a.period_id ? (periodNameOf.get(a.period_id) ?? null) : null,
      status: a.status,
      decisionReason: a.decision_reason,
      excuseReason: a.excuse_reason,
      canExcuse: canExcuse(a),
      attendance: a.attendance,
      deservesCertificate: a.deserves_certificate,
      denialReason: a.denial_reason,
    })),
    certificates: ((certRows ?? []) as {
      id: string; serial: string; holder_name: string; paper_name: string | null; holder_gender: string | null;
      opportunity_title: string; served_from: string; served_to: string | null; issued_at: string;
      hours: number | string | null; distinction_note: string | null;
    }[]).map((c) => ({
      id: c.id,
      serial: c.serial,
      // الورقةُ تُرسَم باسمه اليوم إن صحّحه بعد الإصدار (`paper_name`، ٢٠٢٦-١٠-٠١)، والتحقّقُ يعرف ما قبله
      holderName: c.paper_name ?? c.holder_name,
      gender: c.holder_gender === "male" || c.holder_gender === "female" ? c.holder_gender : null,
      opportunityTitle: c.opportunity_title,
      servedFrom: c.served_from,
      servedTo: c.served_to ?? c.served_from,
      hours: c.hours == null ? null : Number(c.hours),
      distinction: c.distinction_note,
      issuedLabel: fmtDate(c.issued_at.slice(0, 10)),
    })),
  };
}
