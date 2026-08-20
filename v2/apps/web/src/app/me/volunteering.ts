import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { fmtDate } from "@/app/activities/data";

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
  durationNote: string | null;
  location: string | null;
};

export type MyApplication = {
  id: string;
  title: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  decisionReason: string | null;
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
  location: string | null; committee_id: number | null; target_gender: string | null;
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
      .select("id, opportunity_id, status, decision_reason, attendance, deserves_certificate, denial_reason")
      .eq("user_id", userId)
      .order("applied_at", { ascending: false }),
  ]);

  const gender = (profile as { gender?: string | null } | null)?.gender ?? null;

  const { data: certRows } = await sb
    .from("participation_certificates")
    .select("id, serial, holder_name, holder_gender, opportunity_title, served_from, served_to, issued_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("issued_at", { ascending: false });

  const { data: openRows } = await sb
    .from("volunteer_opportunities")
    .select("id, title, description, seats, starts_on, ends_on, duration_note, location, committee_id, target_gender")
    .eq("status", "open")
    .order("starts_on", { ascending: true });

  const opps = (openRows ?? []) as RawOpp[];
  const applied = new Set(
    ((appRows ?? []) as { opportunity_id: string; status: string }[])
      .filter((a) => a.status !== "withdrawn")
      .map((a) => a.opportunity_id),
  );

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

  // المقاعدُ المأخوذة — للفرص المعروضة وحدها
  const { data: takenRows } = opps.length
    ? await sb.from("volunteer_applications")
        .select("opportunity_id")
        .eq("status", "accepted")
        .in("opportunity_id", opps.map((o) => o.id))
    : { data: [] as { opportunity_id: string }[] };
  const taken = new Map<string, number>();
  for (const r of (takenRows ?? []) as { opportunity_id: string }[]) {
    taken.set(r.opportunity_id, (taken.get(r.opportunity_id) ?? 0) + 1);
  }

  const titleOf = new Map(opps.map((o) => [o.id, o.title]));
  const otherIds = ((appRows ?? []) as { opportunity_id: string }[])
    .map((a) => a.opportunity_id)
    .filter((id) => !titleOf.has(id));
  if (otherIds.length) {
    const { data: more } = await sb.from("volunteer_opportunities").select("id, title").in("id", otherIds);
    for (const o of (more ?? []) as { id: string; title: string }[]) titleOf.set(o.id, o.title);
  }

  return {
    isVolunteer: true,
    prefs: ((prefRows ?? []) as { committee_id: number }[]).map((p) => nameOf.get(p.committee_id) ?? ""),
    open: opps
      // فئةُ الفرصة تحجبها عمّن ليست له (كما في الفعاليّات)، والمقدَّم عليها لا يُعرَض ثانيةً
      .filter((o) => (o.target_gender == null || o.target_gender === gender) && !applied.has(o.id))
      .map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        committee: o.committee_id != null ? (nameOf.get(o.committee_id) ?? null) : null,
        seats: o.seats,
        taken: taken.get(o.id) ?? 0,
        // لا تسميةَ لموعدٍ لم يُحسم بعد (تاريخُ البداية اختياريّ)
        dateLabel: !o.starts_on
          ? null
          : o.ends_on && o.ends_on !== o.starts_on
            ? `${fmtDate(o.starts_on)} إلى ${fmtDate(o.ends_on)}`
            : fmtDate(o.starts_on),
        durationNote: o.duration_note,
        location: o.location,
      })),
    applications: ((appRows ?? []) as {
      id: string; opportunity_id: string; status: MyApplication["status"];
      decision_reason: string | null; attendance: MyApplication["attendance"];
      deserves_certificate: boolean | null; denial_reason: string | null;
    }[]).map((a) => ({
      id: a.id,
      title: titleOf.get(a.opportunity_id) ?? "فرصة",
      status: a.status,
      decisionReason: a.decision_reason,
      attendance: a.attendance,
      deservesCertificate: a.deserves_certificate,
      denialReason: a.denial_reason,
    })),
    certificates: ((certRows ?? []) as {
      id: string; serial: string; holder_name: string; holder_gender: string | null;
      opportunity_title: string; served_from: string; served_to: string | null; issued_at: string;
    }[]).map((c) => ({
      id: c.id,
      serial: c.serial,
      holderName: c.holder_name,
      gender: c.holder_gender === "male" || c.holder_gender === "female" ? c.holder_gender : null,
      opportunityTitle: c.opportunity_title,
      servedFrom: c.served_from,
      servedTo: c.served_to ?? c.served_from,
      issuedLabel: fmtDate(c.issued_at.slice(0, 10)),
    })),
  };
}
