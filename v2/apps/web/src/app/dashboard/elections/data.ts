// يُستورَد فقط من مكوّنات خادميّة (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { CandidateStatus, ElectionStatus } from "./vocab";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** تاريخ عربيّ مختصر من ISO (الشهر Lyon والأرقام Eras تلقائيًّا — تكامل الخطّين). */
export const fmtDateTime = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export type ElectionRow = {
  id: string;
  /** الدور المُستهدَف: department_head | committee_leader | deputy_committee_leader. */
  targetRoleName: string;
  /** تسمية الدور من roles.role_name_ar (مصدر واحد — لا محفورة). */
  roleLabel: string;
  /** اسم اللجنة أو القسم المُستهدَف. */
  scopeLabel: string;
  /** هويّة الانتخاب المعروضة: «الدور · النطاق» (لا عنوان نصّيّ للانتخاب في القاعدة). */
  positionLabel: string;
  status: ElectionStatus;
  /** إجمالي المرشّحين (كلّ الحالات). */
  candidates: number;
  /** المرشّحون المعتمَدون (approved) — قياس المنافسة. */
  approved: number;
  /** الأصوات المُدلى بها (عددًا لا وزنًا — الوزن للنتائج). */
  votes: number;
  hasWinner: boolean;
  /** مؤرشف (يُضبط تلقائيًّا على المكتمل والملغى). */
  archived: boolean;
  created: string;
  createdRaw: string;
  candidacyEnd: string | null;
  votingEnd: string | null;
};

/**
 * قائمة الانتخابات مع تسمياتها وأعدادها. التسمية تُشتقّ من roles/committees/departments
 * (مصدر واحد)، والعدّادات تُحسب من الصفوف لا من أعمدة مخزّنة.
 */
export async function getElections(): Promise<{ elections: ElectionRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { elections: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const [eRes, rRes, cRes, dRes, candRes, voteRes] = await Promise.all([
    sb.from("elections").select("id, target_role_name, target_committee_id, target_department_id, status, winner_candidate_id, archived_at, candidacy_end, voting_end, created_at").order("created_at", { ascending: false }),
    sb.from("roles").select("role_name, role_name_ar").eq("is_elected", true),
    sb.from("committees").select("id, committee_name_ar"),
    sb.from("departments").select("id, name_ar"),
    sb.from("election_candidates").select("election_id, status"),
    sb.from("election_votes").select("election_id"),
  ]);
  const firstErr = eRes.error || rRes.error || cRes.error || dRes.error || candRes.error || voteRes.error;
  if (firstErr) return { elections: [], error: firstErr.message };

  // تسميات المنصب والنطاق — من مصادرها الواحدة.
  // المناصب المنتخَبة كلّها بلا وحدةٍ أمّ (`roles.home_committee_id` فارغ)، فاسمُها رتبةٌ
  // خالصة والنطاقُ يكمله. يوم يُنتخَب منصبٌ له أمّ، مرّ باسمه على `lib/positionLabel`.
  const roleLabel = new Map<string, string>();
  for (const r of rRes.data ?? []) roleLabel.set(r.role_name, r.role_name_ar ?? r.role_name);
  const commLabel = new Map<number, string>();
  for (const c of cRes.data ?? []) commLabel.set(c.id, c.committee_name_ar);
  const deptLabel = new Map<number, string>();
  for (const d of dRes.data ?? []) deptLabel.set(d.id, d.name_ar);

  // عدّادات المرشّحين والأصوات لكلّ انتخاب
  const candTotal = new Map<string, number>();
  const candApproved = new Map<string, number>();
  for (const c of candRes.data ?? []) {
    candTotal.set(c.election_id, (candTotal.get(c.election_id) ?? 0) + 1);
    if (c.status === "approved") candApproved.set(c.election_id, (candApproved.get(c.election_id) ?? 0) + 1);
  }
  const voteCount = new Map<string, number>();
  for (const v of voteRes.data ?? []) voteCount.set(v.election_id, (voteCount.get(v.election_id) ?? 0) + 1);

  const elections: ElectionRow[] = (eRes.data ?? []).map((e) => {
    const rLabel = roleLabel.get(e.target_role_name) ?? e.target_role_name;
    // النطاق: دور القسم يحمل قسمًا، ودورا اللجنة يحملان لجنة (قيد elections_scope_check)
    const scope = e.target_committee_id != null
      ? (commLabel.get(e.target_committee_id) ?? `لجنة #${e.target_committee_id}`)
      : e.target_department_id != null
        ? (deptLabel.get(e.target_department_id) ?? `قسم #${e.target_department_id}`)
        : "—";
    return {
      id: e.id,
      targetRoleName: e.target_role_name,
      roleLabel: rLabel,
      scopeLabel: scope,
      positionLabel: `${rLabel} · ${scope}`,
      status: e.status as ElectionStatus,
      candidates: candTotal.get(e.id) ?? 0,
      approved: candApproved.get(e.id) ?? 0,
      votes: voteCount.get(e.id) ?? 0,
      hasWinner: !!e.winner_candidate_id,
      archived: !!e.archived_at,
      created: fmtDateTime(e.created_at),
      createdRaw: e.created_at ?? "",
      candidacyEnd: e.candidacy_end ?? null,
      votingEnd: e.voting_end ?? null,
    };
  });

  return { elections, error: null };
}

/* ══ خيارات فتح انتخاب جديد ══════════════════════════════════════════════ */

export type ScopeKind = "committee" | "department";
export type ElectableRole = { roleName: string; label: string; scope: ScopeKind };
export type ScopeOption = { id: number; label: string };

export type ElectionCreateOptions = {
  /** الأدوار المنتخَبة (roles.is_elected) — مصدر واحد، مرتّبة بالوزن. */
  roles: ElectableRole[];
  /** لجان شاغرة القيادة بلا انتخاب نشط (ولا انتخاب قسمٍ متداخل). */
  leaderCommittees: ScopeOption[];
  /** لجان شاغرة النيابة بلا انتخاب نشط. */
  deputyCommittees: ScopeOption[];
  /** أقسام شاغرة التنسيق بلا انتخاب نشط (ولا انتخاب لجنةٍ متداخل). */
  departments: ScopeOption[];
  error: string | null;
};

const EMPTY_OPTS: Omit<ElectionCreateOptions, "error"> = { roles: [], leaderCommittees: [], deputyCommittees: [], departments: [] };

/**
 * ما يُمكن فتح انتخابٍ له الآن — يُرشّح المتاح لا يعطّله (Select بلا تعطيل فرديّ):
 * المنصب شاغرٌ فعلًا ولا انتخاب نشط له، مع احترام حصر النطاق المتداخل (قسم↔لجانه).
 * القاعدة تبقى الحكَم النهائيّ عند الإنشاء؛ هذا يمنع عرض ما سيُرفض.
 */
export async function getElectionCreateOptions(): Promise<ElectionCreateOptions> {
  const sb = service();
  if (!sb) return { ...EMPTY_OPTS, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const [rRes, cRes, dRes, eRes, occRes] = await Promise.all([
    sb.from("roles").select("role_name, role_name_ar, vote_weight").eq("is_elected", true).order("vote_weight", { ascending: false }),
    sb.from("committees").select("id, committee_name_ar, department_id").eq("is_active", true).eq("council_id", "executive"),
    sb.from("departments").select("id, name_ar").eq("is_active", true).order("display_order", { ascending: true }),
    sb.from("elections").select("target_role_name, target_committee_id, target_department_id").is("archived_at", null).in("status", ["candidacy_open", "candidacy_closed", "voting_open", "voting_closed"]),
    // role_name عمودٌ في user_roles (مُزامَن) — لا تضمين roles تفاديًا لالتباس المفتاحين
    sb.from("user_roles").select("committee_id, department_id, role_name").eq("is_active", true).in("role_name", ["committee_leader", "deputy_committee_leader", "department_head"]),
  ]);
  const firstErr = rRes.error || cRes.error || dRes.error || eRes.error || occRes.error;
  if (firstErr) return { ...EMPTY_OPTS, error: firstErr.message };

  const committees = cRes.data ?? [];
  const deptOfCommittee = new Map<number, number | null>();
  for (const c of committees) deptOfCommittee.set(c.id, c.department_id ?? null);

  // الانتخابات النشطة — للحصر
  const activeLeaderComm = new Set<number>();
  const activeDeputyComm = new Set<number>();
  const activeHeadDept = new Set<number>();
  const deptsWithChildElection = new Set<number>();
  for (const e of eRes.data ?? []) {
    if (e.target_role_name === "committee_leader" && e.target_committee_id != null) activeLeaderComm.add(e.target_committee_id);
    if (e.target_role_name === "deputy_committee_leader" && e.target_committee_id != null) activeDeputyComm.add(e.target_committee_id);
    if (e.target_role_name === "department_head" && e.target_department_id != null) activeHeadDept.add(e.target_department_id);
    if (e.target_committee_id != null) {
      const d = deptOfCommittee.get(e.target_committee_id);
      if (d != null) deptsWithChildElection.add(d);
    }
  }

  // الشواغر الحاليّة
  const occLeader = new Set<number>();
  const occDeputy = new Set<number>();
  const occHead = new Set<number>();
  for (const u of occRes.data ?? []) {
    if (u.role_name === "committee_leader" && u.committee_id != null) occLeader.add(u.committee_id);
    if (u.role_name === "deputy_committee_leader" && u.committee_id != null) occDeputy.add(u.committee_id);
    if (u.role_name === "department_head" && u.department_id != null) occHead.add(u.department_id);
  }

  const roles: ElectableRole[] = (rRes.data ?? []).map((r) => ({
    roleName: r.role_name,
    label: r.role_name_ar ?? r.role_name,
    scope: r.role_name === "department_head" ? "department" : "committee",
  }));

  const leaderCommittees: ScopeOption[] = committees
    .filter((c) => !occLeader.has(c.id) && !activeLeaderComm.has(c.id) && !(c.department_id != null && activeHeadDept.has(c.department_id)))
    .map((c) => ({ id: c.id, label: c.committee_name_ar }));

  const deputyCommittees: ScopeOption[] = committees
    .filter((c) => !occDeputy.has(c.id) && !activeDeputyComm.has(c.id) && !(c.department_id != null && activeHeadDept.has(c.department_id)))
    .map((c) => ({ id: c.id, label: c.committee_name_ar }));

  const departments: ScopeOption[] = (dRes.data ?? [])
    .filter((d) => !occHead.has(d.id) && !activeHeadDept.has(d.id) && !deptsWithChildElection.has(d.id))
    .map((d) => ({ id: d.id, label: d.name_ar }));

  return { roles, leaderCommittees, deputyCommittees, departments, error: null };
}

/* ══ تفصيل انتخابٍ واحد + مرشّحوه (للوحة الإدارة) ════════════════════════ */

export type CandidateRow = {
  id: string;
  number: number;
  userId: string;
  name: string;
  statement: string;
  fileUrl: string | null;
  fileName: string | null;
  status: CandidateStatus;
  reviewNote: string | null;
  submitted: string;
  submittedRaw: string;
  /** مجموع أوزان أصواته (للمشرف بعد التصويت) — التجميع لا يكشف مَن صوّت لمن. */
  weight: number;
  votes: number;
};

export type ElectionDetail = {
  id: string;
  targetRoleName: string;
  roleLabel: string;
  scopeLabel: string;
  positionLabel: string;
  status: ElectionStatus;
  archived: boolean;
  candidacyEnd: string | null;
  votingEnd: string | null;
  winnerCandidateId: string | null;
  winnerName: string | null;
  candidates: CandidateRow[];
  votes: number;
};

/**
 * تفصيل انتخابٍ للوحة الإدارة — يقرأ المرشّحين بهُويّاتهم مباشرةً عبر الخدمة
 * (الصفحة محروسة بـ manage_elections سلفًا؛ التعمية للناخبين لا للمشرف).
 */
export async function getElectionDetail(id: string): Promise<{ election: ElectionDetail | null; error: string | null }> {
  const sb = service();
  if (!sb) return { election: null, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const eRes = await sb.from("elections").select("id, target_role_name, target_committee_id, target_department_id, status, archived_at, candidacy_end, voting_end, winner_candidate_id").eq("id", id).maybeSingle();
  if (eRes.error) return { election: null, error: eRes.error.message };
  if (!eRes.data) return { election: null, error: null };
  const e = eRes.data;

  const [rRes, candRes, voteRes] = await Promise.all([
    sb.from("roles").select("role_name_ar").eq("role_name", e.target_role_name).maybeSingle(),
    sb.from("election_candidates").select("id, candidate_number, user_id, statement_ar, file_url, file_name, status, review_note_ar, submitted_at").eq("election_id", id).order("candidate_number", { ascending: true }),
    sb.from("election_votes").select("candidate_id, vote_weight").eq("election_id", id),
  ]);
  const firstErr = rRes.error || candRes.error || voteRes.error;
  if (firstErr) return { election: null, error: firstErr.message };

  // تجميع الأصوات لكلّ مرشّح (وزنًا وعددًا) — للمشرف بعد التصويت
  const weightByCand = new Map<string, number>();
  const votesByCand = new Map<string, number>();
  for (const v of voteRes.data ?? []) {
    weightByCand.set(v.candidate_id, (weightByCand.get(v.candidate_id) ?? 0) + Number(v.vote_weight));
    votesByCand.set(v.candidate_id, (votesByCand.get(v.candidate_id) ?? 0) + 1);
  }

  // النطاق: لجنة أو قسم
  let scopeLabel = "—";
  if (e.target_committee_id != null) {
    const c = await sb.from("committees").select("committee_name_ar").eq("id", e.target_committee_id).maybeSingle();
    scopeLabel = c.data?.committee_name_ar ?? "—";
  } else if (e.target_department_id != null) {
    const d = await sb.from("departments").select("name_ar").eq("id", e.target_department_id).maybeSingle();
    scopeLabel = d.data?.name_ar ?? "—";
  }
  const roleLabel = rRes.data?.role_name_ar ?? e.target_role_name;

  // أسماء المرشّحين من profiles (استعلام منفصل تفاديًا لالتباس مفتاحَي user_id/reviewed_by)
  const cand = candRes.data ?? [];
  const nameById = new Map<string, string>();
  const userIds = [...new Set(cand.map((c) => c.user_id))];
  if (userIds.length) {
    const pRes = await sb.from("profiles").select("id, full_name").in("id", userIds);
    if (pRes.error) return { election: null, error: pRes.error.message };
    for (const p of pRes.data ?? []) nameById.set(p.id, p.full_name);
  }

  const candidates: CandidateRow[] = cand.map((c) => ({
    id: c.id,
    number: c.candidate_number,
    userId: c.user_id,
    name: nameById.get(c.user_id) ?? "—",
    statement: c.statement_ar,
    fileUrl: c.file_url ?? null,
    fileName: c.file_name ?? null,
    status: c.status as CandidateStatus,
    reviewNote: c.review_note_ar ?? null,
    submitted: fmtDateTime(c.submitted_at),
    submittedRaw: c.submitted_at ?? "",
    weight: weightByCand.get(c.id) ?? 0,
    votes: votesByCand.get(c.id) ?? 0,
  }));

  const winnerName = e.winner_candidate_id ? (candidates.find((c) => c.id === e.winner_candidate_id)?.name ?? null) : null;

  return {
    election: {
      id: e.id,
      targetRoleName: e.target_role_name,
      roleLabel,
      scopeLabel,
      positionLabel: `${roleLabel} · ${scopeLabel}`,
      status: e.status as ElectionStatus,
      archived: !!e.archived_at,
      candidacyEnd: e.candidacy_end ?? null,
      votingEnd: e.voting_end ?? null,
      winnerCandidateId: e.winner_candidate_id ?? null,
      winnerName,
      candidates,
      votes: (voteRes.data ?? []).length,
    },
    error: null,
  };
}
