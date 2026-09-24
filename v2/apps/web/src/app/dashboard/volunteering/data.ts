import "server-only";
import { service } from "@/lib/volunteering";
// تاريخُ عمودِ `date` يُشطر نصًّا، والطابعُ الزمنيّ يُقرأ بساعة الرياض : مصدرُهما واحدٌ في `lib/dates`.
import { fmtDate as fmtWhen, fmtDateOnly, fmtStamp } from "@/lib/dates";

export type OppStatus = "draft" | "open" | "closed";

export type OppRow = {
  id: string;
  title: string;
  status: OppStatus;
  /** `null` = مفتوحٌ بلا سقف. */
  seats: number | null;
  accepted: number;
  pending: number;
  committee: string | null;
  targetGender: "male" | "female" | null;
  dateLabel: string | null;
  startsOn: string | null;
  // ما يحتاجه نموذجُ التعديل ليُفتَح مملوءًا بما هو قائم
  description: string;
  endsOn: string | null;
  durationNote: string | null;
  location: string | null;
  committeeId: number | null;
};

export type OppDetail = OppRow;

export type AppRow = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  gender: "male" | "female" | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  decisionReason: string | null;
  attendance: "attended" | "absent" | null;
  deservesCertificate: boolean | null;
  denialReason: string | null;
  /** ملاحظةٌ إداريّة — تُقرأ في هذه الغرفة وحدها، ولا تخرج إلى `/me` أبدًا. */
  adminNote: string | null;
  certificateSerial: string | null;
};

/** فاعلُ الواقعة: اسمُه لا معرّفُه، فالمعرّفُ لا يُقرأ. */
type Actor = string | null;

/** طلبُ فرصةٍ واحدةٍ بكلِّ ما سُجّل عنه — ولا يُطوى منه شيء. */
export type VolunteerApp = {
  id: string;
  opportunityId: string;
  opportunity: string;
  committee: string | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  appliedAt: string;
  decidedBy: Actor;
  decidedAt: string | null;
  decisionReason: string | null;
  attendance: "attended" | "absent" | null;
  attendanceAt: string | null;
  attendanceBy: Actor;
  deservesCertificate: boolean | null;
  denialReason: string | null;
  /** ملاحظةٌ إداريّة — تُقرأ في غرفة التطوّع وحدها، ولا تخرج إلى `/me` أبدًا. */
  adminNote: string | null;
  evaluatedBy: Actor;
  evaluatedAt: string | null;
};

/** شهادةُ مشاركةٍ: لقطةٌ مخزَّنةٌ لا تتغيّر بتغيّر صاحبها، والمسحوبةُ تبقى بسببها. */
export type VolunteerCert = {
  serial: string;
  holderName: string;
  opportunity: string;
  committee: string | null;
  served: string;
  issuedBy: Actor;
  issuedAt: string;
  status: "active" | "revoked";
  revokedBy: Actor;
  revokedAt: string | null;
  revokeReason: string | null;
};

/** أثرُ المتطوّع خارج بابِ التطوّع — واقعٌ في القاعدة يُقرأ ولا يُكتب من هنا. */
export type VolunteerTrace = {
  reservations: number;
  reservedAttended: number;
  activities: string[];
  badges: { name: string; earnedAt: string }[];
  pageviews: number;
  devices: number;
  lastSeenAt: string | null;
};

export type VolunteerRow = {
  userId: string;

  // الهويّة، كما في `profiles`
  name: string;
  phone: string;
  email: string;
  gender: "male" | "female" | null;
  city: string | null;
  avatarUrl: string | null;
  bio: string | null;
  publicSlug: string | null;

  // الحساب: نصفُه في `profiles` ونصفُه في `auth.users`
  accountStatus: string;
  accountCreatedAt: string;
  acceptsMarketing: boolean;
  deletionRequestedAt: string | null;
  deletionReason: string | null;
  lastSignInAt: string | null;
  /** دخل في آخر ثلاثين يومًا — يُحسَب هنا لا في الشاشة، فالمعروضُ نصٌّ لا طابعٌ زمنيّ. */
  seenLast30: boolean;
  /** بوّابةُ الدخول: `email` أو `google` أو `apple` (وقد تجتمع بالربط). */
  providers: string[];
  emailConfirmed: boolean;

  // التطوّع نفسُه
  status: "active" | "former";
  appliedAt: string;
  appliedStamp: string;
  endedAt: string | null;
  endedBy: Actor;
  endReason: string | null;

  // الرغبات، ومتى رتّبها آخرَ مرّة
  prefs: { id: number; name: string }[];
  prefsUpdatedAt: string | null;

  // الوقائع كاملةً، والعدّاداتُ مشتقّةٌ منها لا مكتوبةٌ بجانبها
  apps: VolunteerApp[];
  certs: VolunteerCert[];
  applied: number;
  pending: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
  attended: number;
  absent: number;
  certificates: number;

  trace: VolunteerTrace;
};

/** صفوفٌ خام كما تردّها القاعدة — تُسمّى مرّةً هنا، فلا يتكرّر وصفُها في كلّ سطر. */
type ProfileRow = {
  id: string; full_name: string; phone: string; email: string; gender: string | null;
  city: string | null; avatar_url: string | null; bio: string | null; public_slug: string | null;
  account_status: string; accepts_marketing: boolean | null; created_at: string;
  deletion_requested_at: string | null; deletion_reason: string | null;
};
type AppRaw = {
  id: string; opportunity_id: string; user_id: string;
  status: VolunteerApp["status"]; applied_at: string;
  decided_by: string | null; decided_at: string | null; decision_reason: string | null;
  attendance: "attended" | "absent" | null; attendance_at: string | null; attendance_by: string | null;
  deserves_certificate: boolean | null; denial_reason: string | null; admin_note: string | null;
  evaluated_by: string | null; evaluated_at: string | null;
};
type CertRaw = {
  user_id: string; serial: string; holder_name: string; opportunity_title: string;
  committee_name: string | null; served_from: string; served_to: string | null;
  issued_by: string | null; issued_at: string; status: string;
  revoked_by: string | null; revoked_at: string | null; revoke_reason: string | null;
};
type BadgeRaw = { user_id: string; badge_id: number; earned_at: string };
type ResRaw = { user_id: string; activity_id: number; status: string; attendance_status: string | null };
type VisitRaw = { user_id: string; total_pageviews: number | null; last_seen_at: string | null };

type Counts = { accepted: number; pending: number };

async function committeeNames(ids: number[]): Promise<Map<number, string>> {
  const sb = service();
  if (!sb || ids.length === 0) return new Map();
  const { data } = await sb.from("committees").select("id, committee_name_ar").in("id", ids);
  return new Map(((data ?? []) as { id: number; committee_name_ar: string }[]).map((c) => [c.id, c.committee_name_ar]));
}

/** تسميةُ المدّة، و`null` لفرصةٍ لم يُحسم موعدُها بعد (التاريخُ اختياريّ). */
function label(startsOn: string | null, endsOn: string | null): string | null {
  if (!startsOn) return null;
  return endsOn && endsOn !== startsOn ? `${fmtDateOnly(startsOn)} إلى ${fmtDateOnly(endsOn)}` : fmtDateOnly(startsOn);
}

/** كشفُ الفرص كلِّها (المسوّدةُ منها لصاحب القدرة وحده، وهو الوحيد الذي يبلغ هذه الغرفة). */
export async function listOpportunities(): Promise<OppRow[]> {
  const sb = service();
  if (!sb) return [];

  const { data: rows } = await sb
    .from("volunteer_opportunities")
    .select("id, title, description, status, seats, starts_on, ends_on, duration_note, location, committee_id, target_gender")
    .order("starts_on", { ascending: false });

  const opps = (rows ?? []) as {
    id: string; title: string; description: string; status: OppStatus; seats: number | null;
    starts_on: string | null; ends_on: string | null; duration_note: string | null;
    location: string | null; committee_id: number | null;
    target_gender: "male" | "female" | null;
  }[];
  if (opps.length === 0) return [];

  const { data: apps } = await sb
    .from("volunteer_applications")
    .select("opportunity_id, status")
    .in("opportunity_id", opps.map((o) => o.id));

  const counts = new Map<string, Counts>();
  for (const a of (apps ?? []) as { opportunity_id: string; status: string }[]) {
    const c = counts.get(a.opportunity_id) ?? { accepted: 0, pending: 0 };
    if (a.status === "accepted") c.accepted += 1;
    if (a.status === "pending") c.pending += 1;
    counts.set(a.opportunity_id, c);
  }

  const names = await committeeNames([...new Set(opps.map((o) => o.committee_id).filter((v): v is number => v != null))]);

  return opps.map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    seats: o.seats,
    accepted: counts.get(o.id)?.accepted ?? 0,
    pending: counts.get(o.id)?.pending ?? 0,
    committee: o.committee_id != null ? (names.get(o.committee_id) ?? null) : null,
    targetGender: o.target_gender,
    dateLabel: label(o.starts_on, o.ends_on),
    startsOn: o.starts_on,
    description: o.description,
    endsOn: o.ends_on,
    durationNote: o.duration_note,
    location: o.location,
    committeeId: o.committee_id,
  }));
}

/** سجلُّ الفرصة الواحدة: تفاصيلُها ومن قدّم عليها. */
export async function getOpportunity(id: string): Promise<{ opp: OppDetail; rows: AppRow[] } | null> {
  const sb = service();
  if (!sb) return null;

  const { data: o } = await sb
    .from("volunteer_opportunities")
    .select("id, title, description, status, seats, starts_on, ends_on, duration_note, location, committee_id, target_gender")
    .eq("id", id)
    .maybeSingle();
  if (!o) return null;

  const opp = o as {
    id: string; title: string; description: string; status: OppStatus; seats: number | null;
    starts_on: string | null; ends_on: string | null; duration_note: string | null;
    location: string | null; committee_id: number | null; target_gender: "male" | "female" | null;
  };

  const { data: apps } = await sb
    .from("volunteer_applications")
    .select("id, user_id, status, decision_reason, attendance, deserves_certificate, denial_reason, admin_note, applied_at")
    .eq("opportunity_id", id)
    .order("applied_at", { ascending: true });

  const rawApps = (apps ?? []) as {
    id: string; user_id: string; status: AppRow["status"]; decision_reason: string | null;
    attendance: AppRow["attendance"]; deserves_certificate: boolean | null;
    denial_reason: string | null; admin_note: string | null;
  }[];

  const userIds = rawApps.map((a) => a.user_id);
  const [{ data: people }, { data: certs }, names] = await Promise.all([
    userIds.length
      ? sb.from("profiles").select("id, full_name, phone, gender").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string; gender: string | null }[] }),
    rawApps.length
      ? sb.from("participation_certificates").select("application_id, serial").eq("status", "active")
          .in("application_id", rawApps.map((a) => a.id))
      : Promise.resolve({ data: [] as { application_id: string; serial: string }[] }),
    committeeNames(opp.committee_id != null ? [opp.committee_id] : []),
  ]);

  const person = new Map(
    ((people ?? []) as { id: string; full_name: string; phone: string; gender: string | null }[])
      .map((p) => [p.id, p]),
  );
  const serial = new Map(
    ((certs ?? []) as { application_id: string; serial: string }[]).map((c) => [c.application_id, c.serial]),
  );

  return {
    opp: {
      id: opp.id,
      title: opp.title,
      description: opp.description,
      status: opp.status,
      seats: opp.seats,
      accepted: rawApps.filter((a) => a.status === "accepted").length,
      pending: rawApps.filter((a) => a.status === "pending").length,
      committee: opp.committee_id != null ? (names.get(opp.committee_id) ?? null) : null,
      committeeId: opp.committee_id,
      targetGender: opp.target_gender,
      dateLabel: label(opp.starts_on, opp.ends_on),
      startsOn: opp.starts_on,
      endsOn: opp.ends_on,
      durationNote: opp.duration_note,
      location: opp.location,
    },
    rows: rawApps.map((a) => {
      const p = person.get(a.user_id);
      return {
        id: a.id,
        userId: a.user_id,
        name: p?.full_name ?? "—",
        phone: p?.phone ?? "",
        gender: p?.gender === "male" || p?.gender === "female" ? p.gender : null,
        status: a.status,
        decisionReason: a.decision_reason,
        attendance: a.attendance,
        deservesCertificate: a.deserves_certificate,
        denialReason: a.denial_reason,
        adminNote: a.admin_note,
        certificateSerial: serial.get(a.id) ?? null,
      };
    }),
  };
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/** حقائقُ الحساب في `auth.users` — لا تبلغها PostgREST، فتُقرأ بواجهةِ الإدارة صفحةً صفحة. */
async function authFacts(ids: string[]): Promise<Map<string, {
  lastSignInAt: string | null; providers: string[]; emailConfirmed: boolean;
}>> {
  const out = new Map<string, { lastSignInAt: string | null; providers: string[]; emailConfirmed: boolean }>();
  const sb = service();
  if (!sb || ids.length === 0) return out;

  const want = new Set(ids);
  const perPage = 1000;
  // صفحاتٌ لا صفحةٌ واحدة : لو تجاوز أهلُ الحساب الألف يومًا، سقطت حقائقُ الباقين صامتةً.
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error || !data) break;
    for (const u of data.users) {
      if (!want.has(u.id)) continue;
      const meta = (u.app_metadata ?? {}) as { provider?: string; providers?: string[] };
      const providers = meta.providers ?? (meta.provider ? [meta.provider] : []);
      out.set(u.id, {
        lastSignInAt: u.last_sign_in_at ?? null,
        providers,
        emailConfirmed: Boolean(u.email_confirmed_at),
      });
    }
    if (data.users.length < perPage) break;
  }
  return out;
}

/**
 * **سجلُّ المتطوّعين: مسيرةُ كلٍّ منهم كاملةً**، ومنه يُهدى العضويّة.
 *
 * وهو يقرأ **كلَّ ما سجّلته القاعدةُ عن المتطوّع** بأمر المالك (٢٠٢٦-٠٩-٢٤): هويّتَه في
 * `profiles`، وحسابَه في `auth.users`، وتطوّعَه ورغباتِه، وكلَّ طلبِ فرصةٍ بأسبابه وملاحظاته
 * وتقييمه، وشهاداتِه **ولو مسحوبة** (كان القارئُ يقيّد `status='active'` فتختفي المسحوبةُ بلا
 * أثر)، ثمّ أثرَه خارج التطوّع: حجزُ فعاليّةٍ ووسامٌ وزيارةُ موقع.
 *
 * وما لا يُقرأ هنا عمدًا: صفوفُ `activity_log` — كلُّها `volunteer_apply` وهي `applied_at`
 * نفسُها مكتوبةً مرّتين، فلا خبرَ فيها.
 */
export async function listVolunteers(): Promise<VolunteerRow[]> {
  const sb = service();
  if (!sb) return [];

  const { data: vols } = await sb
    .from("volunteers")
    .select("user_id, status, applied_at, ended_at, ended_by, end_reason")
    .order("applied_at", { ascending: false });

  const rows = (vols ?? []) as {
    user_id: string; status: "active" | "former"; applied_at: string;
    ended_at: string | null; ended_by: string | null; end_reason: string | null;
  }[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.user_id);
  const [
    { data: people }, { data: prefs }, { data: apps }, { data: certs },
    { data: badgeRows }, { data: resRows }, { data: visitRows }, auth,
  ] = await Promise.all([
    sb.from("profiles")
      .select("id, full_name, phone, email, gender, city, avatar_url, bio, public_slug, account_status, accepts_marketing, created_at, deletion_requested_at, deletion_reason")
      .in("id", ids),
    sb.from("volunteer_preferences").select("user_id, rank, committee_id, updated_at").in("user_id", ids).order("rank"),
    sb.from("volunteer_applications")
      .select("id, opportunity_id, user_id, status, applied_at, decided_by, decided_at, decision_reason, attendance, attendance_at, attendance_by, deserves_certificate, denial_reason, admin_note, evaluated_by, evaluated_at")
      .in("user_id", ids).order("applied_at", { ascending: false }),
    sb.from("participation_certificates")
      .select("user_id, serial, holder_name, opportunity_title, committee_name, served_from, served_to, issued_by, issued_at, status, revoked_by, revoked_at, revoke_reason")
      .in("user_id", ids).order("issued_at", { ascending: false }),
    sb.from("member_badges").select("user_id, badge_id, earned_at").in("user_id", ids),
    sb.from("activity_reservations").select("user_id, activity_id, status, attendance_status").in("user_id", ids),
    sb.from("site_visitors").select("user_id, total_pageviews, last_seen_at").in("user_id", ids),
    authFacts(ids),
  ]);

  const person = new Map(
    ((people ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  );
  const prefRows = (prefs ?? []) as { user_id: string; rank: number; committee_id: number; updated_at: string }[];
  const appRows = (apps ?? []) as AppRaw[];
  const certRows = (certs ?? []) as CertRaw[];

  // أسماءُ ما تشير إليه الصفوف : لجانٌ وفرصٌ وفعاليّاتٌ وأوسمة، ثمّ أسماءُ الفاعلين.
  const oppIds = [...new Set(appRows.map((a) => a.opportunity_id))];
  const actIds = [...new Set(((resRows ?? []) as ResRaw[]).map((r) => r.activity_id))];
  const badgeIds = [...new Set(((badgeRows ?? []) as BadgeRaw[]).map((b) => b.badge_id))];
  const actorIds = [...new Set([
    ...rows.map((r) => r.ended_by),
    ...appRows.flatMap((a) => [a.decided_by, a.attendance_by, a.evaluated_by]),
    ...certRows.flatMap((c) => [c.issued_by, c.revoked_by]),
  ].filter((v): v is string => Boolean(v) && !ids.includes(v as string)))];

  const [names, { data: oppRows }, { data: actRows }, { data: badgeDefs }, { data: actors }] = await Promise.all([
    committeeNames([
      ...new Set([
        ...prefRows.map((p) => p.committee_id),
        ...[] as number[],
      ]),
    ]),
    oppIds.length
      ? sb.from("volunteer_opportunities").select("id, title, committee_id").in("id", oppIds)
      : Promise.resolve({ data: [] as { id: string; title: string; committee_id: number | null }[] }),
    actIds.length
      ? sb.from("activities").select("id, name").in("id", actIds)
      : Promise.resolve({ data: [] as { id: number; name: string }[] }),
    badgeIds.length
      ? sb.from("badges").select("id, name_ar").in("id", badgeIds)
      : Promise.resolve({ data: [] as { id: number; name_ar: string }[] }),
    actorIds.length
      ? sb.from("profiles").select("id, full_name").in("id", actorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  const oppById = new Map(((oppRows ?? []) as { id: string; title: string; committee_id: number | null }[]).map((o) => [o.id, o]));
  const oppCommittees = await committeeNames(
    [...new Set([...oppById.values()].map((o) => o.committee_id).filter((v): v is number => v != null))],
  );
  const actName = new Map(((actRows ?? []) as { id: number; name: string }[]).map((a) => [a.id, a.name]));
  const badgeName = new Map(((badgeDefs ?? []) as { id: number; name_ar: string }[]).map((b) => [b.id, b.name_ar]));

  /** اسمُ الفاعل : وقد يكون متطوّعًا في الكشف نفسِه، فيُقرأ من الخريطتين. */
  const actorName = new Map(((actors ?? []) as { id: string; full_name: string }[]).map((a) => [a.id, a.full_name]));
  const who = (id: string | null): string | null =>
    id ? (actorName.get(id) ?? person.get(id)?.full_name ?? null) : null;

  const served = (from: string, to: string | null): string =>
    to && to !== from ? `${fmtDateOnly(from)} إلى ${fmtDateOnly(to)}` : fmtDateOnly(from);

  return rows.map((r) => {
    const p = person.get(r.user_id);
    const mine = appRows.filter((a) => a.user_id === r.user_id);
    const myCerts = certRows.filter((c) => c.user_id === r.user_id);
    const myPrefs = prefRows.filter((x) => x.user_id === r.user_id);
    const myRes = ((resRows ?? []) as ResRaw[]).filter((x) => x.user_id === r.user_id);
    const myVisits = ((visitRows ?? []) as VisitRaw[]).filter((x) => x.user_id === r.user_id);
    const a = auth.get(r.user_id);

    const count = (f: (x: AppRaw) => boolean) => mine.filter(f).length;

    return {
      userId: r.user_id,

      name: p?.full_name ?? "—",
      phone: p?.phone ?? "",
      email: p?.email ?? "",
      gender: p?.gender === "male" || p?.gender === "female" ? p.gender : null,
      city: p?.city?.trim() ? p.city.trim() : null,
      avatarUrl: p?.avatar_url ?? null,
      bio: p?.bio?.trim() ? p.bio.trim() : null,
      publicSlug: p?.public_slug ?? null,

      accountStatus: p?.account_status ?? "",
      accountCreatedAt: p?.created_at ? fmtStamp(p.created_at) : "",
      acceptsMarketing: Boolean(p?.accepts_marketing),
      deletionRequestedAt: p?.deletion_requested_at ? fmtStamp(p.deletion_requested_at) : null,
      deletionReason: p?.deletion_reason ?? null,
      lastSignInAt: a?.lastSignInAt ? fmtStamp(a.lastSignInAt) : null,
      seenLast30: a?.lastSignInAt ? Date.parse(a.lastSignInAt) > Date.now() - THIRTY_DAYS : false,
      providers: a?.providers ?? [],
      emailConfirmed: a?.emailConfirmed ?? false,

      status: r.status,
      appliedAt: fmtWhen(r.applied_at),
      appliedStamp: fmtStamp(r.applied_at),
      endedAt: r.ended_at ? fmtStamp(r.ended_at) : null,
      endedBy: who(r.ended_by),
      endReason: r.end_reason,

      prefs: myPrefs.map((x) => ({ id: x.committee_id, name: names.get(x.committee_id) ?? "" })),
      prefsUpdatedAt: myPrefs.length
        ? fmtStamp(myPrefs.map((x) => x.updated_at).sort().at(-1) as string)
        : null,

      apps: mine.map((x) => {
        const o = oppById.get(x.opportunity_id);
        return {
          id: x.id,
          opportunityId: x.opportunity_id,
          opportunity: o?.title ?? "فرصةٌ محذوفة",
          committee: o?.committee_id != null ? (oppCommittees.get(o.committee_id) ?? null) : null,
          status: x.status,
          appliedAt: fmtStamp(x.applied_at),
          decidedBy: who(x.decided_by),
          decidedAt: x.decided_at ? fmtStamp(x.decided_at) : null,
          decisionReason: x.decision_reason,
          attendance: x.attendance,
          attendanceAt: x.attendance_at ? fmtStamp(x.attendance_at) : null,
          attendanceBy: who(x.attendance_by),
          deservesCertificate: x.deserves_certificate,
          denialReason: x.denial_reason,
          adminNote: x.admin_note,
          evaluatedBy: who(x.evaluated_by),
          evaluatedAt: x.evaluated_at ? fmtStamp(x.evaluated_at) : null,
        };
      }),

      certs: myCerts.map((c) => ({
        serial: c.serial,
        holderName: c.holder_name,
        opportunity: c.opportunity_title,
        committee: c.committee_name,
        served: served(c.served_from, c.served_to),
        issuedBy: who(c.issued_by),
        issuedAt: fmtStamp(c.issued_at),
        status: c.status === "revoked" ? "revoked" : "active",
        revokedBy: who(c.revoked_by),
        revokedAt: c.revoked_at ? fmtStamp(c.revoked_at) : null,
        revokeReason: c.revoke_reason,
      })),

      // العدّاداتُ مشتقّةٌ من الوقائع نفسِها، فلا رقمَ يفارق سببَه
      applied: count((x) => x.status !== "withdrawn"),
      pending: count((x) => x.status === "pending"),
      accepted: count((x) => x.status === "accepted"),
      rejected: count((x) => x.status === "rejected"),
      withdrawn: count((x) => x.status === "withdrawn"),
      attended: count((x) => x.attendance === "attended"),
      absent: count((x) => x.attendance === "absent"),
      certificates: myCerts.filter((c) => c.status !== "revoked").length,

      trace: {
        reservations: myRes.filter((x) => x.status !== "cancelled").length,
        reservedAttended: myRes.filter((x) => x.attendance_status === "attended").length,
        activities: [...new Set(myRes.map((x) => actName.get(x.activity_id)).filter((v): v is string => Boolean(v)))],
        badges: ((badgeRows ?? []) as BadgeRaw[])
          .filter((b) => b.user_id === r.user_id)
          .map((b) => ({ name: badgeName.get(b.badge_id) ?? "وسام", earnedAt: fmtWhen(b.earned_at) })),
        pageviews: myVisits.reduce((n, v) => n + (v.total_pageviews ?? 0), 0),
        devices: myVisits.length,
        lastSeenAt: myVisits.length
          ? fmtStamp(myVisits.map((v) => v.last_seen_at).filter(Boolean).sort().at(-1) as string)
          : null,
      },
    };
  });
}

/** لجانُ الإهداء وفتحِ الفرص — النشطةُ كلُّها (لا قائمةُ الرغبات: تلك للترتيب لا للإسناد). */
export async function activeCommittees(): Promise<{ id: number; name: string }[]> {
  const sb = service();
  if (!sb) return [];
  const { data } = await sb
    .from("committees").select("id, committee_name_ar").eq("is_active", true).order("id");
  return ((data ?? []) as { id: number; committee_name_ar: string }[])
    .map((c) => ({ id: c.id, name: c.committee_name_ar }));
}
