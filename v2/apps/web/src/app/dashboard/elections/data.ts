// يُستورَد فقط من مكوّنات خادميّة (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { firstAndLastOf } from "@/lib/personName";
import { positionLine, positionParts } from "@/lib/positionLabel";
import { describeEvent, type LogKind } from "./log";
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
  /**
   * الفائزُ حين يُعلَن — حصادُ طور «الاكتمال» في الكرت (`null` قبله): اسمُه وصورتُه وجنسُه.
   * والصورةُ من ملفّه الشخصيّ إن رفعها، وإلّا فأيقونةُ جنسه ثمّ أحرفُه (مبدأ `Avatar` نفسُه).
   */
  winnerName: string | null;
  winnerAvatar: string | null;
  winnerGender: string | null;
  /** نصيبُ الفائز من الصندوق — لا إجماليّه (`votes` أعلاه هو الإجماليّ). */
  winnerVotes: number;
  /** مؤرشف (يُضبط تلقائيًّا على المكتمل والملغى). */
  archived: boolean;
  /** لحظةُ الأرشفة خامًا (ISO) — وهي في الملغى يومُ إلغائه، حصادُ عقدته الأخيرة في الكرت. */
  archivedRaw: string | null;
  /** متعثّر: انقضت مهلةُ الترشّح ولا مرشّح، فالمقعد واقفٌ ينتظر قرار المشرف. */
  stalled: boolean;
  created: string;
  createdRaw: string;
  /**
   * مَن فتح هذا المقعد — اسمُ صاحب القرار (`elections.created_by`، وهو عمودٌ لا يقبل الفراغ،
   * فالفارغُ هنا حسابٌ لم يُقرأ ملفُّه لا انتخابٌ بلا مُنشئ). والفعلُ يُنسَب إلى فاعله في وجه
   * الكرت: القرارُ يُسأل عنه أحد.
   */
  createdByName: string | null;
  /** موعدا الإغلاق التلقائيّ معروضَين (فارغُهما بابٌ يُغلق بيد المشرف). */
  candidacyEnd: string | null;
  votingEnd: string | null;
  /** والموعدان خامَين (ISO) — الجدولُ يسع الطابعَ كاملًا والكرتُ لا، فيصوغ كلُّ سطحٍ بمقاسه. */
  candidacyEndRaw: string | null;
  votingEndRaw: string | null;
};

/**
 * قائمة الانتخابات مع تسمياتها وأعدادها. التسمية تُشتقّ من roles/committees/departments
 * (مصدر واحد)، والعدّادات تُحسب من الصفوف لا من أعمدة مخزّنة.
 */
export async function getElections(): Promise<{ elections: ElectionRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { elections: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const [eRes, rRes, cRes, dRes, candRes, voteRes] = await Promise.all([
    sb.from("elections").select("id, target_role_name, target_committee_id, target_department_id, status, winner_candidate_id, archived_at, stalled_at, candidacy_end, voting_end, created_at, created_by").order("created_at", { ascending: false }),
    sb.from("roles").select("role_name, role_name_ar, home_committee_id").eq("is_elected", true),
    sb.from("committees").select("id, committee_name_ar"),
    sb.from("departments").select("id, name_ar"),
    sb.from("election_candidates").select("id, election_id, user_id, status"),
    sb.from("election_votes").select("election_id, candidate_id"),
  ]);
  const firstErr = eRes.error || rRes.error || cRes.error || dRes.error || candRes.error || voteRes.error;
  if (firstErr) return { elections: [], error: firstErr.message };

  // تسميات المنصب والنطاق — من مصادرها الواحدة.
  const commLabel = new Map<number, string>();
  for (const c of cRes.data ?? []) commLabel.set(c.id, c.committee_name_ar);
  const deptLabel = new Map<number, string>();
  for (const d of dRes.data ?? []) deptLabel.set(d.id, d.name_ar);
  // المقعدُ يُسمّى برتبته ووحدةِ الانتخاب — والانتخابُ يحمل وحدتَه صراحةً (لجنةً أو قسمًا)
  const roleLabel = new Map<string, string>();
  for (const r of rRes.data ?? []) roleLabel.set(r.role_name, r.role_name_ar ?? r.role_name);

  // عدّادات المرشّحين والأصوات لكلّ انتخاب
  const candTotal = new Map<string, number>();
  const candApproved = new Map<string, number>();
  for (const c of candRes.data ?? []) {
    candTotal.set(c.election_id, (candTotal.get(c.election_id) ?? 0) + 1);
    if (c.status === "approved") candApproved.set(c.election_id, (candApproved.get(c.election_id) ?? 0) + 1);
  }
  const voteCount = new Map<string, number>();
  // وأصواتُ الفائز وحدَه — كرتُ المكتمل يقول «فاز بـN صوتًا» فيحتاج نصيبَه لا إجماليَّ الصندوق
  const votesByCand = new Map<string, number>();
  for (const v of voteRes.data ?? []) {
    voteCount.set(v.election_id, (voteCount.get(v.election_id) ?? 0) + 1);
    if (v.candidate_id) votesByCand.set(v.candidate_id, (votesByCand.get(v.candidate_id) ?? 0) + 1);
  }

  // أسماءُ من يظهرون في الكرت: الفائزُ (حصادُ طور «الاكتمال») ومن أنشأ الانتخاب. ويُسأل عنهما
  // في نداءٍ واحدٍ بمعرّفاتهما وحدها (لا عن كلّ مرشّح)، فأكثرُ ما يمرّ ضِعفُ عدد الانتخابات.
  const userByCandId = new Map<string, string>();
  for (const c of candRes.data ?? []) userByCandId.set(c.id, c.user_id);
  const winnerUserIds = (eRes.data ?? [])
    .map((e) => (e.winner_candidate_id ? userByCandId.get(e.winner_candidate_id) : null))
    .filter((v): v is string => !!v);
  const shownUserIds = [...new Set([...winnerUserIds, ...(eRes.data ?? []).map((e) => e.created_by).filter((v): v is string => !!v)])];
  const profileById = new Map<string, { name: string; avatar: string | null; gender: string | null }>();
  if (shownUserIds.length) {
    const pRes = await sb.from("profiles").select("id, full_name, avatar_url, gender").in("id", shownUserIds);
    if (pRes.error) return { elections: [], error: pRes.error.message };
    for (const p of pRes.data ?? []) profileById.set(p.id, { name: p.full_name, avatar: p.avatar_url ?? null, gender: p.gender ?? null });
  }

  /** صاحبُ المقعد من معرّف مرشّحه — اسمًا وصورةً وجنسًا (والجنسُ لأيقونة البديل حين لا صورة). */
  const winnerOf = (candId: string | null) => (candId ? profileById.get(userByCandId.get(candId) ?? "") ?? null : null);

  const elections: ElectionRow[] = (eRes.data ?? []).map((e) => {
    const rLabel = roleLabel.get(e.target_role_name) ?? e.target_role_name;
    // النطاق: دور القسم يحمل قسمًا، ودورا اللجنة يحملان لجنة (قيد elections_scope_check)
    const scope = e.target_committee_id != null
      ? (commLabel.get(e.target_committee_id) ?? `لجنة #${e.target_committee_id}`)
      : e.target_department_id != null
        ? (deptLabel.get(e.target_department_id) ?? `قسم #${e.target_department_id}`)
        : null;
    // الجدول يُبرز الرتبة ويُتبعها نطاقَها، فيأخذ القطعتين لا الجملة — ومن المصدر
    // الواحد (`positionParts`) لا من نصٍّ يُركَّب هنا.
    const part = positionParts(rLabel, scope);
    return {
      id: e.id,
      targetRoleName: e.target_role_name,
      roleLabel: part.title,
      scopeLabel: part.scope,
      positionLabel: positionLine(rLabel, scope) ?? rLabel,
      status: e.status as ElectionStatus,
      candidates: candTotal.get(e.id) ?? 0,
      approved: candApproved.get(e.id) ?? 0,
      votes: voteCount.get(e.id) ?? 0,
      hasWinner: !!e.winner_candidate_id,
      winnerName: winnerOf(e.winner_candidate_id)?.name ?? null,
      winnerAvatar: winnerOf(e.winner_candidate_id)?.avatar ?? null,
      winnerGender: winnerOf(e.winner_candidate_id)?.gender ?? null,
      winnerVotes: e.winner_candidate_id ? votesByCand.get(e.winner_candidate_id) ?? 0 : 0,
      archived: !!e.archived_at,
      archivedRaw: e.archived_at ?? null,
      stalled: !!e.stalled_at,
      created: fmtDateTime(e.created_at),
      createdRaw: e.created_at ?? "",
      createdByName: profileById.get(e.created_by)?.name ?? null,
      candidacyEnd: fmtStamp(e.candidacy_end) || null,
      votingEnd: fmtStamp(e.voting_end) || null,
      candidacyEndRaw: e.candidacy_end ?? null,
      votingEndRaw: e.voting_end ?? null,
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
  /** صورةُ ملفّه وجنسُه — الكرتُ يعرض صورتَه إن رفعها، وإلّا أيقونةَ جنسه ثمّ أحرفَه. */
  avatar: string | null;
  gender: string | null;
  statement: string;
  fileUrl: string | null;
  fileName: string | null;
  status: CandidateStatus;
  reviewNote: string | null;
  /**
   * صاحبُ القرار القائم في هذا المرشّح ولحظتُه (`reviewed_by`/`reviewed_at`) — الحكمُ يُنسَب
   * إلى مَن أصدره. و`null` قبل أن يُراجَع، **وكذلك بعد أن يُعاد إلى المراجعة**: الرجعةُ تُبطل
   * الحكمَ ولا تمسح عمودَه، فلا يُنسَب إلى أحدٍ حكمٌ لم يعد قائمًا (والسجلّ يحفظ ما جرى).
   */
  decidedBy: string | null;
  decidedAt: string | null;
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
  /** متعثّر: انقضت مهلةُ الترشّح ولا مرشّح، فالمقعد ينتظر قرارَ المشرف (الأبواب الثلاثة). */
  stalled: boolean;
  /** تزكية: معتمَدٌ واحدٌ لا غير، فالاقتراعُ تأييدٌ أو اعتراضٌ لا اختيارٌ بين اثنين. */
  confidence: boolean;
  /** وزنُ الاعتراض وعددُه في التزكية (صفرٌ في التنافس، إذ لا اعتراضَ فيه). */
  opposeWeight: number;
  opposeVotes: number;
  winnerCandidateId: string | null;
  winnerName: string | null;
  committeeId: number | null;
  /** قسمُ المقعد — وحدةُ الحسم (`resolve_department_election_winners`). */
  departmentId: number | null;
  /** مقاعدُ القسم التي تشارك هذا المقعد مرشّحًا: جاهزةً للحسم معه، أو حائلةً دونه لأنّ تصويتها لم يُغلق. */
  jointPending: number;
  jointBlocking: number;
  candidates: CandidateRow[];
  votes: number;
};

/** حالاتٌ يقوم فيها حكمٌ لصاحبه — ما عداها لا يُنسَب إلى أحد (لا حكمَ فيه أو أبطلته رجعة). */
const DECIDED = new Set<string>(["approved", "rejected", "needs_edit"]);

/**
 * تفصيل انتخابٍ للوحة الإدارة — يقرأ المرشّحين بهُويّاتهم مباشرةً عبر الخدمة
 * (الصفحة محروسة بـ manage_elections سلفًا؛ التعمية للناخبين لا للمشرف).
 */
export async function getElectionDetail(id: string): Promise<{ election: ElectionDetail | null; error: string | null }> {
  const sb = service();
  if (!sb) return { election: null, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const eRes = await sb.from("elections").select("id, target_role_name, target_committee_id, target_department_id, status, archived_at, stalled_at, candidacy_end, voting_end, winner_candidate_id").eq("id", id).maybeSingle();
  if (eRes.error) return { election: null, error: eRes.error.message };
  if (!eRes.data) return { election: null, error: null };
  const e = eRes.data;

  const [rRes, candRes, voteRes] = await Promise.all([
    sb.from("roles").select("role_name_ar, home_committee_id").eq("role_name", e.target_role_name).maybeSingle(),
    sb.from("election_candidates").select("id, candidate_number, user_id, statement_ar, file_url, file_name, status, review_note_ar, reviewed_by, reviewed_at, submitted_at").eq("election_id", id).order("candidate_number", { ascending: true }),
    sb.from("election_votes").select("candidate_id, vote_weight, vote_choice").eq("election_id", id),
  ]);
  const firstErr = rRes.error || candRes.error || voteRes.error;
  if (firstErr) return { election: null, error: firstErr.message };

  // تجميع الأصوات لكلّ مرشّح (وزنًا وعددًا) — للمشرف بعد التصويت.
  // التأييدُ وحده يُنسب إلى المرشّح؛ والاعتراضُ (لا يكون إلّا في تزكية) يُجمع للانتخاب نفسه.
  const weightByCand = new Map<string, number>();
  const votesByCand = new Map<string, number>();
  let opposeWeight = 0;
  let opposeVotes = 0;
  for (const v of voteRes.data ?? []) {
    if (v.vote_choice === "reject") { opposeWeight += Number(v.vote_weight); opposeVotes += 1; continue; }
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

  // أسماء المرشّحين ومراجعيهم من profiles (استعلام منفصل تفاديًا لالتباس مفتاحَي user_id/reviewed_by):
  // نداءٌ واحدٌ يحمل الطرفين، فالمراجعُ اسمٌ يُقرأ لا معرّفٌ ثانٍ يُسأل عنه.
  const cand = candRes.data ?? [];
  const personById = new Map<string, { name: string; avatar: string | null; gender: string | null }>();
  const userIds = [...new Set([...cand.map((c) => c.user_id), ...cand.map((c) => c.reviewed_by).filter((v): v is string => !!v)])];
  if (userIds.length) {
    const pRes = await sb.from("profiles").select("id, full_name, avatar_url, gender").in("id", userIds);
    if (pRes.error) return { election: null, error: pRes.error.message };
    for (const p of pRes.data ?? []) personById.set(p.id, { name: p.full_name, avatar: p.avatar_url ?? null, gender: p.gender ?? null });
  }

  const candidates: CandidateRow[] = cand.map((c) => ({
    id: c.id,
    number: c.candidate_number,
    userId: c.user_id,
    name: personById.get(c.user_id)?.name ?? "—",
    avatar: personById.get(c.user_id)?.avatar ?? null,
    gender: personById.get(c.user_id)?.gender ?? null,
    statement: c.statement_ar,
    fileUrl: c.file_url ?? null,
    fileName: c.file_name ?? null,
    status: c.status as CandidateStatus,
    reviewNote: c.review_note_ar ?? null,
    // الحكمُ القائم وحدَه يُنسَب: مَن أُعيد إلى المراجعة لا حكمَ عليه الآن وإن بقي أثرُ القديم
    decidedBy: DECIDED.has(c.status) ? personById.get(c.reviewed_by ?? "")?.name ?? null : null,
    decidedAt: DECIDED.has(c.status) ? fmtStamp(c.reviewed_at) || null : null,
    submitted: fmtDateTime(c.submitted_at),
    submittedRaw: c.submitted_at ?? "",
    weight: weightByCand.get(c.id) ?? 0,
    votes: votesByCand.get(c.id) ?? 0,
  }));

  const winnerName = e.winner_candidate_id ? (candidates.find((c) => c.id === e.winner_candidate_id)?.name ?? null) : null;
  const detailPart = positionParts(roleLabel, scopeLabel);

  // حالُ الحسم في القسم: كم مقعدًا يشارك هذا المقعد مرشّحًا، جاهزًا أو لم يُغلق تصويتُه بعد.
  // الحَكَم في القاعدة (`department_resolution_state`) فلا تُعاد القاعدةُ هنا نصًّا ثانيًا.
  let departmentId: number | null = e.target_department_id ?? null;
  let jointPending = 0;
  let jointBlocking = 0;
  if (e.status === "voting_closed") {
    const st = await sb.rpc("department_resolution_state", { p_election: id });
    const s = (st.data ?? null) as { department: number | null; blocking: number; pending: number } | null;
    if (s) { departmentId = s.department; jointPending = s.pending; jointBlocking = s.blocking; }
  } else if (departmentId == null && e.target_committee_id != null) {
    const c = await sb.from("committees").select("department_id").eq("id", e.target_committee_id).maybeSingle();
    departmentId = (c.data?.department_id as number | null) ?? null;
  }

  return {
    election: {
      id: e.id,
      targetRoleName: e.target_role_name,
      // مدموجتان قبل التسليم — كالكشف (`positionParts`)
      roleLabel: detailPart.title,
      scopeLabel: detailPart.scope,
      positionLabel: positionLine(roleLabel, scopeLabel) ?? roleLabel,
      status: e.status as ElectionStatus,
      archived: !!e.archived_at,
      candidacyEnd: fmtStamp(e.candidacy_end) || null,
      votingEnd: fmtStamp(e.voting_end) || null,
      candidacyEndRaw: e.candidacy_end ?? null,
      votingEndRaw: e.voting_end ?? null,
      stalled: !!e.stalled_at,
      confidence: candidates.filter((c) => c.status === "approved").length === 1,
      opposeWeight,
      opposeVotes,
      winnerCandidateId: e.winner_candidate_id ?? null,
      winnerName,
      committeeId: e.target_committee_id ?? null,
      departmentId,
      jointPending,
      jointBlocking,
      candidates,
      votes: (voteRes.data ?? []).length,
    },
    error: null,
  };
}

/* ══ سجلّ الانتخاب — مَن فعل ماذا ═══════════════════════════════════════ */

/** حدثٌ في سجلّ الانتخاب: ما جرى، ومَن أجراه، ومتى، وعلى مَن وقع. */
export type ElectionLogEvent = {
  id: number;
  kind: LogKind;
  label: string;
  note: string | null;
  /** الفاعل — و`null` فاعلُه النظامُ نفسُه (كنّاسةُ المواعيد لا تُنسَب إلى أحد). */
  actor: string | null;
  /** المرشّحُ الذي وقع عليه الفعل — تسمّيه الشاشةُ من صفوفها (رقمًا واسمًا). */
  candidateId: string | null;
  date: string;
};

/**
 * سجلُّ انتخابٍ واحد بفاعليه — **بعميل الجلسة** لا الخدمة: `get_election_audit_log` تُصرّح
 * بـ`auth.uid()` (مديرًا أو مطّلِعًا)، فمفتاحُ الخدمة يُفرغ الهويّة فتُرفَض القراءة.
 *
 * **والأحدثُ أوّلًا** (قرارُ المالك ٢٠٢٦-٠٨-١٥، ناسخًا «الأقدمُ أوّلًا» في ٠٨-١٤): آخرُ ما جرى
 * هو المسؤولُ عنه، فيقع في رأس الشاشة بلا نزول. والقاعدةُ تُخرجه كذلك (`ORDER BY created_at
 * DESC`)، فلا يُقلَب هنا: ترتيبُها ترتيبُ العرض لقارئَيه معًا (صفحةُ الانتخاب ونافذةُ المرشّح).
 *
 * والمطويُّ يسقط هنا لا في الشاشة (`describeEvent`): توأمُ الحدث، والأرشفةُ التلقائيّة،
 * وصوتُ الناخب — الاقتراعُ سرٌّ لا يُكشف في سجلّ.
 */
export async function getElectionLog(id: string): Promise<{ events: ElectionLogEvent[]; error: string | null }> {
  const session = await createClient();
  const { data, error } = await session.rpc("get_election_audit_log", { p_election: id });
  if (error) return { events: [], error: error.message };

  const rows = (data ?? []) as { id: number; created_at: string; event_type: string; actor_name: string | null; payload: Record<string, unknown> | null }[];

  // مَن يُذكَر في متن الجملة لا في سطر النسبة: المكلَّفُ على مقعد (الفاعلُ مَن كلّفه). يُسأل
  // عنه بمعرّفه وحده وفي نداءٍ واحد، ولا يُسأل أصلًا إن لم يقع تكليفٌ في هذا الانتخاب.
  const appointeeIds = [...new Set(rows
    .filter((r) => r.event_type === "seat_appointed" && typeof r.payload?.["user_id"] === "string")
    .map((r) => r.payload!["user_id"] as string))];
  const nameById = new Map<string, string>();
  if (appointeeIds.length) {
    const svc = service();
    const pRes = svc ? await svc.from("profiles").select("id, full_name").in("id", appointeeIds) : null;
    for (const p of pRes?.data ?? []) nameById.set(p.id as string, firstAndLastOf(p.full_name as string));
  }

  const events: ElectionLogEvent[] = [];
  for (const r of rows) {
    const uid = typeof r.payload?.["user_id"] === "string" ? (r.payload["user_id"] as string) : null;
    const f = describeEvent(r, { audience: "admin", personName: uid ? nameById.get(uid) ?? null : null });
    if (f.hidden) continue;
    events.push({
      id: r.id,
      kind: f.kind,
      label: f.label,
      note: f.note,
      actor: r.actor_name,
      candidateId: f.candidateId,
      date: fmtStamp(r.created_at),
    });
  }
  return { events, error: null };
}

/* ══ من يصلح للتكليف على مقعدٍ تعثّر انتخابُه ═════════════════════════ */

export type AppointOption = { id: string; label: string };

/**
 * أعضاءُ نطاق المقعد السارون — لبابِ «كلِّف شاغلًا» حين يقف الانتخاب بلا مرشّحين.
 * النطاقُ نطاقُ الناخبين أنفسِهم: أعضاءُ اللجنة لمقعدَيها، وأعضاءُ لجان القسم لمقعد تنسيقه.
 * والحَكَمُ الأخير `assign_position` في القاعدة؛ هذه قائمةُ عرضٍ لا حارس.
 */
export async function getAppointableMembers(electionId: string): Promise<{ members: AppointOption[]; error: string | null }> {
  const sb = service();
  if (!sb) return { members: [], error: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const eRes = await sb.from("elections").select("target_committee_id, target_department_id").eq("id", electionId).maybeSingle();
  if (eRes.error) return { members: [], error: eRes.error.message };
  if (!eRes.data) return { members: [], error: "الانتخاب غير موجود." };

  let committeeIds: number[] = [];
  if (eRes.data.target_committee_id != null) {
    committeeIds = [eRes.data.target_committee_id];
  } else if (eRes.data.target_department_id != null) {
    const cRes = await sb.from("committees").select("id").eq("department_id", eRes.data.target_department_id);
    if (cRes.error) return { members: [], error: cRes.error.message };
    committeeIds = (cRes.data ?? []).map((c) => c.id as number);
  }
  if (!committeeIds.length) return { members: [], error: null };

  const uRes = await sb.from("user_roles").select("user_id").eq("is_active", true).in("committee_id", committeeIds);
  if (uRes.error) return { members: [], error: uRes.error.message };
  const ids = [...new Set((uRes.data ?? []).map((u) => u.user_id as string))];
  if (!ids.length) return { members: [], error: null };

  // السارون وحدهم يُعرَضون (لا موقوفَ ولا مُنهَى عضويّتُه)
  const pRes = await sb.from("profiles").select("id, full_name").in("id", ids).eq("account_status", "active").order("full_name", { ascending: true });
  if (pRes.error) return { members: [], error: pRes.error.message };

  return { members: (pRes.data ?? []).map((p) => ({ id: p.id as string, label: p.full_name as string })), error: null };
}

/* ══ تفصيلُ الأصوات ══════════════════════════════════════════════════
   **مَن صوّت ولمن** — بقرار المالك ٢٠٢٦-٠٨-١٥، وقد نبّهتُه إلى ثمنه فأعاد الطلب: الورقةُ
   تُقرأ رأيًا في مرشّحٍ لا حِقدًا في نفس، ومتى علم الأعضاء أنّها تُقرأ صوّتوا بما يُرضي لا
   بما يرون. والقرارُ قرارُه، والواجهةُ لم تعد تَعِد بما لا يقع (جملةُ البطاقة صُحّحت).

   والحارسُ في القاعة وحدَها: `get_election_vote_detail` ترفض غير حاملِ `manage_elections`
   (ثلاثةُ مناصب)، ولم يعد شرطُ الأرشفة قائمًا فتُقرأ أثناء التصويت (ترحيل ٢٠٢٦-٠٨-١٥).
   ــ وبعميل الجلسة لا الخدمة، كسائر دوالّ الانتخابات (مفتاحُ الخدمة يُفرغ الهويّة فتُرفَض). */

export type VoteDetailRow = {
  voter: string;
  /** رتبتُه **ساعةَ صوّت** لا اليوم — لقطةٌ محفوظةٌ في الصوت نفسِه. */
  voterRole: string | null;
  candidateNumber: number | null;
  candidate: string | null;
  weight: number;
  /** في التزكية يكون الرأيُ اعتراضًا، وفي التنافس تأييدٌ دائمًا. */
  choice: "approve" | "reject";
  at: string;
};

export async function getVoteDetail(id: string): Promise<{ rows: VoteDetailRow[]; error: string | null }> {
  const session = await createClient();
  const { data, error } = await session.rpc("get_election_vote_detail", { p_election: id });
  // رسالةُ الدالّة عربيّةٌ من عندنا، فتُعرَض كما هي وإلّا فاحتياطيٌّ نظيف
  if (error) return { rows: [], error: /[؀-ۿ]/.test(error.message ?? "") ? error.message : "تعذّر جلب تفصيل الأصوات." };

  type Row = { voter_name: string | null; voter_role: string | null; candidate_number: number | null; candidate_name: string | null; vote_weight: number | string | null; vote_choice: string | null; voted_at: string };
  const raw = (data ?? []) as Row[];

  // لقطةُ الرتبة محفوظةٌ بالاسم البرمجيّ (`club_president`)، والشاشةُ عربيّة — فتُترجم من
  // `roles` (المصدر الواحد لتسمية الرتب)، ونداءٌ واحدٌ لما وقع في هذا الانتخاب لا لكلّ الأدوار.
  const snapshots = [...new Set(raw.map((r) => r.voter_role).filter((x): x is string => !!x))];
  const roleAr = new Map<string, string>();
  if (snapshots.length) {
    const svc = service();
    const rRes = svc ? await svc.from("roles").select("role_name, role_name_ar").in("role_name", snapshots) : null;
    for (const r of rRes?.data ?? []) roleAr.set(r.role_name as string, (r.role_name_ar as string | null) ?? (r.role_name as string));
  }

  const rows: VoteDetailRow[] = raw.map((r) => ({
    voter: r.voter_name ? firstAndLastOf(r.voter_name) : "عضوٌ محذوف",
    voterRole: r.voter_role ? roleAr.get(r.voter_role) ?? r.voter_role : null,
    candidateNumber: r.candidate_number ?? null,
    candidate: r.candidate_name ? firstAndLastOf(r.candidate_name) : null,
    weight: Number(r.vote_weight ?? 0),
    choice: r.vote_choice === "reject" ? "reject" : "approve",
    at: fmtDateTime(r.voted_at),
  }));
  return { rows, error: null };
}
