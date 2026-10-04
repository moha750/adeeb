import "server-only";
import { oppTimeLabel, service } from "@/lib/volunteering";
// تاريخُ عمودِ `date` يُشطر نصًّا، والطابعُ الزمنيّ يُقرأ بساعة الرياض : مصدرُهما واحدٌ في `lib/dates`.
import { fmtDate as fmtWhen, fmtDateOnly, fmtStamp } from "@/lib/dates";
import { periodLabel, periodsSeats, sortPeriods, toPeriod, type OppPeriod, type PeriodRaw } from "@/lib/volunteerPeriods";

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
  /** «من 4 م إلى 8 م»، أو المدّةُ النصّيّة القديمة حين لا مدى (`oppTimeLabel`، ٢٠٢٦-٠٩-٣٠). */
  timeLabel: string | null;
  startsOn: string | null;
  // ما يحتاجه نموذجُ التعديل ليُفتَح مملوءًا بما هو قائم
  description: string;
  endsOn: string | null;
  /** الوقتُ اليوميّ «HH:MM» لحقلَي «من الساعة/إلى الساعة»: كلاهما أو لا شيء (قيدُ القاعدة). */
  dailyFrom: string | null;
  dailyTo: string | null;
  /** المدّةُ النصّيّةُ القديمة (قبل ٢٠٢٦-٠٩-٣٠): لا يكتبها النموذجُ بعدُ، ويهمس بها حين تُعدَّل فرصتُها. */
  durationNote: string | null;
  location: string | null;
  committeeId: number | null;
  /**
   * **فتراتُ الفرصة** (٢٠٢٦-١٠-٠١)، مرتّبةً بيومها وساعتها. وفيها مقاعدُها وطلباتُها، و`seats` أعلاه
   * مجموعُها حين تسقف كلُّها. وفارغةٌ في فرصةٍ قبل الفترات: موعدُها ومقاعدُها على الفرصة نفسِها.
   */
  periods: OppPeriod[];
  /** فرصةٌ قبل الفترات وعليها طلباتٌ للفرصة كلِّها: لا تُضاف لها فترات، فطلباتُها لا فترةَ لها. */
  legacy: boolean;
  /**
   * **مرنة** (٢٠٢٦-١٠-٠١): لا يومَ لها ولا ساعة ولا فترات، يقدّم المتطوّعُ عليها كلِّها، و`endsOn` آخرُ يومٍ
   * اختياريّ (بلا `startsOn`). والحضورُ فيها إنجاز.
   */
  flexible: boolean;
  /** إنهاءُ المشرف للمرنة: تنقضي به كما تنقضي بمضيّ يومها الأخير (`timeOf`). */
  endedAt: string | null;
};

export type OppDetail = OppRow;

/**
 * **أعدادُ ما بعد التقديم** لكرت الكشف («خطّ المترو»، ٢٠٢٦-٠٩-٣٠): محطّاتُه الأربع (الطلبات ·
 * القبول · الحضور · الشهادات) وسطرُ «ما الذي عليك؟» تُحسب منها. وهي في الكشف وحدَه لا في
 * `OppRow`: سجلُّ الفرصة يقرأ الطلباتِ صفًّا صفًّا فلا يحتاج خلاصتها.
 */
export type OppLifecycle = {
  rejected: number;
  /** فات قبل المراجعة: انتهى موعدُه وهو معلّق (الكنّاسُ يُفيته، ٢٠٢٦-١٠-٠٣). */
  expired: number;
  attended: number;
  absent: number;
  /**
   * من حضر ولم تصدر شهادتُه ولم تُحجب، أشخاصًا: سياسةُ ٢٠٢٦-١٠-٠٣ تعطي كلَّ حاضرٍ شهادتَه بلا سؤال
   * استحقاق، فما بقي بعد الحضور إصدارُها.
   */
  owed: number;
  /** من حُجبت شهادتُه استثناءً بسببٍ مكتوب، أشخاصًا. */
  withheld: number;
  /** الشهاداتُ الساريةُ لا المُبطَلة. وهي للمتطوّع في الفرصة لا للفترة، فتُعدّ أشخاصًا. */
  certified: number;
  /** من حضر فترةً واحدةً على الأقلّ، أشخاصًا: الشهادةُ تُقاس به لا بعدد الفترات المحضورة. */
  attendees: number;
};
export type OppListRow = OppRow & OppLifecycle;

export type AppRow = {
  id: string;
  userId: string;
  /** فترتُه، و`null` لطلب فرصةٍ قبل الفترات. */
  periodId: string | null;
  name: string;
  phone: string;
  gender: "male" | "female" | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn" | "expired" | "excused";
  decisionReason: string | null;
  /** سببُ اعتذار المقبول (إلزاميّ، ٢٠٢٦-١٠-٠٣). */
  excuseReason: string | null;
  attendance: "attended" | "absent" | null;
  /** `false` شهادتُه محجوبةٌ بسببها (`denialReason`)، وما سواه جاهزةٌ لمن حضر (سياسةُ ٢٠٢٦-١٠-٠٣). */
  deservesCertificate: boolean | null;
  denialReason: string | null;
  /** جملةُ ترشيحه للتميّز: تُطبع في شهادته بختم «بتميّز». */
  distinctionNote: string | null;
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
  status: "pending" | "accepted" | "rejected" | "withdrawn" | "expired" | "excused";
  appliedAt: string;
  decidedBy: Actor;
  decidedAt: string | null;
  decisionReason: string | null;
  /** سببُ اعتذار المقبول (إلزاميّ، ٢٠٢٦-١٠-٠٣). */
  excuseReason: string | null;
  attendance: "attended" | "absent" | null;
  attendanceAt: string | null;
  attendanceBy: Actor;
  /** `false` شهادتُه محجوبةٌ بسببها، وما سواه جاهزةٌ لمن حضر. */
  deservesCertificate: boolean | null;
  denialReason: string | null;
  distinctionNote: string | null;
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
  /**
   * عاد بعد انقطاع (٢٠٢٦-٠٩-٢٩): حقولُ الانتهاء تبقى خبرَ الانقطاع الأخير ولو صار نشطًا،
   * فالعودةُ فصلٌ يُضاف لا فصلٌ يمحو. وكانت الدالّةُ تمحوها فيعود كأنّه لم يخرج قطّ.
   */
  returnedAt: string | null;

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
  decided_by: string | null; decided_at: string | null; decision_reason: string | null; excuse_reason: string | null;
  attendance: "attended" | "absent" | null; attendance_at: string | null; attendance_by: string | null;
  deserves_certificate: boolean | null; denial_reason: string | null; distinction_note: string | null; admin_note: string | null;
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

type Counts = { accepted: number; pending: number } & Omit<OppLifecycle, "attendees" | "owed" | "withheld">;

/** فتراتُ فرصٍ بأعداد طلباتها: المقبولون والمعلّقون لكلّ فترة. */
async function periodsOf(
  sb: NonNullable<ReturnType<typeof service>>,
  oppIds: string[],
  apps: { period_id: string | null; status: string }[],
): Promise<Map<string, OppPeriod[]>> {
  const out = new Map<string, OppPeriod[]>();
  if (oppIds.length === 0) return out;
  const { data } = await sb
    .from("volunteer_opportunity_periods")
    .select("id, opportunity_id, day, starts_at, ends_at, seats")
    .in("opportunity_id", oppIds);
  const tally = new Map<string, { accepted: number; pending: number }>();
  for (const a of apps) {
    if (!a.period_id) continue;
    const t = tally.get(a.period_id) ?? { accepted: 0, pending: 0 };
    if (a.status === "accepted") t.accepted += 1;
    if (a.status === "pending") t.pending += 1;
    tally.set(a.period_id, t);
  }
  for (const r of (data ?? []) as PeriodRaw[]) {
    const list = out.get(r.opportunity_id) ?? [];
    list.push(toPeriod(r, tally.get(r.id)));
    out.set(r.opportunity_id, list);
  }
  for (const [k, v] of out) out.set(k, sortPeriods(v));
  return out;
}

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
export async function listOpportunities(): Promise<OppListRow[]> {
  const sb = service();
  if (!sb) return [];

  const { data: rows } = await sb
    .from("volunteer_opportunities")
    .select("id, title, description, status, seats, starts_on, ends_on, daily_from, daily_to, duration_note, location, committee_id, target_gender, flexible, ended_at")
    .order("starts_on", { ascending: false });

  const opps = (rows ?? []) as {
    id: string; title: string; description: string; status: OppStatus; seats: number | null;
    starts_on: string | null; ends_on: string | null; duration_note: string | null;
    daily_from: string | null; daily_to: string | null;
    location: string | null; committee_id: number | null;
    target_gender: "male" | "female" | null;
    flexible: boolean; ended_at: string | null;
  }[];
  if (opps.length === 0) return [];

  const { data: apps } = await sb
    .from("volunteer_applications")
    .select("id, opportunity_id, period_id, user_id, status, attendance, deserves_certificate")
    .in("opportunity_id", opps.map((o) => o.id));
  const rawApps = (apps ?? []) as {
    id: string; opportunity_id: string; period_id: string | null; user_id: string; status: string;
    attendance: "attended" | "absent" | null; deserves_certificate: boolean | null;
  }[];
  const periods = await periodsOf(sb, opps.map((o) => o.id), rawApps);
  // من حضر فترةً على الأقلّ، أشخاصًا لا فترات
  const attendees = new Map<string, Set<string>>();
  for (const a of rawApps) {
    if (a.attendance !== "attended") continue;
    const s = attendees.get(a.opportunity_id) ?? new Set<string>();
    s.add(a.user_id);
    attendees.set(a.opportunity_id, s);
  }
  const legacyApps = new Set(
    rawApps.filter((a) => a.period_id == null && a.status !== "withdrawn").map((a) => a.opportunity_id),
  );

  // الشهاداتُ الساريةُ لمقبولي هذه الفرص — المُبطَلةُ لا تُعدّ، فهي كما لم تصدر
  const accepted = rawApps.filter((a) => a.status === "accepted").map((a) => a.id);
  const { data: certs } = accepted.length
    ? await sb.from("participation_certificates").select("application_id").eq("status", "active").in("application_id", accepted)
    : { data: [] as { application_id: string }[] };
  const certified = new Set(((certs ?? []) as { application_id: string }[]).map((c) => c.application_id));

  const counts = new Map<string, Counts>();
  for (const a of rawApps) {
    const c = counts.get(a.opportunity_id) ?? { accepted: 0, pending: 0, rejected: 0, expired: 0, attended: 0, absent: 0, certified: 0 };
    if (a.status === "accepted") c.accepted += 1;
    if (a.status === "pending") c.pending += 1;
    if (a.status === "rejected") c.rejected += 1;
    if (a.status === "expired") c.expired += 1;
    if (a.attendance === "attended") c.attended += 1;
    if (a.attendance === "absent") c.absent += 1;
    if (certified.has(a.id)) c.certified += 1;
    counts.set(a.opportunity_id, c);
  }

  // الشهادةُ للمتطوّع في الفرصة: من صدرت له على أيّ طلب، ومن حُجبت عنه، ومن بقي بينهما
  const key = (a: { opportunity_id: string; user_id: string }) => `${a.opportunity_id}:${a.user_id}`;
  const hasCert = new Set(rawApps.filter((a) => certified.has(a.id)).map(key));
  const owed = new Map<string, Set<string>>();
  const withheld = new Map<string, Set<string>>();
  for (const a of rawApps) {
    if (a.attendance !== "attended" || hasCert.has(key(a))) continue;
    const m = a.deserves_certificate === false ? withheld : owed;
    const s = m.get(a.opportunity_id) ?? new Set<string>();
    s.add(a.user_id);
    m.set(a.opportunity_id, s);
  }

  const names = await committeeNames([...new Set(opps.map((o) => o.committee_id).filter((v): v is number => v != null))]);

  return opps.map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    seats: periods.get(o.id)?.length ? periodsSeats(periods.get(o.id)!) : o.seats,
    periods: periods.get(o.id) ?? [],
    legacy: !o.flexible && !periods.get(o.id)?.length && legacyApps.has(o.id),
    flexible: o.flexible,
    endedAt: o.ended_at,
    attendees: attendees.get(o.id)?.size ?? 0,
    accepted: counts.get(o.id)?.accepted ?? 0,
    pending: counts.get(o.id)?.pending ?? 0,
    rejected: counts.get(o.id)?.rejected ?? 0,
    expired: counts.get(o.id)?.expired ?? 0,
    attended: counts.get(o.id)?.attended ?? 0,
    absent: counts.get(o.id)?.absent ?? 0,
    owed: owed.get(o.id)?.size ?? 0,
    withheld: withheld.get(o.id)?.size ?? 0,
    certified: counts.get(o.id)?.certified ?? 0,
    committee: o.committee_id != null ? (names.get(o.committee_id) ?? null) : null,
    targetGender: o.target_gender,
    dateLabel: label(o.starts_on, o.ends_on),
    timeLabel: oppTimeLabel(o),
    startsOn: o.starts_on,
    description: o.description,
    endsOn: o.ends_on,
    // عمودُ `time` يعود «16:00:00»، وحقلُ الوقت يريد «16:00»
    dailyFrom: o.daily_from?.slice(0, 5) ?? null,
    dailyTo: o.daily_to?.slice(0, 5) ?? null,
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
    .select("id, title, description, status, seats, starts_on, ends_on, daily_from, daily_to, duration_note, location, committee_id, target_gender, flexible, ended_at")
    .eq("id", id)
    .maybeSingle();
  if (!o) return null;

  const opp = o as {
    id: string; title: string; description: string; status: OppStatus; seats: number | null;
    starts_on: string | null; ends_on: string | null; duration_note: string | null;
    daily_from: string | null; daily_to: string | null;
    location: string | null; committee_id: number | null; target_gender: "male" | "female" | null;
    flexible: boolean; ended_at: string | null;
  };

  const { data: apps } = await sb
    .from("volunteer_applications")
    .select("id, user_id, period_id, status, decision_reason, excuse_reason, attendance, deserves_certificate, denial_reason, distinction_note, admin_note, applied_at")
    .eq("opportunity_id", id)
    .order("applied_at", { ascending: true });

  const rawApps = (apps ?? []) as {
    id: string; user_id: string; period_id: string | null; status: AppRow["status"]; decision_reason: string | null; excuse_reason: string | null;
    attendance: AppRow["attendance"]; deserves_certificate: boolean | null;
    denial_reason: string | null; distinction_note: string | null; admin_note: string | null;
  }[];
  const periods = (await periodsOf(sb, [id], rawApps)).get(id) ?? [];

  const userIds = rawApps.map((a) => a.user_id);
  const [{ data: people }, { data: certs }, names] = await Promise.all([
    userIds.length
      ? sb.from("profiles").select("id, full_name, phone, gender").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string; gender: string | null }[] }),
    rawApps.length
      ? sb.from("participation_certificates").select("application_id, user_id, serial").eq("status", "active")
          .in("application_id", rawApps.map((a) => a.id))
      : Promise.resolve({ data: [] as { application_id: string; user_id: string; serial: string }[] }),
    committeeNames(opp.committee_id != null ? [opp.committee_id] : []),
  ]);

  const person = new Map(
    ((people ?? []) as { id: string; full_name: string; phone: string; gender: string | null }[])
      .map((p) => [p.id, p]),
  );
  // الشهادةُ للمتطوّع في الفرصة لا للفترة: رقمُها يظهر على كلّ فترةٍ له
  const serial = new Map(
    ((certs ?? []) as { application_id: string; user_id: string; serial: string }[]).map((c) => [c.user_id, c.serial]),
  );

  return {
    opp: {
      id: opp.id,
      title: opp.title,
      description: opp.description,
      status: opp.status,
      seats: periods.length ? periodsSeats(periods) : opp.seats,
      periods,
      legacy: !opp.flexible && periods.length === 0 && rawApps.some((a) => a.period_id == null && a.status !== "withdrawn"),
      flexible: opp.flexible,
      endedAt: opp.ended_at,
      accepted: rawApps.filter((a) => a.status === "accepted").length,
      pending: rawApps.filter((a) => a.status === "pending").length,
      committee: opp.committee_id != null ? (names.get(opp.committee_id) ?? null) : null,
      committeeId: opp.committee_id,
      targetGender: opp.target_gender,
      dateLabel: label(opp.starts_on, opp.ends_on),
      timeLabel: oppTimeLabel(opp),
      startsOn: opp.starts_on,
      endsOn: opp.ends_on,
      dailyFrom: opp.daily_from?.slice(0, 5) ?? null,
      dailyTo: opp.daily_to?.slice(0, 5) ?? null,
      durationNote: opp.duration_note,
      location: opp.location,
    },
    rows: rawApps.map((a) => {
      const p = person.get(a.user_id);
      return {
        id: a.id,
        userId: a.user_id,
        periodId: a.period_id,
        name: p?.full_name ?? "—",
        phone: p?.phone ?? "",
        gender: p?.gender === "male" || p?.gender === "female" ? p.gender : null,
        status: a.status,
        decisionReason: a.decision_reason,
        excuseReason: a.excuse_reason,
        attendance: a.attendance,
        deservesCertificate: a.deserves_certificate,
        denialReason: a.denial_reason,
        distinctionNote: a.distinction_note,
        adminNote: a.admin_note,
        certificateSerial: serial.get(a.user_id) ?? null,
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
export async function listVolunteers(only?: string): Promise<VolunteerRow[]> {
  const sb = service();
  if (!sb) return [];

  // `only`: متطوّعٌ واحدٌ بسجلّه كاملًا (نافذةُ «الملف» في غرفة الشهادات، ٢٠٢٦-١٠-٠٣) — القارئُ نفسُه لا توأمٌ
  // له، وكلُّ ما بعد هذا السطر مقيّدٌ بمعرّفات الصفوف فيقرأ الواحدَ كما يقرأ الكلّ
  const base = sb.from("volunteers").select("user_id, status, applied_at, ended_at, ended_by, end_reason, returned_at");
  const { data: vols } = await (only ? base.eq("user_id", only) : base).order("applied_at", { ascending: false });

  const rows = (vols ?? []) as {
    user_id: string; status: "active" | "former"; applied_at: string;
    ended_at: string | null; ended_by: string | null; end_reason: string | null;
    returned_at: string | null;
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
      .select("id, opportunity_id, user_id, status, applied_at, decided_by, decided_at, decision_reason, excuse_reason, attendance, attendance_at, attendance_by, deserves_certificate, denial_reason, distinction_note, admin_note, evaluated_by, evaluated_at")
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
      returnedAt: r.returned_at ? fmtStamp(r.returned_at) : null,
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
          excuseReason: x.excuse_reason,
          attendance: x.attendance,
          attendanceAt: x.attendance_at ? fmtStamp(x.attendance_at) : null,
          attendanceBy: who(x.attendance_by),
          deservesCertificate: x.deserves_certificate,
          denialReason: x.denial_reason,
          distinctionNote: x.distinction_note,
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

/* ── غرفةُ شهادات المشاركة (٢٠٢٦-١٠-٠١) ─────────────────────────────────── */

/**
 * صفٌّ في طابورَي الشهادات: **تقديمٌ مقبولٌ** في فرصةٍ بعينها، ينقصه شيءٌ قبل أن تكتمل شهادتُه.
 * ومعرّفُه معرّفُ التقديم: به تُصدَر الشهادة (`issue_participation_certificate`)، وبه يُحدَّد الصفّ.
 */
export type CertQueueRow = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  gender: "male" | "female" | null;
  avatar: string | null;
  oppId: string;
  opportunity: string;
  dateLabel: string | null;
  /** موعدُ الفرصة كما في القاعدة: منه تعرف الغرفةُ أحلّ موعدُها (`timeOf` في كرت الفرصة). */
  startsOn: string | null;
  endsOn: string | null;
  /** إنهاءُ المشرف لفرصةٍ مرنة: به تحلّ كما تحلّ بمضيّ يومها الأخير (`timeOf`). */
  endedAt: string | null;
  /** فرصةٌ مرنة: العملُ إنجازٌ لا حضورُ يوم، فكلماتُ الطابور «أنجز/لم ينجز» (`attendWords` في كرت الفرصة). */
  flexible: boolean;
  /** الجهةُ المُحتاجة كما في الفرصة. */
  committee: string | null;
  /** `attendance` في «بانتظار الحضور»، و`null` في «جاهزة لم تصدر». (لا تقييمَ بعد سياسة ٢٠٢٦-١٠-٠٣.) */
  missing: "attendance" | null;
  /** فترتُه في «بانتظار التقييم» («الخميس 8 أكتوبر، من 8 ص إلى 12 م»): الحضورُ والتقييمُ للفترة. و`null` في
   *  فرصةٍ قبل الفترات، وفي «مستحقّة لم تصدر» إذ الشهادةُ للفرصة كلِّها لا لفترة. */
  period: string | null;
  evaluatedBy: Actor;
  evaluatedAt: string | null;
  /** ملاحظةُ المشرف — لا تخرج إلى `/me`. */
  adminNote: string | null;
  denialReason: string | null;
  /** جملةُ ترشيحه للتميّز، في «جاهزة لم تصدر». */
  distinctionNote: string | null;
};

/** الفرصةُ كما يحتاجها الطابور. */
type OppLite = {
  id: string; title: string; starts_on: string | null; ends_on: string | null; ended_at: string | null;
  flexible: boolean | null; committee_id: number | null;
};

/** شهادةُ مشاركةٍ في الدفتر: لقطتُها كما رُسمت يومَ صدرت، ومعها اسمُ صاحبها اليوم. */
export type IssuedCertRow = {
  id: string;
  userId: string;
  /** فرصتُها، لفتح سجلّها. `null` إن غاب تقديمُها من القاعدة. */
  oppId: string | null;
  /** الاسمُ في الملفّ اليوم — للأفتار. والمرسومُ على الورقة `paperName`. */
  name: string;
  avatar: string | null;
  serial: string;
  /** اسمُ يوم الإصدار كما خُزّن — أوّلُ التاريخ، لا يُعرَض ولا يُرسَم. */
  holderName: string;
  /**
   * **الاسمُ الذي تُرسَم به الورقة اليوم** (`paper_name`، ٢٠٢٦-١٠-٠١): اسمُه الحاليّ إن تغيّر بعد الإصدار،
   * وإلّا اسمُ يوم الإصدار. والتحقّقُ يعرف ما قبله، فالنسخةُ القديمةُ بيد صاحبها تُطابَق ولا تبدو مزوّرة.
   */
  paperName: string;
  gender: "male" | "female" | null;
  opportunity: string;
  committee: string | null;
  /** «YYYY-MM-DD» كما في الصفّ — منهما تُرسَم الورقة. */
  servedFrom: string;
  servedTo: string;
  served: string;
  /** ساعاتُ تطوّعه كما خُزّنت يومَ الإصدار، و`null` للمرنة ولما صدر قبل حسابها (٢٠٢٦-١٠-٠٣). */
  hours: number | null;
  /** جملةُ تميّزه إن رُشّح، وبها تُختم الورقة «بتميّز». */
  distinction: string | null;
  issuedBy: Actor;
  issuedAt: string;
  status: "active" | "revoked";
  revokedBy: Actor;
  revokedAt: string | null;
  revokeReason: string | null;
};

export type CertificatesRoom = {
  /** مقبولون لم يُسجَّل حضورُهم — قبل ترشيحهم بحلول الموعد. */
  awaiting: CertQueueRow[];
  /** حضروا ولم تُحجب شهاداتُهم، ولا شهادةَ ساريةً لهم. */
  owed: CertQueueRow[];
  /** الشهاداتُ كلُّها، الساريةُ والمُبطَلة، أحدثُها أوّلًا. */
  issued: IssuedCertRow[];
};

/**
 * **دفترُ شهادات المشاركة عبر الفرص كلِّها.** كان كلُّ متأخّرٍ محبوسًا في صفحة فرصته: مقبولٌ لم
 * يُسجَّل حضورُه في فرصةٍ أُغلقت لا يراه أحدٌ لأنّ أحدًا لا يعود إلى فرصةٍ أُغلقت. فهذا القارئ
 * يجمع الدَّين في موضعٍ واحد، ويترك الحكمَ بحلول الموعد للشاشة (`timeOf` هو المصدر الواحد).
 *
 * والطابوران من صفوف `volunteer_applications` المقبولة وحدَها: الغائبُ لا شهادةَ له
 * (قيدُ القاعدة)، فلا يدخل طابورًا.
 */
export async function listCertificateRoom(): Promise<CertificatesRoom> {
  const sb = service();
  if (!sb) return { awaiting: [], owed: [], issued: [] };

  const [{ data: apps }, { data: certs }] = await Promise.all([
    sb.from("volunteer_applications")
      .select("id, opportunity_id, period_id, user_id, attendance, deserves_certificate, denial_reason, distinction_note, admin_note, evaluated_by, evaluated_at")
      .eq("status", "accepted"),
    sb.from("participation_certificates")
      .select("id, application_id, user_id, serial, holder_name, paper_name, holder_gender, opportunity_title, committee_name, served_from, served_to, hours, distinction_note, issued_by, issued_at, status, revoked_by, revoked_at, revoke_reason")
      .order("issued_at", { ascending: false }),
  ]);

  const appRows = (apps ?? []) as {
    id: string; opportunity_id: string; period_id: string | null; user_id: string;
    attendance: "attended" | "absent" | null; deserves_certificate: boolean | null;
    denial_reason: string | null; distinction_note: string | null; admin_note: string | null;
    evaluated_by: string | null; evaluated_at: string | null;
  }[];
  const certRows = (certs ?? []) as (CertRaw & {
    id: string; application_id: string; holder_gender: string | null; paper_name: string | null;
    hours: number | string | null; distinction_note: string | null;
  })[];

  // **الشهادةُ للمتطوّع في الفرصة لا للفترة** (٢٠٢٦-١٠-٠١): فالدَّينُ يُحسب زوجًا (المتطوّع، الفرصة).
  // والمُبطَلةُ لا تُحسب: صاحبُها يعود مستحقًّا بلا شهادة حتى تُصدَر له من جديد
  const pair = (userId: string, oppId: string) => `${userId}:${oppId}`;
  const oppOfApp = new Map(appRows.map((a) => [a.id, a.opportunity_id]));
  const certified = new Set(
    certRows.filter((c) => c.status === "active" && oppOfApp.has(c.application_id))
      .map((c) => pair(c.user_id, oppOfApp.get(c.application_id)!)),
  );
  // **كلُّ حاضرٍ يأخذ شهادتَه** (سياسةُ ٢٠٢٦-١٠-٠٣): لا تقييمَ بعد الحضور، فما ينتظر قبل الإصدار الحضورُ وحده،
  // والمحجوبةُ استثناءٌ بسببٍ مكتوبٍ يُرى في سجلّ الفرصة لا في الطابور
  const awaitingApps = appRows.filter((a) => a.attendance == null);
  // ولا تصدر وله في الفرصة فترةٌ تنتظر حضورًا: القاعدةُ تردّ إصدارَها (`PERIODS_PENDING`)
  const unsettled = new Set(awaitingApps.map((a) => pair(a.user_id, a.opportunity_id)));
  const owedPairs = new Set<string>();
  const owedApps = appRows.filter((a) => {
    const k = pair(a.user_id, a.opportunity_id);
    if (a.attendance !== "attended" || a.deserves_certificate === false) return false;
    if (certified.has(k) || unsettled.has(k) || owedPairs.has(k)) return false;
    owedPairs.add(k);
    return true;
  });
  const queueApps = [...awaitingApps, ...owedApps];

  const periodIds = [...new Set(awaitingApps.map((a) => a.period_id).filter((v): v is string => Boolean(v)))];
  const { data: periodData } = periodIds.length
    ? await sb.from("volunteer_opportunity_periods").select("id, opportunity_id, day, starts_at, ends_at, seats").in("id", periodIds)
    : { data: [] as PeriodRaw[] };
  const periodName = new Map(((periodData ?? []) as PeriodRaw[]).map((r) => [r.id, periodLabel(toPeriod(r))]));

  const oppIds = [...new Set(queueApps.map((a) => a.opportunity_id))];
  // أصحابُ الصفوف والفاعلون معًا في قراءةٍ واحدة: المُقيِّمُ والمُصدِرُ أعضاءٌ في `profiles` كأصحابها
  const peopleIds = [...new Set([
    ...queueApps.map((a) => a.user_id),
    ...owedApps.map((a) => a.evaluated_by),
    ...certRows.flatMap((c) => [c.user_id, c.issued_by, c.revoked_by]),
  ].filter((v): v is string => Boolean(v)))];

  const [{ data: oppData }, { data: people }] = await Promise.all([
    oppIds.length
      ? sb.from("volunteer_opportunities").select("id, title, starts_on, ends_on, ended_at, flexible, committee_id").in("id", oppIds)
      : Promise.resolve({ data: [] as OppLite[] }),
    peopleIds.length
      ? sb.from("profiles").select("id, full_name, phone, gender, avatar_url").in("id", peopleIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string; gender: string | null; avatar_url: string | null }[] }),
  ]);

  const opp = new Map(((oppData ?? []) as OppLite[]).map((o) => [o.id, o]));
  const oppCommittee = await committeeNames(
    [...new Set([...opp.values()].map((o) => o.committee_id).filter((v): v is number => v != null))],
  );
  const person = new Map(
    ((people ?? []) as { id: string; full_name: string; phone: string; gender: string | null; avatar_url: string | null }[])
      .map((p) => [p.id, p]),
  );
  const who = (id: string | null): Actor => (id ? (person.get(id)?.full_name ?? null) : null);
  const asGender = (g: string | null | undefined): "male" | "female" | null =>
    g === "male" || g === "female" ? g : null;

  const queueRow = (a: (typeof appRows)[number], missing: CertQueueRow["missing"]): CertQueueRow => {
    const o = opp.get(a.opportunity_id);
    const p = person.get(a.user_id);
    return {
      id: a.id,
      userId: a.user_id,
      name: p?.full_name ?? "—",
      phone: p?.phone ?? "",
      gender: asGender(p?.gender),
      avatar: p?.avatar_url ?? null,
      oppId: a.opportunity_id,
      opportunity: o?.title ?? "فرصةٌ محذوفة",
      dateLabel: label(o?.starts_on ?? null, o?.ends_on ?? null),
      startsOn: o?.starts_on ?? null,
      endsOn: o?.ends_on ?? null,
      endedAt: o?.ended_at ?? null,
      flexible: Boolean(o?.flexible),
      committee: o?.committee_id != null ? (oppCommittee.get(o.committee_id) ?? null) : null,
      missing,
      period: missing && a.period_id ? (periodName.get(a.period_id) ?? null) : null,
      evaluatedBy: who(a.evaluated_by),
      evaluatedAt: a.evaluated_at ? fmtWhen(a.evaluated_at) : null,
      adminNote: a.admin_note,
      denialReason: a.denial_reason,
      distinctionNote: a.distinction_note,
    };
  };

  // أقدمُ الدَّين أوّلًا: فرصةٌ انقضت منذ أسبوعٍ أحقُّ بالنظر من فرصةٍ انقضت أمس
  const byDue = (x: CertQueueRow, y: CertQueueRow) =>
    (x.endsOn ?? x.startsOn ?? "9999").localeCompare(y.endsOn ?? y.startsOn ?? "9999")
    || x.opportunity.localeCompare(y.opportunity, "ar")
    || x.name.localeCompare(y.name, "ar");

  return {
    awaiting: awaitingApps
      .map((a) => queueRow(a, "attendance"))
      .sort(byDue),
    owed: owedApps.map((a) => queueRow(a, null)).sort(byDue),
    issued: certRows.map((c) => ({
      id: c.id,
      userId: c.user_id,
      oppId: oppOfApp.get(c.application_id) ?? null,
      name: person.get(c.user_id)?.full_name ?? c.holder_name,
      avatar: person.get(c.user_id)?.avatar_url ?? null,
      serial: c.serial,
      holderName: c.holder_name,
      paperName: c.paper_name ?? c.holder_name,
      gender: asGender(c.holder_gender),
      opportunity: c.opportunity_title,
      committee: c.committee_name,
      servedFrom: c.served_from,
      // يومٌ واحدٌ يُرسَم يومًا: الورقةُ تقرأ تطابقَ الطرفين (سنّةُ `/me`)
      servedTo: c.served_to ?? c.served_from,
      served: label(c.served_from, c.served_to) ?? "",
      // `numeric` يعود نصًّا من PostgREST أحيانًا
      hours: c.hours == null ? null : Number(c.hours),
      distinction: c.distinction_note,
      issuedBy: who(c.issued_by),
      issuedAt: fmtWhen(c.issued_at),
      status: c.status === "revoked" ? "revoked" : "active",
      revokedBy: who(c.revoked_by),
      revokedAt: c.revoked_at ? fmtWhen(c.revoked_at) : null,
      revokeReason: c.revoke_reason,
    })),
  };
}

/** خيارُ نافذة «إصدار شهادة» — متطوّعٌ مسجَّل، وفرصةٌ حلّ موعدُها بفتراتها التي حلّ يومُها. */
export type ManualIssueOptions = {
  volunteers: { id: string; name: string; phone: string; avatar: string | null; gender: "male" | "female" | null; former: boolean }[];
  opportunities: {
    id: string; title: string; committee: string | null; dateLabel: string | null;
    periods: { id: string; label: string }[];
  }[];
};

/**
 * **خياراتُ الإصدار بلا طلب** (٢٠٢٦-١٠-٠٣): من شارك ولم يقدّم من الموقع. المتطوّعون كلُّهم (النشطُ والسابق، فالسابقُ
 * شارك يومَ كان)، والفرصُ المنشورةُ التي حلّ موعدُها — والمرنةُ متى نُشرت، فعملُها لا يومَ له. والقاعدةُ تعيد
 * الفحصَ نفسَه (`issue_manual_participation_certificate`)، فهذا تيسيرُ اختيارٍ لا حارس.
 */
export async function manualIssueOptions(today: string): Promise<ManualIssueOptions> {
  const sb = service();
  if (!sb) return { volunteers: [], opportunities: [] };

  const [{ data: vols }, { data: opps }] = await Promise.all([
    sb.from("volunteers").select("user_id, status"),
    sb.from("volunteer_opportunities")
      .select("id, title, committee_id, starts_on, ends_on, flexible, status")
      .neq("status", "draft")
      .order("starts_on", { ascending: false, nullsFirst: true }),
  ]);
  const volRows = (vols ?? []) as { user_id: string; status: string }[];
  const oppRows = (opps ?? []) as {
    id: string; title: string; committee_id: number | null; starts_on: string | null; ends_on: string | null; flexible: boolean; status: string;
  }[];

  const ids = volRows.map((v) => v.user_id);
  const oppIds = oppRows.map((o) => o.id);
  const [{ data: people }, { data: periodData }, names] = await Promise.all([
    ids.length
      ? sb.from("profiles").select("id, full_name, phone, gender, avatar_url").in("id", ids)
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string; gender: string | null; avatar_url: string | null }[] }),
    oppIds.length
      ? sb.from("volunteer_opportunity_periods").select("id, opportunity_id, day, starts_at, ends_at, seats").in("opportunity_id", oppIds)
      : Promise.resolve({ data: [] as PeriodRaw[] }),
    committeeNames([...new Set(oppRows.map((o) => o.committee_id).filter((v): v is number => v != null))]),
  ]);

  const person = new Map(
    ((people ?? []) as { id: string; full_name: string; phone: string; gender: string | null; avatar_url: string | null }[]).map((p) => [p.id, p]),
  );
  const periods = sortPeriods(((periodData ?? []) as PeriodRaw[]).map((r) => ({ ...toPeriod(r), oppId: r.opportunity_id })));

  const volunteers: ManualIssueOptions["volunteers"] = volRows
    .map((v): ManualIssueOptions["volunteers"][number] => {
      const p = person.get(v.user_id);
      return {
        id: v.user_id,
        name: p?.full_name?.trim() || "—",
        phone: p?.phone ?? "",
        avatar: p?.avatar_url ?? null,
        gender: p?.gender === "male" || p?.gender === "female" ? p.gender : null,
        former: v.status === "former",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const opportunities = oppRows.flatMap((o) => {
    const mine = periods.filter((p) => p.oppId === o.id && p.day <= today);
    const hasPeriods = periods.some((p) => p.oppId === o.id);
    // ذاتُ الفترات بما حلّ من فتراتها، والقديمةُ بموعدها، والمرنةُ متى نُشرت
    if (hasPeriods ? mine.length === 0 : !o.flexible && o.starts_on != null && o.starts_on > today) return [];
    return [{
      id: o.id,
      title: o.title,
      committee: o.committee_id != null ? (names.get(o.committee_id) ?? null) : null,
      dateLabel: label(o.starts_on, o.ends_on) ?? (o.flexible ? "مرنة" : null),
      periods: mine.map((p) => ({ id: p.id, label: periodLabel(p) })),
    }];
  });

  return { volunteers, opportunities };
}
