// يُستورَد فقط من مكوّنات خادميّة (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { positionLine } from "@/lib/positionLabel";
import type { CandidateStatus, ElectionStatus } from "./vocab";

// التنسيق من `lib/dates` (مصدرٌ واحد بتوقيت النادي)، ويُعاد تصديره لمن كان يقرؤه من هنا.
export { fmtDate as fmtDateTime, fmtStamp } from "@/lib/dates";
import { fmtDate as fmtDateTime, fmtStamp } from "@/lib/dates";

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
  /** اسم اللجنة أو القسم المُستهدَف — `null` لمنصبٍ لا نطاقَ له. */
  scopeLabel: string | null;
  /** هويّة الانتخاب المعروضة: الدورُ ونطاقُه موصولين (`positionLine`) — لا عنوان نصّيّ في القاعدة. */
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
  /** موعدا الإغلاق التلقائيّ معروضَين (فارغُهما بابٌ يُغلق بيد المشرف). */
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
        : null;
    return {
      id: e.id,
      targetRoleName: e.target_role_name,
      roleLabel: rLabel,
      scopeLabel: scope,
      positionLabel: positionLine(rLabel, scope) ?? rLabel,
      status: e.status as ElectionStatus,
      candidates: candTotal.get(e.id) ?? 0,
      approved: candApproved.get(e.id) ?? 0,
      votes: voteCount.get(e.id) ?? 0,
      hasWinner: !!e.winner_candidate_id,
      archived: !!e.archived_at,
      created: fmtDateTime(e.created_at),
      createdRaw: e.created_at ?? "",
      candidacyEnd: fmtStamp(e.candidacy_end) || null,
      votingEnd: fmtStamp(e.voting_end) || null,
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
  /** لجان شاغرة القيادة بلا انتخاب نشط لمقعدها. */
  leaderCommittees: ScopeOption[];
  /** لجان شاغرة النيابة بلا انتخاب نشط لمقعدها. */
  deputyCommittees: ScopeOption[];
  /** أقسام شاغرة التنسيق بلا انتخاب نشط لمقعدها. */
  departments: ScopeOption[];
  error: string | null;
};

const EMPTY_OPTS: Omit<ElectionCreateOptions, "error"> = { roles: [], leaderCommittees: [], deputyCommittees: [], departments: [] };

/**
 * ما يُمكن فتح انتخابٍ له الآن — يُرشّح المتاح لا يعطّله (Select بلا تعطيل فرديّ):
 * المقعد شاغرٌ فعلًا ولا انتخاب نشط **لهذا المقعد**. وهذان هما حارسا القاعدة نفسها
 * (`enforce_vacant_target` و`elections_active_*_uniq`)، فلا تُصفّى هنا حالةٌ تقبلها.
 * والتداخل مسموح: مقعدُ القسم يُفتح ولجانُه في انتخاب، والعكس.
 */
export async function getElectionCreateOptions(): Promise<ElectionCreateOptions> {
  const sb = service();
  if (!sb) return { ...EMPTY_OPTS, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const [rRes, cRes, dRes, eRes, occRes] = await Promise.all([
    sb.from("roles").select("role_name, role_name_ar, vote_weight").eq("is_elected", true).order("vote_weight", { ascending: false }),
    sb.from("committees").select("id, committee_name_ar").eq("is_active", true).eq("council_id", "executive"),
    sb.from("departments").select("id, name_ar").eq("is_active", true).order("display_order", { ascending: true }),
    sb.from("elections").select("target_role_name, target_committee_id, target_department_id").is("archived_at", null).in("status", ["candidacy_open", "candidacy_closed", "voting_open", "voting_closed"]),
    // role_name عمودٌ في user_roles (مُزامَن) — لا تضمين roles تفاديًا لالتباس المفتاحين
    sb.from("user_roles").select("committee_id, department_id, role_name").eq("is_active", true).in("role_name", ["committee_leader", "deputy_committee_leader", "department_head"]),
  ]);
  const firstErr = rRes.error || cRes.error || dRes.error || eRes.error || occRes.error;
  if (firstErr) return { ...EMPTY_OPTS, error: firstErr.message };

  const committees = cRes.data ?? [];

  // الانتخابات النشطة — بالمقعد وحده
  const activeLeaderComm = new Set<number>();
  const activeDeputyComm = new Set<number>();
  const activeHeadDept = new Set<number>();
  for (const e of eRes.data ?? []) {
    if (e.target_role_name === "committee_leader" && e.target_committee_id != null) activeLeaderComm.add(e.target_committee_id);
    if (e.target_role_name === "deputy_committee_leader" && e.target_committee_id != null) activeDeputyComm.add(e.target_committee_id);
    if (e.target_role_name === "department_head" && e.target_department_id != null) activeHeadDept.add(e.target_department_id);
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
    .filter((c) => !occLeader.has(c.id) && !activeLeaderComm.has(c.id))
    .map((c) => ({ id: c.id, label: c.committee_name_ar }));

  const deputyCommittees: ScopeOption[] = committees
    .filter((c) => !occDeputy.has(c.id) && !activeDeputyComm.has(c.id))
    .map((c) => ({ id: c.id, label: c.committee_name_ar }));

  const departments: ScopeOption[] = (dRes.data ?? [])
    .filter((d) => !occHead.has(d.id) && !activeHeadDept.has(d.id))
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
  scopeLabel: string | null;
  positionLabel: string;
  status: ElectionStatus;
  archived: boolean;
  /** موعدا الإغلاق التلقائيّ معروضَين (فارغُهما بابٌ يُغلق بيد المشرف). */
  candidacyEnd: string | null;
  votingEnd: string | null;
  /** الموعدان خامَين (ISO) — لتعبئة حقل الضبط، فالمعروض للعين لا للحقل. */
  candidacyEndRaw: string | null;
  votingEndRaw: string | null;
  /** استُهلكت فرصةُ التمديد التلقائيّ (٢٤ ساعة) — يُصارَح بها المشرف عند ضبط موعدٍ جديد. */
  candidacyExtendedOnce: boolean;
  winnerCandidateId: string | null;
  winnerName: string | null;
  committeeId: number | null;
  siblingSeatReady: boolean; // المقعد الآخر في اللجنة نفسها مغلقُ التصويت وجاهزٌ للحسم التوأم
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

  const eRes = await sb.from("elections").select("id, target_role_name, target_committee_id, target_department_id, status, archived_at, candidacy_end, voting_end, candidacy_extended_once, winner_candidate_id").eq("id", id).maybeSingle();
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

  // النطاق: لجنة أو قسم — و`null` لمنصبٍ لا نطاقَ له (لا تُخترع له علامةُ فراغ في البيانات)
  let scopeLabel: string | null = null;
  if (e.target_committee_id != null) {
    const c = await sb.from("committees").select("committee_name_ar").eq("id", e.target_committee_id).maybeSingle();
    scopeLabel = c.data?.committee_name_ar ?? null;
  } else if (e.target_department_id != null) {
    const d = await sb.from("departments").select("name_ar").eq("id", e.target_department_id).maybeSingle();
    scopeLabel = d.data?.name_ar ?? null;
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

  // جاهزيّةُ الحسم التوأم: المقعد الآخر في اللجنة نفسها مغلقُ التصويت بلا فائزٍ بعد
  let siblingSeatReady = false;
  if (e.target_committee_id != null && e.status === "voting_closed"
      && (e.target_role_name === "committee_leader" || e.target_role_name === "deputy_committee_leader")) {
    const other = e.target_role_name === "committee_leader" ? "deputy_committee_leader" : "committee_leader";
    const sib = await sb.from("elections").select("id")
      .eq("target_committee_id", e.target_committee_id).eq("target_role_name", other)
      .eq("status", "voting_closed").is("archived_at", null).is("winner_candidate_id", null).maybeSingle();
    siblingSeatReady = !!sib.data;
  }

  return {
    election: {
      id: e.id,
      targetRoleName: e.target_role_name,
      roleLabel,
      scopeLabel,
      positionLabel: positionLine(roleLabel, scopeLabel) ?? roleLabel,
      status: e.status as ElectionStatus,
      archived: !!e.archived_at,
      candidacyEnd: fmtStamp(e.candidacy_end) || null,
      votingEnd: fmtStamp(e.voting_end) || null,
      candidacyEndRaw: e.candidacy_end ?? null,
      votingEndRaw: e.voting_end ?? null,
      candidacyExtendedOnce: !!e.candidacy_extended_once,
      winnerCandidateId: e.winner_candidate_id ?? null,
      winnerName,
      committeeId: e.target_committee_id ?? null,
      siblingSeatReady,
      candidates,
      votes: (voteRes.data ?? []).length,
    },
    error: null,
  };
}
