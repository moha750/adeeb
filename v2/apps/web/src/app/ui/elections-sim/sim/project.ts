// **الإسقاط** — من عالم المحاكي إلى الأنواع التي تأكلها شاشاتُ الإنتاج حرفيًّا
// (`ElectionRow` · `ElectionDetail` · `RunItem` · `VoteItem` · `CandidacyJourney` · …).
//
// وكلُّ دالّةٍ هنا **مرآةُ جالبٍ في `data.ts` أو `member-data.ts`**: التسميةُ من
// `positionParts`/`positionLine`، والتواريخُ من `lib/dates` نفسِها، والجملُ من `log.ts`.
// فما يُرسَم في المحاكي هو ما يُرسَم في اللوحة، بالحرف.

import { fmtDate, fmtMonthYear, fmtStamp } from "@/lib/dates";
import { firstAndLastOf } from "@/lib/personName";
import { positionLine, positionParts } from "@/lib/positionLabel";
import { describeEvent, type LogKind } from "@/app/dashboard/elections/log";
import type {
  AppointOption, CandidateRow, ElectionCreateOptions, ElectionDetail, ElectionLogEvent, ElectionRow, FreezeState, LinkedSeat, TieState, VoteDetailRow,
} from "@/app/dashboard/elections/data";
import type {
  ApplyContext, BallotCandidate, BallotContext, CandidacyBan, CandidacyJourney, JourneyStep, MemberFreeze, MyVote, RunItem, SeatOutcome, SeatResult, VoteItem,
} from "@/app/dashboard/elections/member-data";
import { statusView } from "@/app/dashboard/elections/journey";
import { ROLES, committeeOf, departmentOf, type ElectedRole } from "./org";
import { appointableMembers, createOptions } from "./rules";
import {
  ACTIVE_CANDIDACY, LIVE_STATUSES, candidateVotes, candidateWeight, countApproved, departmentResolutionState,
  activeBanOf, electionDepartment, eligibleToRun, eligibleToVote, isElectionAdmin, liveVotesOf, memberIn, membersIn, soleCandidate, type SimCandidate, type SimElection, type SimWorld,
} from "./world";

/** الزمنُ عددٌ في العالم ونصٌّ ISO في الأنواع — فيُحوَّل عند الحدّ لا في الداخل. */
const iso = (t: number | null): string | null => (t === null ? null : new Date(t).toISOString());

const roleAr = (role: string) => ROLES[role]?.ar ?? role;
const scopeAr = (e: SimElection) => committeeOf(e.targetCommitteeId)?.ar ?? departmentOf(e.targetDepartmentId)?.ar ?? null;

/** تسميةُ المقعد كما تبنيها الجوالبُ: قطعتان للجدول، وجملةٌ للعنوان. */
export function labelsOf(e: SimElection) {
  const rank = roleAr(e.targetRoleName);
  const scope = scopeAr(e);
  const part = positionParts(rank, scope);
  return { roleLabel: part.title, scopeLabel: part.scope, positionLabel: positionLine(rank, scope) ?? rank };
}

/* ══ القائمة — مرآةُ `getElections` ═════════════════════════════════ */

export function toElectionRows(w: SimWorld): ElectionRow[] {
  return [...w.elections]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((e) => {
      const mine = w.candidates.filter((c) => c.electionId === e.id);
      const winner = mine.find((c) => c.id === e.winnerCandidateId) ?? null;
      const winnerMember = winner ? memberIn(w, winner.userId) : null;
      const creator = memberIn(w, e.createdBy);
      const { roleLabel, scopeLabel, positionLabel } = labelsOf(e);
      return {
        id: e.id,
        targetRoleName: e.targetRoleName,
        roleLabel, scopeLabel, positionLabel,
        status: e.status,
        candidates: mine.length,
        approved: mine.filter((c) => c.status === "approved").length,
        votes: liveVotesOf(w, e.id).length,
        hasWinner: !!e.winnerCandidateId,
        winnerName: winnerMember?.name ?? null,
        winnerAvatar: null,
        winnerGender: winnerMember?.gender ?? null,
        winnerVotes: winner ? candidateVotes(w, winner.id) : 0,
        archived: !!e.archivedAt,
        archivedRaw: iso(e.archivedAt),
        stalled: !!e.stalledAt,
        stallReason: e.stallReason ?? null,
        revotePending: e.revotePending ?? null,
        completedBy: e.completedBy ?? (e.winnerCandidateId ? "winner" : null),
        created: fmtDate(iso(e.createdAt)),
        createdRaw: iso(e.createdAt) ?? "",
        createdByName: creator?.name ?? null,
        candidacyEnd: fmtStamp(iso(e.candidacyEnd)) || null,
        votingEnd: fmtStamp(iso(e.votingEnd)) || null,
        candidacyEndRaw: iso(e.candidacyEnd),
        votingEndRaw: iso(e.votingEnd),
      };
    });
}

/* ══ خياراتُ الفتح — مرآةُ `getElectionCreateOptions` ═══════════════ */

export function toCreateOptions(w: SimWorld): ElectionCreateOptions {
  const o = createOptions(w);
  return {
    roles: [
      { roleName: "department_head", label: roleAr("department_head"), scope: "department" },
      { roleName: "committee_leader", label: roleAr("committee_leader"), scope: "committee" },
      { roleName: "deputy_committee_leader", label: roleAr("deputy_committee_leader"), scope: "committee" },
    ],
    leaderCommittees: o.leaderCommittees,
    deputyCommittees: o.deputyCommittees,
    departments: o.departments,
    error: null,
  };
}

/* ══ التفصيل — مرآةُ `getElectionDetail` ═══════════════════════════ */

const DECIDED = new Set<string>(["approved", "rejected", "needs_edit"]);

/** مرآةُ قراءة `election_freezes` في `getElectionDetail`: القائمُ وحده، وطالبُه باسمه. */
function freezeOf(w: SimWorld, candidateId: string): FreezeState | null {
  const f = w.freezes.find((x) => x.candidateId === candidateId && x.status !== "closed");
  if (!f) return null;
  return {
    id: f.id,
    status: f.status as FreezeState["status"],
    reason: f.reason,
    requestedBy: memberIn(w, f.requestedBy)?.name ?? null,
    requestedAtRaw: iso(f.requestedAt) ?? "",
    answerWindow: f.answerWindow,
    decideWindow: f.decideWindow,
    answerDueRaw: iso(f.answerDue),
    answerText: f.answerText,
    answeredAtRaw: iso(f.answeredAt),
    decideDueRaw: iso(f.decideDue),
  };
}

/** مرآةُ قراءة التعادل: الحقائقُ لكلّ من يرى الصفحة، والاختياراتُ لعضو المجلس ومن يدير الانتخاب (حارسُ `get_election_tie`). */
const COUNCIL = ["club_president", "executive_council_president", "hr_committee_leader"];
function tieOf(w: SimWorld, electionId: string, viewerId: string | null): TieState | null {
  const t = [...w.ties].filter((x) => x.electionId === electionId).sort((a, b) => b.openedAt - a.openedAt)[0];
  if (!t) return null;
  // المجلسُ الإداريّ = مقاعدُه المشغولةُ الآن (`_is_council_member`)؛ ومديرو الانتخاب في المحاكي هم أنفسُهم أعضاؤه
  const council = membersIn(w).filter((m) => COUNCIL.includes(m.roleName)).map((m) => m.id);
  const isMember = !!viewerId && council.includes(viewerId);
  const guarded = isMember || (!!viewerId && isElectionAdmin(w, viewerId));
  return {
    id: t.id, status: t.status, outcome: t.outcome, dueAtRaw: iso(t.dueAt) ?? "", paused: !!t.pausedAt,
    candidateIds: t.candidateIds, winnerCandidateId: t.winnerCandidateId,
    councilSize: guarded ? council.length : null,
    isMember: guarded ? isMember : null,
    choices: guarded
      ? t.choices.map((c) => ({ member: firstAndLastOf(memberIn(w, c.memberId)?.name ?? ""), candidateId: c.candidateId, reason: c.reason, atRaw: iso(c.at) ?? "", isMe: c.memberId === viewerId }))
      : null,
  };
}

/** مرآةُ المقاعد المرتبطة بأسمائها (المادة 27). */
function linkedSeatsOf(w: SimWorld, e: SimElection): LinkedSeat[] {
  if (e.status !== "voting_closed" || e.winnerCandidateId) return [];
  const dept = electionDepartment(e);
  const mine = w.candidates.filter((c) => c.electionId === e.id && (c.status === "approved" || c.status === "frozen")).map((c) => c.userId);
  if (!mine.length) return [];
  return w.elections
    .filter((o) => o.id !== e.id && !o.archivedAt && !o.winnerCandidateId && electionDepartment(o) === dept)
    .filter((o) => w.candidates.some((c) => c.electionId === o.id && mine.includes(c.userId) && ["pending", "approved", "needs_edit", "frozen"].includes(c.status)))
    .map((o) => ({ id: o.id, positionLabel: labelsOf(o).positionLabel, status: o.status, stalled: !!o.stalledAt }));
}

function toCandidateRow(w: SimWorld, c: SimCandidate): CandidateRow {
  const m = memberIn(w, c.userId);
  const reviewer = c.reviewedBy ? memberIn(w, c.reviewedBy) : null;
  return {
    id: c.id,
    number: c.number,
    userId: c.userId,
    name: m?.name ?? "—",
    avatar: null,
    gender: m?.gender ?? null,
    statement: c.statement,
    fileUrl: c.fileUrl,
    fileName: c.fileName,
    status: c.status,
    reviewNote: c.reviewNote,
    decidedBy: DECIDED.has(c.status) ? reviewer?.name ?? null : null,
    decidedAt: DECIDED.has(c.status) ? fmtStamp(iso(c.reviewedAt)) || null : null,
    submitted: fmtDate(iso(c.submittedAt)),
    submittedRaw: iso(c.submittedAt) ?? "",
    editDueRaw: c.status === "needs_edit" ? iso(c.editDueAt ?? null) : null,
    rejectReason: c.status === "rejected" ? c.rejectReason ?? null : null,
    endReason: c.status === "ended" ? c.endReason ?? null : null,
    endedAtRaw: c.status === "ended" ? iso(c.endedAt ?? null) : null,
    freeze: freezeOf(w, c.id),
    weight: candidateWeight(w, c.id),
    votes: candidateVotes(w, c.id),
  };
}

export function toElectionDetail(w: SimWorld, electionId: string, viewerId: string | null = null): ElectionDetail | null {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return null;

  const candidates = w.candidates
    .filter((c) => c.electionId === electionId)
    .sort((a, b) => a.number - b.number)
    .map((c) => toCandidateRow(w, c));

  const live = liveVotesOf(w, electionId);
  const rejects = live.filter((v) => v.choice === "reject");
  const cancelRow = e.status === "cancelled"
    ? [...w.log].filter((r) => r.electionId === electionId && r.event === "cancelled").sort((a, b) => b.at - a.at)[0] ?? null
    : null;
  const { roleLabel, scopeLabel, positionLabel } = labelsOf(e);
  const joint = e.status === "voting_closed" ? departmentResolutionState(w, electionId) : { pending: 0, blocking: 0 };

  return {
    id: e.id,
    targetRoleName: e.targetRoleName,
    roleLabel, scopeLabel, positionLabel,
    status: e.status,
    archived: !!e.archivedAt,
    candidacyEnd: fmtStamp(iso(e.candidacyEnd)) || null,
    votingEnd: fmtStamp(iso(e.votingEnd)) || null,
    candidacyEndRaw: iso(e.candidacyEnd),
    votingEndRaw: iso(e.votingEnd),
    stalled: !!e.stalledAt,
    stallReason: e.stallReason ?? null,
    stalledAtRaw: iso(e.stalledAt),
    revotePending: e.revotePending ?? null,
    revoteOnly: !!e.revoteOnly,
    completedBy: e.completedBy ?? (e.winnerCandidateId ? "winner" : null),
    appointedName: e.appointedUserId ? memberIn(w, e.appointedUserId)?.name ?? null : null,
    cancel: e.status === "cancelled"
      ? {
        reason: (cancelRow?.payload["reason"] as string | undefined) ?? e.cancelReason ?? "",
        basis: e.cancelBasis ?? null,
        atRaw: iso(cancelRow?.at ?? e.archivedAt) ?? "",
        by: cancelRow?.actorId ? memberIn(w, cancelRow.actorId)?.name ?? null : null,
      }
      : null,
    tie: tieOf(w, electionId, viewerId),
    linkedSeats: linkedSeatsOf(w, e),
    voidedVotes: w.votes.filter((v) => v.electionId === electionId && v.voidedAt).length,
    confidence: countApproved(w, electionId) === 1,
    opposeWeight: rejects.reduce((s, v) => s + v.weight, 0),
    opposeVotes: rejects.length,
    winnerCandidateId: e.winnerCandidateId,
    winnerName: candidates.find((c) => c.id === e.winnerCandidateId)?.name ?? null,
    winnerDeclaredAtRaw: iso(e.winnerDeclaredAt),
    committeeId: e.targetCommitteeId,
    departmentId: electionDepartment(e),
    jointPending: joint.pending,
    jointBlocking: joint.blocking,
    candidates,
    votes: live.length,
  };
}

/* ══ السجلّ — مرآةُ `getElectionLog` ════════════════════════════════ */

export function toLogEvents(w: SimWorld, electionId: string): ElectionLogEvent[] {
  const rows = w.log.filter((r) => r.electionId === electionId).sort((a, b) => b.id - a.id);
  const events: ElectionLogEvent[] = [];
  for (const r of rows) {
    const uid = typeof r.payload["user_id"] === "string" ? (r.payload["user_id"] as string) : null;
    const personName = uid ? firstAndLastOf(memberIn(w, uid)?.name ?? "") || null : null;
    const f = describeEvent({ event_type: r.event, payload: r.payload }, { audience: "admin", personName });
    if (f.hidden) continue;
    events.push({
      id: r.id,
      kind: f.kind,
      label: f.label,
      note: f.note,
      actor: r.actorId ? memberIn(w, r.actorId)?.name ?? null : null,
      candidateId: f.candidateId,
      at: new Date(r.at).toISOString(),
    });
  }
  return events;
}

/* ══ تفصيلُ الأصوات — مرآةُ `getVoteDetail` ════════════════════════ */

export function toVoteDetail(w: SimWorld, electionId: string): VoteDetailRow[] {
  return w.votes
    .filter((v) => v.electionId === electionId)
    .sort((a, b) => a.at - b.at)
    .map((v) => {
      const cand = w.candidates.find((c) => c.id === v.candidateId) ?? null;
      const candMember = cand ? memberIn(w, cand.userId) : null;
      return {
        voter: firstAndLastOf(memberIn(w, v.voterId)?.name ?? "عضوٌ محذوف"),
        voterRole: roleAr(v.roleSnapshot),
        candidateNumber: cand?.number ?? null,
        candidate: candMember ? firstAndLastOf(candMember.name) : null,
        weight: v.weight,
        // الرأيُ خامٌ كما تُخرجه `get_election_vote_detail` (والامتناعُ نُزع، فرأيان لا ثالث)
        choice: v.choice === "reject" ? "reject" : "approve",
        at: fmtDate(iso(v.at)),
        voided: !!v.voidedAt,
        voidReason: v.voidReason ?? null,
      } satisfies VoteDetailRow;
    });
}

export function toAppointOptions(w: SimWorld, electionId: string): AppointOption[] {
  return appointableMembers(w, electionId);
}

/* ══ بابُ الترشُّح — مرآةُ `getRunElections` ════════════════════════ */

export function toRunItems(w: SimWorld, userId: string): RunItem[] {
  return w.elections
    .filter((e) => e.status === "candidacy_open" && !e.archivedAt)
    .filter((e) => eligibleToRun(w, userId, e.id) || w.candidates.some((c) => c.electionId === e.id && c.userId === userId && ACTIVE_CANDIDACY.includes(c.status)))
    .map((e) => ({
      electionId: e.id,
      position: labelsOf(e).positionLabel,
      candidacyEnd: fmtDate(iso(e.candidacyEnd)),
      candidacyEndRaw: iso(e.candidacyEnd),
      hasSubmission: w.candidates.some((c) => c.electionId === e.id && c.userId === userId),
      committeeId: e.targetCommitteeId,
      roleName: e.targetRoleName,
    }));
}

/* ══ بابُ التصويت — مرآةُ `getVoteElections` ═══════════════════════ */

export function toVoteItems(w: SimWorld, userId: string): VoteItem[] {
  const voidedHere = (e: SimElection) => w.votes.some((v) => v.electionId === e.id && v.voterId === userId && v.voidReason === "candidacy_ended");
  return w.elections
    .filter((e) => e.status === "voting_open" && !e.archivedAt && (eligibleToVote(w, userId, e.id) || voidedHere(e)))
    // إعادةُ التصويت المقصورة لا يدخلها غيرُ من بطل صوتُه (المادة 16)
    .filter((e) => !e.revoteOnly || voidedHere(e))
    .map((e) => {
      const live = w.votes.some((v) => v.electionId === e.id && v.voterId === userId && !v.voidedAt);
      return {
        electionId: e.id,
        position: labelsOf(e).positionLabel,
        votingEnd: fmtDate(iso(e.votingEnd)),
        votingEndRaw: iso(e.votingEnd),
        hasVoted: live,
        // مرشّحُ المقعد الوحيد يرى ولا يفعل (`view_only` في الدالّة)
        viewOnly: soleCandidate(w, userId, e.id),
        revote: !live && voidedHere(e),
      };
    });
}

/* ══ بطاقةُ الاقتراع — مرآةُ `getBallot` + `get_ballot_candidates` ══ */

export function toBallot(w: SimWorld, userId: string, electionId: string): BallotContext {
  const election = toVoteItems(w, userId).find((e) => e.electionId === electionId) ?? null;
  if (!election) return { ok: false, error: "هذا الاقتراع غير مفتوحٍ لك الآن.", election: null, candidates: [], myVote: null };

  const candidates: BallotCandidate[] = w.candidates
    .filter((c) => c.electionId === electionId && c.status === "approved")
    .sort((a, b) => a.number - b.number)
    .map((c) => ({
      id: c.id, number: c.number, statement: c.statement,
      // المرشّحُ معروفٌ باسمه (٢٠٢٦-١١-٠٧): الاسمُ والجنسُ من ملفّه، ولا صورةَ في المحاكي
      name: memberIn(w, c.userId)?.name ?? null, gender: memberIn(w, c.userId)?.gender ?? null, avatarUrl: null,
      fileUrl: c.fileUrl, fileName: c.fileName, fileSize: c.fileSize, fileMime: c.fileMime,
      // `is_self` تُحسب في القاعدة من `auth.uid()`، فلا يعرفها إلّا صاحبُها
      isSelf: c.userId === userId,
    }));

  const v = w.votes.find((x) => x.electionId === electionId && x.voterId === userId && !x.voidedAt) ?? null;
  const myVote: MyVote | null = v ? { candidateId: v.candidateId, choice: v.choice } : null;
  return { ok: true, error: null, election, candidates, myVote };
}

/* ══ سِجلّ ترشُّحي — مرآةُ `getMyCandidacies` ═══════════════════════ */

/** المطلوبُ تعديلُه في مهلته، والبابُ قبل التصويت (المادة 14). */
function editable(w: SimWorld, c: SimCandidate): boolean {
  const e = w.elections.find((x) => x.id === c.electionId);
  return c.status === "needs_edit" && !!e && (e.status === "candidacy_open" || e.status === "candidacy_closed") && (!c.editDueAt || c.editDueAt > w.now);
}

/* ══ الحرمان — مرآةُ `getCandidacyBan` ═════════════════════════════ */

export function toCandidacyBan(w: SimWorld, userId: string): CandidacyBan | null {
  const b = activeBanOf(w, userId);
  return b ? { id: b.id, reason: b.reason, until: b.until } : null;
}

/* ══ نتيجةُ المقعد — مرآةُ `getSeatResult` ═════════════════════════ */

export function toSeatResult(w: SimWorld, electionId: string): SeatResult | null {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return null;
  const completedBy = e.completedBy ?? (e.winnerCandidateId ? "winner" : null);
  const winner = e.winnerCandidateId ? w.candidates.find((c) => c.id === e.winnerCandidateId) ?? null : null;
  const personId = e.status !== "completed" ? null : completedBy === "appointment" ? e.appointedUserId ?? null : winner?.userId ?? null;
  const p = personId ? memberIn(w, personId) : null;
  const cancelRow = e.status === "cancelled" ? [...w.log].filter((r) => r.electionId === e.id && r.event === "cancelled").sort((a, b) => b.at - a.at)[0] ?? null : null;
  return {
    electionId, position: labelsOf(e).positionLabel, status: e.status, completedBy,
    person: p ? { name: p.name, gender: p.gender ?? null, avatarUrl: null } : null,
    sole: completedBy === "winner" && countApproved(w, e.id) === 1,
    atRaw: e.status === "completed" ? iso(e.winnerDeclaredAt ?? e.archivedAt) : null,
    cancel: e.status === "cancelled" ? { reason: (cancelRow?.payload["reason"] as string | undefined) ?? e.cancelReason ?? "", atRaw: iso(cancelRow?.at ?? e.archivedAt) ?? "" } : null,
    winnerCandidateId: e.status === "completed" && completedBy === "winner" ? e.winnerCandidateId ?? null : null,
  };
}

/** مرآةُ `getSeatOutcome`: الورقةُ بعد الإعلان لمن صوّت فيها أو ترشّح لها، ومن سواهم `null` */
export function toSeatOutcome(w: SimWorld, userId: string, r: SeatResult): SeatOutcome | null {
  if (r.status !== "completed" || !r.winnerCandidateId) return null;
  const all = w.candidates.filter((c) => c.electionId === r.electionId);
  const v = w.votes.find((x) => x.electionId === r.electionId && x.voterId === userId && !x.voidedAt) ?? null;
  if (!all.some((c) => c.userId === userId) && !v) return null;
  const candidates: BallotCandidate[] = all
    .filter((c) => c.status === "approved" || c.id === r.winnerCandidateId)
    .sort((a, b) => a.number - b.number)
    .map((c) => ({
      id: c.id, number: c.number, statement: c.statement,
      name: memberIn(w, c.userId)?.name ?? null, gender: memberIn(w, c.userId)?.gender ?? null, avatarUrl: null,
      fileUrl: c.fileUrl, fileName: c.fileName, fileSize: c.fileSize, fileMime: c.fileMime,
      isSelf: c.userId === userId,
    }));
  const myVote: MyVote | null = v ? { candidateId: v.candidateId, choice: v.choice } : null;
  return {
    election: { electionId: r.electionId, position: r.position, votingEnd: "", votingEndRaw: null, hasVoted: !!myVote, viewOnly: false, revote: false },
    candidates, myVote, winnerId: r.winnerCandidateId,
    youWon: all.find((c) => c.id === r.winnerCandidateId)?.userId === userId, declaredRaw: r.atRaw,
  };
}

export function toMyCandidacies(w: SimWorld, userId: string): CandidacyJourney[] {
  return w.candidates
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .map((c) => {
      const e = w.elections.find((x) => x.id === c.electionId)!;
      const position = labelsOf(e).positionLabel;
      const isWinner = e.winnerCandidateId === c.id;
      const sole = c.status === "approved" && countApproved(w, e.id) === 1;
      const fz = w.freezes.find((f) => f.candidateId === c.id && (f.status === "active" || f.status === "answered")) ?? null;
      const freeze: MemberFreeze | null = fz && c.status === "frozen" ? {
        id: fz.id, status: fz.status as MemberFreeze["status"], reason: fz.reason,
        answerDueRaw: iso(fz.answerDue), answerText: fz.answerText, answeredAtRaw: iso(fz.answeredAt), decideDueRaw: iso(fz.decideDue),
      } : null;
      const cancelRow = e.status === "cancelled" ? [...w.log].filter((r) => r.electionId === e.id && r.event === "cancelled").sort((a, b) => b.at - a.at)[0] ?? null : null;
      const cancel = e.status === "cancelled"
        ? { reason: (cancelRow?.payload["reason"] as string | undefined) ?? e.cancelReason ?? "", atRaw: iso(cancelRow?.at ?? e.archivedAt) ?? "" }
        : null;
      const facts = {
        editDueRaw: c.status === "needs_edit" ? iso(c.editDueAt ?? null) : null,
        rejectReason: c.status === "rejected" ? c.rejectReason ?? null : null,
        endReason: c.status === "ended" ? c.endReason ?? null : null,
        endedAtRaw: c.status === "ended" ? iso(c.endedAt ?? null) : null,
        freeze, cancel,
      };
      const view = statusView({
        status: c.status, election: e.status, isWinner, position, sole, gender: memberIn(w, userId)?.gender ?? null,
        editDueRaw: facts.editDueRaw, rejectReason: facts.rejectReason, endReason: facts.endReason, freeze, cancelReason: cancel?.reason ?? null,
      });

      const trailRows = w.log
        .filter((r) => r.electionId === e.id && r.payload["candidate_id"] === c.id)
        .sort((a, b) => a.id - b.id);
      const trail: JourneyStep[] = trailRows.length
        ? trailRows.map((r) => {
          const f = describeEvent({ event_type: r.event, payload: r.payload }, { audience: "member" });
          return { kind: f.kind, label: f.label, date: fmtDate(iso(r.at)), note: f.note ?? undefined };
        })
        : [{ kind: "submit" as LogKind, label: "تقدّمت للمنصب", date: "" }];
      if (e.status === "completed" && c.status === "approved") {
        trail.push(isWinner
          ? { kind: "win", label: "فُزت بالمنصب", date: "" }
          : { kind: "end", label: "لم تُوفَّق للمنصب", date: "" });
      }

      const cycle = fmtMonthYear(iso(e.candidacyEnd) ?? iso(c.submittedAt));
      const archived = c.status === "withdrawn" || c.status === "rejected" || c.status === "ended"
        || e.status === "completed" || e.status === "cancelled" || !!e.archivedAt;

      return {
        candidateId: c.id, electionId: e.id, position,
        cycle: cycle ? `دورة ${cycle}` : "", archived,
        number: c.number, status: c.status,
        statusLabel: view.label, statusTone: view.tone, next: view.next, future: view.future,
        statement: c.statement, fileUrl: c.fileUrl, fileName: c.fileName,
        trail,
        // @db ترحيل ٣٩: المعتمَد لا يُعدَّل؛ والمطلوبُ تعديلُه يعدّل في مهلته ولو أُغلق الباب (الدفعة الثانية)
        canEdit: (e.status === "candidacy_open" && c.status === "pending") || editable(w, c),
        canWithdraw: ACTIVE_CANDIDACY.includes(c.status) && (e.status === "candidacy_open" || e.status === "candidacy_closed"),
        ...facts,
      } satisfies CandidacyJourney;
    });
}

/* ══ صفحةُ الترشّح — مرآةُ `getApplyContext` ═══════════════════════ */

export function toApplyContext(w: SimWorld, userId: string, electionId: string): ApplyContext {
  const base: ApplyContext = {
    ok: false, error: null, electionId, position: "", departmentId: null, roleName: "",
    status: "candidacy_open", existing: null, siblings: [], preferredElectionId: electionId, otherOpen: 0,
  };
  const e = w.elections.find((x) => x.id === electionId);
  if (!e || e.archivedAt) return { ...base, error: "هذا الانتخاب غير موجودٍ أو مُؤرشَف." };

  const departmentId = electionDepartment(e);
  const mineHere = w.candidates.find((c) => c.electionId === electionId && c.userId === userId) ?? null;

  const siblings: ApplyContext["siblings"] = [];
  let preferredElectionId = electionId;
  if (departmentId !== null) {
    for (const c of w.candidates) {
      if (c.userId !== userId || c.electionId === electionId || !ACTIVE_CANDIDACY.includes(c.status)) continue;
      const other = w.elections.find((x) => x.id === c.electionId);
      if (!other || other.archivedAt || !LIVE_STATUSES.includes(other.status)) continue;
      if (electionDepartment(other) !== departmentId) continue;
      siblings.push({ electionId: other.id, position: labelsOf(other).positionLabel });
      if (c.preferenceRank === 1) preferredElectionId = other.id;
    }
    if (mineHere?.preferenceRank === 1) preferredElectionId = electionId;
  }

  const otherOpen = toRunItems(w, userId).filter((r) => r.electionId !== electionId && !r.hasSubmission).length;

  return {
    ok: true, error: null, electionId,
    position: labelsOf(e).positionLabel,
    departmentId,
    roleName: e.targetRoleName as ElectedRole,
    status: e.status,
    existing: mineHere ? {
      candidateId: mineHere.id,
      statement: mineHere.statement,
      fileName: mineHere.fileName,
      fileUrl: mineHere.fileUrl,
      canEdit: (e.status === "candidacy_open" && mineHere.status === "pending") || editable(w, mineHere),
    } : null,
    siblings,
    preferredElectionId,
    otherOpen,
  };
}
