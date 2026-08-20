// عالمُ المحاكي — صورةُ الجداول الأربعة في الذاكرة، ومعها الدوالُّ **المشتقّة** التي تقرؤها
// القاعدة قبل كلّ حكم. لا فعلَ هنا (الأفعال في `rules.ts`)، إنّما بناتٌ وقراءات.
//
// **قانونُ هذا الملفّ**: كلُّ دالّةٍ تحمل في تعليقها اسمَ نظيرتها في القاعدة. من غيّر هناك
// غيّر هنا — **بيده وبعينه**: لا مُعايِرَ آليًّا يقابل هذه الدوالّ بأصولها في القاعدة، ولا
// ملفَّ `parity` في المستودع (كان هذا التعليقُ يُحيل إليه فصُحّح ٢٠٢٦-٠٨-١٦).
//
// والذي يحرسها اليوم `sim/__tests__/world.test.ts`: يمسّ الأهليّةَ والأوزانَ والقراءاتِ
// المشتقّة بحالاتها، فيُمسِك انكسارَ **المنطق ههنا**. أمّا افتراقُه عن القاعدة فلا يُمسِكه.

import type { CandidateStatus, ElectionStatus } from "@/app/dashboard/elections/vocab";
import { CAPS, COMMITTEES, MEMBERS, ROLES, committeeOf, type ElectedRole, type SimMember } from "./org";

/* ══ الصفوف ══════════════════════════════════════════════════════════ */

/** صفُّ `elections`. والأزمنةُ أعدادُ ميلّي ثانية (لا نصوص) فيُقارَن بها زمنُ المحاكي. */
export type SimElection = {
  id: string;
  targetRoleName: ElectedRole;
  targetCommitteeId: number | null;
  targetDepartmentId: number | null;
  status: ElectionStatus;
  candidacyOpenedAt: number;
  candidacyEnd: number | null;
  votingOpenedAt: number | null;
  votingEnd: number | null;
  stalledAt: number | null;
  archivedAt: number | null;
  winnerCandidateId: string | null;
  winnerDeclaredAt: number | null;
  createdAt: number;
  createdBy: string;
  cancelReason: string | null;
};

/** صفُّ `election_candidates`. */
export type SimCandidate = {
  id: string;
  electionId: string;
  userId: string;
  number: number;
  status: CandidateStatus;
  statement: string;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  fileMime: string | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: number | null;
  submittedAt: number;
  withdrawnAt: number | null;
  /** `preference_rank` — الأدنى أوثَر، والافتراضُ ١ عند التقديم و٢ لمن لم يُسمَّ (كما تقرؤها الدالّة). */
  preferenceRank: number;
};

/** صفُّ `election_votes`. */
export type SimVote = {
  id: string;
  electionId: string;
  voterId: string;
  candidateId: string;
  weight: number;
  /** لقطةُ الرتبة بالاسم البرمجيّ، كما في `voter_role_snapshot`. */
  roleSnapshot: string;
  choice: "approve" | "reject";
  at: number;
};

/** صفُّ `election_audit_log`. و`electionId` فارغُه صفٌّ عامٌّ (حصادُ الكنّاسة). */
export type SimLogRow = {
  id: number;
  electionId: string | null;
  actorId: string | null;
  event: string;
  payload: Record<string, unknown>;
  at: number;
};

/** أثرُ `assign_position` — منصبٌ أُسنِد بإعلانِ فوزٍ أو بتكليف. */
export type SimAssignment = {
  userId: string;
  roleName: string;
  committeeId: number | null;
  departmentId: number | null;
  at: number;
  note: string;
};

/** إشعارٌ كما يبعثه `_send_election_notification` — يُعرَض في لوحة الأثر لا في شاشةٍ حقيقيّة. */
export type SimNotice = { id: number; audience: string; title: string; body: string; tone: string; at: number };

export type SimWorld = {
  /** ساعةُ العالم — تُقدَّم بيد المُجرِّب، فتُختبَر المواعيدُ والكنّاسة بلا انتظار. */
  now: number;
  seq: number;
  elections: SimElection[];
  candidates: SimCandidate[];
  votes: SimVote[];
  log: SimLogRow[];
  assignments: SimAssignment[];
  notices: SimNotice[];
  /**
   * منصبُ من أُسنِد إليه شيءٌ في هذا العالم — يعلو منصبَه في `MEMBERS`.
   * **ولا بدّ منه**: مَن فاز صار قائدًا، فتغيّر وزنُه وسقطت أهليّتُه للترشّح لمقعده ثانيةً؛
   * ولو بقيت الشاشةُ تقرأ المنصبَ الأوّل لكذب المحاكي بعد أوّل إعلان.
   */
  seatOverride: Record<string, { roleName: string; committeeId: number | null; departmentId: number | null }>;
};

export const emptyWorld = (now: number): SimWorld => ({
  now, seq: 1, elections: [], candidates: [], votes: [], log: [], assignments: [], notices: [], seatOverride: {},
});

/**
 * **مرورُ الزمن إزاحةٌ للماضي لا تقديمٌ للساعة.**
 *
 * الشاشاتُ الحقيقيّة تقرأ `Date.now()` بنفسها (مدّةُ التصويت · العدّادُ الحيّ · حقلُ الموعد)،
 * فلو مضت ساعةُ العالم وحدَها لافترق الحكمان: يُحسَب الموعدُ بساعة الجهاز ويُقاس بساعة العالم،
 * فيُردّ موعدٌ صحيح بجملة «اختر موعدًا في المستقبل». والجذرُ أن تبقى الساعتان واحدةً:
 * فـ«مرّ يوم» تعني **أن يُزاح كلُّ ما في العالم يومًا إلى الوراء** — تقترب المواعيدُ وتشيخ
 * الوقائع — و`now` يبقى ساعةَ الجهاز نفسَها. الأثرُ واحدٌ والحسابُ لا يفترق.
 */
export function shiftWorld(w: SimWorld, ms: number): void {
  const back = (t: number | null) => (t === null ? null : t - ms);
  for (const e of w.elections) {
    e.candidacyOpenedAt -= ms;
    e.createdAt -= ms;
    e.candidacyEnd = back(e.candidacyEnd);
    e.votingOpenedAt = back(e.votingOpenedAt);
    e.votingEnd = back(e.votingEnd);
    e.stalledAt = back(e.stalledAt);
    e.archivedAt = back(e.archivedAt);
    e.winnerDeclaredAt = back(e.winnerDeclaredAt);
  }
  for (const c of w.candidates) {
    c.submittedAt -= ms;
    c.reviewedAt = back(c.reviewedAt);
    c.withdrawnAt = back(c.withdrawnAt);
  }
  for (const v of w.votes) v.at -= ms;
  for (const r of w.log) r.at -= ms;
  for (const a of w.assignments) a.at -= ms;
  for (const n of w.notices) n.at -= ms;
}

/** العضوُ بمنصبه **في هذا العالم** — لا بمنصبه المكتوب في `MEMBERS` وحده. */
export function memberIn(w: SimWorld, userId: string | null | undefined): SimMember | null {
  const base = MEMBERS.find((m) => m.id === userId);
  if (!base) return null;
  const ov = w.seatOverride[base.id];
  return ov ? { ...base, ...ov } : base;
}

/** كلُّ الأعضاء بمناصبهم في هذا العالم. */
export const membersIn = (w: SimWorld): SimMember[] => MEMBERS.map((m) => memberIn(w, m.id)!);

/** @db `trg_enforce_position_uniqueness` + `enforce_vacant_target` — مَن يشغل هذا المقعد الآن؟ */
export function seatHolder(w: SimWorld, roleName: string, committeeId: number | null, departmentId: number | null): SimMember | null {
  return membersIn(w).find((m) =>
    m.roleName === roleName
    && (m.committeeId ?? null) === (committeeId ?? null)
    && (m.departmentId ?? null) === (departmentId ?? null)) ?? null;
}

/* ══ قراءاتٌ مشتقّة — كلٌّ بنظيرتها في القاعدة ═════════════════════ */

/** @db `election_department(uuid)` — قسمُه صراحةً أو قسمُ لجنته. */
export function electionDepartment(e: SimElection | null | undefined): number | null {
  if (!e) return null;
  return e.targetDepartmentId ?? committeeOf(e.targetCommitteeId)?.departmentId ?? null;
}

/** @db `_count_active_candidates` — قيد المراجعة أو معتمَد أو يحتاج تعديلًا. */
export const ACTIVE_CANDIDACY: CandidateStatus[] = ["pending", "approved", "needs_edit"];
export const countActive = (w: SimWorld, electionId: string) =>
  w.candidates.filter((c) => c.electionId === electionId && ACTIVE_CANDIDACY.includes(c.status)).length;

/** @db `_count_approved_candidates`. */
export const countApproved = (w: SimWorld, electionId: string) =>
  w.candidates.filter((c) => c.electionId === electionId && c.status === "approved").length;

/** @db `is_confidence_election` — معتمَدٌ واحدٌ لا غير، فالاقتراعُ تزكيةٌ لا اختيار. */
export const isConfidence = (w: SimWorld, electionId: string) => countApproved(w, electionId) === 1;

/** @db `is_sole_candidate(user, election)` — مرشّحُ المقعد الوحيد: يرى بطاقتَه ولا يفعل فيها. */
export const soleCandidate = (w: SimWorld, userId: string, electionId: string) =>
  isConfidence(w, electionId)
  && w.candidates.some((c) => c.electionId === electionId && c.status === "approved" && c.userId === userId);

/** @db `_choice_weight(election, choice)` — مجموعُ أوزان رأيٍ بعينه. */
export const choiceWeight = (w: SimWorld, electionId: string, choice: SimVote["choice"]) =>
  w.votes.filter((v) => v.electionId === electionId && v.choice === choice).reduce((s, v) => s + v.weight, 0);

/** @db `get_vote_weight(user)` — أعلى وزنٍ بين أدوار العضو الحيّة، وأدناه ١. */
export const voteWeight = (w: SimWorld, userId: string) => {
  const m = memberIn(w, userId);
  return m ? ROLES[m.roleName]?.weight ?? 1 : 1;
};

/** @db `check_user_permission(user, key)` — القدرةُ من دور العضو الحيّ. */
export const hasCap = (w: SimWorld, userId: string, key: string) => {
  const m = memberIn(w, userId);
  return !!m && (CAPS[key] ?? []).includes(m.roleName);
};

/** @db `has_election_admin_permission` = `check_user_permission(_, 'manage_elections')`. */
export const isElectionAdmin = (w: SimWorld, userId: string) => hasCap(w, userId, "manage_elections");

/** @db `is_top_admin_role` — يشتقّ من `roles.votes_in_all_elections`، لا من قائمةٍ محفورة. */
export const isTopAdmin = (w: SimWorld, userId: string) => {
  const m = memberIn(w, userId);
  return !!m && !!ROLES[m.roleName]?.votesAll;
};

/** وزنُ مرشّحٍ = مجموعُ أوزان مؤيّديه (والاعتراضُ في التزكية لا يُحسب له). */
export const candidateWeight = (w: SimWorld, candidateId: string) =>
  w.votes.filter((v) => v.candidateId === candidateId && v.choice === "approve").reduce((s, v) => s + v.weight, 0);

export const candidateVotes = (w: SimWorld, candidateId: string) =>
  w.votes.filter((v) => v.candidateId === candidateId && v.choice === "approve").length;

/**
 * @db `is_user_eligible_to_vote(user, election)` — الإداريُّ الأعلى يصوّت في الكلّ، ومن سواه
 * ناخبُ نطاقه: مقعدُ القسم ناخبوه أعضاءُ لجانه، ومقعدا اللجنة ناخبوهما أعضاؤها.
 *
 * **والأهليّةُ رؤيةٌ قبل أن تكون فعلًا**: مرشّحُ المقعد الوحيد يبقى مؤهَّلًا فيرى بطاقتَه،
 * ويردّه عن الصندوق حارسُ «لا تصوّت لنفسك» لا حجبُ الباب (`soleCandidate` تسمّي حالَه).
 */
export function eligibleToVote(w: SimWorld, userId: string, electionId: string): boolean {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return false;
  if (isTopAdmin(w, userId)) return true;
  const m = memberIn(w, userId);
  if (!m) return false;
  if (e.targetRoleName === "department_head") {
    return COMMITTEES.some((c) => c.departmentId === e.targetDepartmentId && c.id === m.committeeId);
  }
  return m.committeeId === e.targetCommitteeId;
}

/**
 * @db `is_user_eligible_to_run(user, election)` — منقولةٌ ببنودها الثلاثة:
 * (أ) لا يترشّح إداريٌّ، ولا بدّ من قدرة `run_for_election`.
 * (ب) تعارضاتٌ بنيويّة (منسّقٌ لا يترشّح لمقاعد لجان قسمه، وشاغلُ المقعد لا يترشّح له) ثمّ النطاق.
 * (ج) لا ترشّحَ سابقٌ في هذا المقعد، ولا ترشّحٌ نشطٌ في **قسمٍ مغاير**.
 */
export function eligibleToRun(w: SimWorld, userId: string, electionId: string): boolean {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e || e.status !== "candidacy_open" || e.archivedAt) return false;

  const m = memberIn(w, userId);
  if (!m) return false;

  // (أ)
  if (ROLES[m.roleName]?.council === "administrative") return false;
  if (!hasCap(w, userId, "run_for_election")) return false;

  // (ب)
  if (e.targetRoleName === "department_head") {
    if (m.roleName === "department_head") return false;
    const inScope = COMMITTEES.some((c) => c.departmentId === e.targetDepartmentId && c.id === m.committeeId);
    if (!inScope) return false;
  } else {
    const target = committeeOf(e.targetCommitteeId);
    if (m.roleName === "department_head" && m.departmentId === target?.departmentId) return false;
    if (m.roleName === "committee_leader" && m.committeeId === e.targetCommitteeId) return false;
    if (e.targetRoleName === "deputy_committee_leader"
      && m.roleName === "deputy_committee_leader" && m.committeeId === e.targetCommitteeId) return false;
    if (m.committeeId !== e.targetCommitteeId) return false;
  }

  // (ج)
  if (w.candidates.some((c) => c.electionId === electionId && c.userId === userId)) return false;
  const dept = electionDepartment(e);
  const LIVE: ElectionStatus[] = ["candidacy_open", "candidacy_closed", "voting_open", "voting_closed"];
  const elsewhere = w.candidates.some((c) => {
    if (c.userId !== userId || !ACTIVE_CANDIDACY.includes(c.status)) return false;
    const other = w.elections.find((x) => x.id === c.electionId);
    if (!other || other.archivedAt || !LIVE.includes(other.status) || other.id === electionId) return false;
    return electionDepartment(other) !== dept;
  });
  return !elsewhere;
}

/** مقاعدُ القسم الحيّة — يقرؤها حارسُ الإعلان المنفرد وحاسمُ القسم. */
export const LIVE_STATUSES: ElectionStatus[] = ["candidacy_open", "candidacy_closed", "voting_open", "voting_closed"];

/**
 * @db `department_resolution_state(election)` — كم مقعدًا في القسم جاهزٌ للحسم معه، وكم مقعدًا
 * يحول دونه لأنّ تصويتَه لم يُغلق. تُقرأ في `getElectionDetail` فتُظهر زرَّ «إعلان فائزي القسم».
 */
export function departmentResolutionState(w: SimWorld, electionId: string): { pending: number; blocking: number } {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return { pending: 0, blocking: 0 };
  const dept = electionDepartment(e);
  const mine = w.candidates.filter((c) => c.electionId === electionId && c.status === "approved").map((c) => c.userId);
  if (!mine.length) return { pending: 0, blocking: 0 };

  let pending = 0;
  let blocking = 0;
  for (const other of w.elections) {
    if (other.id === electionId || other.archivedAt) continue;
    if (electionDepartment(other) !== dept) continue;
    if (!LIVE_STATUSES.includes(other.status)) continue;
    const shares = w.candidates.some((c) =>
      c.electionId === other.id && mine.includes(c.userId) && ACTIVE_CANDIDACY.includes(c.status));
    if (!shares) continue;
    if (other.status === "voting_closed" && !other.winnerCandidateId) pending += 1;
    else blocking += 1;
  }
  return { pending, blocking };
}

/* ══ مولّداتُ المعرّفات ═════════════════════════════════════════════ */

export const nextId = (w: SimWorld, prefix: string) => `${prefix}-${w.seq++}`;
export const nextLogId = (w: SimWorld) => (w.log.reduce((m, r) => Math.max(m, r.id), 0) + 1);

/**
 * كتابةُ سطرٍ في السجلّ — كلُّ فعلٍ يكتب سطرَه كما تكتبه القاعدة، بفاعله وحمولته.
 * و`at` للبذر وحدَه (وقائعُ ماضيةٌ تُكتب بزمنها)؛ والأفعالُ الحيّة تكتب بساعة العالم.
 */
export function writeLog(w: SimWorld, electionId: string | null, actorId: string | null, event: string, payload: Record<string, unknown> = {}, at?: number) {
  w.log.push({ id: nextLogId(w), electionId, actorId, event, payload, at: at ?? w.now });
}

export function notify(w: SimWorld, audience: string, title: string, body: string, tone = "info") {
  w.notices.push({ id: w.notices.length + 1, audience, title, body, tone, at: w.now });
}
