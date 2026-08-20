import "server-only";
import { service } from "@/lib/volunteering";
import { fmtDate } from "@/app/activities/data";

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

export type VolunteerRow = {
  userId: string;
  name: string;
  phone: string;
  email: string;
  gender: "male" | "female" | null;
  status: "active" | "former";
  appliedAt: string;
  endReason: string | null;
  prefs: { id: number; name: string }[];
  applied: number;
  accepted: number;
  attended: number;
  absent: number;
  certificates: number;
};

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
  return endsOn && endsOn !== startsOn ? `${fmtDate(startsOn)} إلى ${fmtDate(endsOn)}` : fmtDate(startsOn);
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

/** سجلُّ المتطوّعين: مسيرةُ كلٍّ منهم كاملةً، ومنه يُهدى العضويّة. */
export async function listVolunteers(): Promise<VolunteerRow[]> {
  const sb = service();
  if (!sb) return [];

  const { data: vols } = await sb
    .from("volunteers")
    .select("user_id, status, applied_at, end_reason")
    .order("applied_at", { ascending: false });

  const rows = (vols ?? []) as {
    user_id: string; status: "active" | "former"; applied_at: string; end_reason: string | null;
  }[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.user_id);
  const [{ data: people }, { data: prefs }, { data: apps }, { data: certs }] = await Promise.all([
    sb.from("profiles").select("id, full_name, phone, email, gender").in("id", ids),
    sb.from("volunteer_preferences").select("user_id, rank, committee_id").in("user_id", ids).order("rank"),
    sb.from("volunteer_applications").select("user_id, status, attendance").in("user_id", ids),
    sb.from("participation_certificates").select("user_id").eq("status", "active").in("user_id", ids),
  ]);

  const person = new Map(
    ((people ?? []) as { id: string; full_name: string; phone: string; email: string; gender: string | null }[])
      .map((p) => [p.id, p]),
  );
  const prefRows = (prefs ?? []) as { user_id: string; rank: number; committee_id: number }[];
  const names = await committeeNames([...new Set(prefRows.map((p) => p.committee_id))]);

  const stat = new Map<string, { applied: number; accepted: number; attended: number; absent: number }>();
  for (const a of (apps ?? []) as { user_id: string; status: string; attendance: string | null }[]) {
    const s = stat.get(a.user_id) ?? { applied: 0, accepted: 0, attended: 0, absent: 0 };
    if (a.status !== "withdrawn") s.applied += 1;
    if (a.status === "accepted") s.accepted += 1;
    if (a.attendance === "attended") s.attended += 1;
    if (a.attendance === "absent") s.absent += 1;
    stat.set(a.user_id, s);
  }
  const certCount = new Map<string, number>();
  for (const c of (certs ?? []) as { user_id: string }[]) {
    certCount.set(c.user_id, (certCount.get(c.user_id) ?? 0) + 1);
  }

  return rows.map((r) => {
    const p = person.get(r.user_id);
    const s = stat.get(r.user_id) ?? { applied: 0, accepted: 0, attended: 0, absent: 0 };
    return {
      userId: r.user_id,
      name: p?.full_name ?? "—",
      phone: p?.phone ?? "",
      email: p?.email ?? "",
      gender: p?.gender === "male" || p?.gender === "female" ? p.gender : null,
      status: r.status,
      appliedAt: fmtDate(r.applied_at.slice(0, 10)),
      endReason: r.end_reason,
      prefs: prefRows
        .filter((x) => x.user_id === r.user_id)
        .map((x) => ({ id: x.committee_id, name: names.get(x.committee_id) ?? "" })),
      applied: s.applied,
      accepted: s.accepted,
      attended: s.attended,
      absent: s.absent,
      certificates: certCount.get(r.user_id) ?? 0,
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
