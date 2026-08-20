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
  AppointOption, CandidateRow, ElectionCreateOptions, ElectionDetail, ElectionLogEvent, ElectionRow, VoteDetailRow,
} from "@/app/dashboard/elections/data";
import type {
  ApplyContext, BallotCandidate, BallotContext, CandidacyJourney, JourneyStep, MyVote, RunItem, VoteItem,
} from "@/app/dashboard/elections/member-data";
import { CANDIDATE_STATUS_META, type CandidateStatus, type ElectionStatus } from "@/app/dashboard/elections/vocab";
import { ROLES, committeeOf, departmentOf, type ElectedRole } from "./org";
import { appointableMembers, createOptions } from "./rules";
import {
  ACTIVE_CANDIDACY, LIVE_STATUSES, candidateVotes, candidateWeight, countApproved, departmentResolutionState,
  electionDepartment, eligibleToRun, eligibleToVote, memberIn, soleCandidate, type SimCandidate, type SimElection, type SimWorld,
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
        votes: w.votes.filter((v) => v.electionId === e.id).length,
        hasWinner: !!e.winnerCandidateId,
        winnerName: winnerMember?.name ?? null,
        winnerAvatar: null,
        winnerGender: winnerMember?.gender ?? null,
        winnerVotes: winner ? candidateVotes(w, winner.id) : 0,
        archived: !!e.archivedAt,
        archivedRaw: iso(e.archivedAt),
        stalled: !!e.stalledAt,
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
    weight: candidateWeight(w, c.id),
    votes: candidateVotes(w, c.id),
  };
}

export function toElectionDetail(w: SimWorld, electionId: string): ElectionDetail | null {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return null;

  const candidates = w.candidates
    .filter((c) => c.electionId === electionId)
    .sort((a, b) => a.number - b.number)
    .map((c) => toCandidateRow(w, c));

  const rejects = w.votes.filter((v) => v.electionId === electionId && v.choice === "reject");
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
    votes: w.votes.filter((v) => v.electionId === electionId).length,
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
      date: fmtStamp(iso(r.at)),
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
  return w.elections
    .filter((e) => e.status === "voting_open" && !e.archivedAt && eligibleToVote(w, userId, e.id))
    .map((e) => ({
      electionId: e.id,
      position: labelsOf(e).positionLabel,
      votingEnd: fmtDate(iso(e.votingEnd)),
      votingEndRaw: iso(e.votingEnd),
      hasVoted: w.votes.some((v) => v.electionId === e.id && v.voterId === userId),
      // مرشّحُ المقعد الوحيد يرى ولا يفعل (`view_only` في الدالّة)
      viewOnly: soleCandidate(w, userId, e.id),
    }));
}

/* ══ بطاقةُ الاقتراع — مرآةُ `getBallot` + `get_anonymized_candidates` ══ */

export function toBallot(w: SimWorld, userId: string, electionId: string): BallotContext {
  const election = toVoteItems(w, userId).find((e) => e.electionId === electionId) ?? null;
  if (!election) return { ok: false, error: "هذا الاقتراع غير مفتوحٍ لك الآن.", election: null, candidates: [], myVote: null };

  const candidates: BallotCandidate[] = w.candidates
    .filter((c) => c.electionId === electionId && c.status === "approved")
    .sort((a, b) => a.number - b.number)
    .map((c) => ({
      id: c.id, number: c.number, statement: c.statement,
      fileUrl: c.fileUrl, fileName: c.fileName, fileSize: c.fileSize, fileMime: c.fileMime,
      // `is_self` تُحسب في القاعدة من `auth.uid()`، فلا يعرفها إلّا صاحبُها
      isSelf: c.userId === userId,
    }));

  const v = w.votes.find((x) => x.electionId === electionId && x.voterId === userId) ?? null;
  const myVote: MyVote | null = v ? { candidateId: v.candidateId, choice: v.choice } : null;
  return { ok: true, error: null, election, candidates, myVote };
}

/* ══ سِجلّ ترشُّحي — مرآةُ `getMyCandidacies` ═══════════════════════ */

/** مرآةُ `statusView` في `member-data` — الحالةُ المعروضة و«ما التالي» والمحطّة القادمة. */
function statusView(status: CandidateStatus, election: ElectionStatus, isWinner: boolean, position: string, sole: boolean) {
  if (election === "completed" && status === "approved") {
    return isWinner
      ? { label: "فائز", tone: "success" as const, next: sole ? `نلتَ ثقة الناخبين تزكيةً، مُبارَك لك يا ${position}` : `مُبارَك لك! فزتَ بالمنصب يا ${position}`, future: null }
      : { label: "لم يُوفَّق", tone: "info" as const, next: "انتهى التصويت؛ لم يُوفَّق ترشّحك هذه المرّة، شكرًا لِمُشاركتك.", future: null };
  }
  const base = CANDIDATE_STATUS_META[status];
  switch (status) {
    case "pending": return { label: base.label, tone: base.tone, next: "طلبك تحت مراجعة إدارة الموارد البشرية. يمكنك تعديل أو تطوير ترشّحك خلال مراجعة ترشيحك.", future: election === "candidacy_open" ? "تصويت" : null };
    case "needs_edit": return { label: base.label, tone: base.tone, next: "راجِع ملاحظة إدارة الموارد البشرية وعدّل بيانك أو ملفّك، ثمّ أعِد الإرسال.", future: election === "candidacy_open" ? "تصويت" : null };
    case "approved": {
      const next = election === "voting_open"
        ? (sole ? "أنت المرشّح الوحيد، والتصويت جارٍ تزكيةً لك: يؤيّد الناخبون أو يعترضون." : "التصويت جارٍ الآن على ترشّحك.")
        : election === "voting_closed" ? "أُغلق التصويت، بانتظار إعلان النتيجة."
          : sole ? "قُبل ترشّحك، وأنت المرشّح الوحيد: يُعرَض على الناخبين تزكيةً لا منافسة."
            : "مُبارك لك! تم قبول ترشحك لخوض مرحلة التصويت.";
      const future = (election === "candidacy_open" || election === "candidacy_closed") ? "تصويت"
        : (election === "voting_open" || election === "voting_closed") ? "النتيجة" : null;
      return { label: base.label, tone: base.tone, next, future };
    }
    case "rejected": return { label: base.label, tone: base.tone, next: "تعتذر إدارة الموارد البشرية عن قبول ترشّحك في هذا الانتخاب، يُمكنك رؤية سبب الرفض.", future: null };
    case "withdrawn": return { label: base.label, tone: base.tone, next: "سحبتَ ترشّحك من هذا الانتخاب.", future: null };
    default: return { label: base.label, tone: base.tone, next: "", future: null };
  }
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
      const view = statusView(c.status, e.status, isWinner, position, sole);

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
      const archived = c.status === "withdrawn" || c.status === "rejected"
        || e.status === "completed" || e.status === "cancelled" || !!e.archivedAt;

      return {
        candidateId: c.id, electionId: e.id, position,
        cycle: cycle ? `دورة ${cycle}` : "", archived,
        number: c.number, status: c.status,
        statusLabel: view.label, statusTone: view.tone, next: view.next, future: view.future,
        statement: c.statement, fileUrl: c.fileUrl, fileName: c.fileName,
        trail,
        // @db ترحيل ٣٩: المعتمَد لا يُعدَّل ولو كان البابُ مفتوحًا؛ والسحبُ يبقى ما دام الطورُ ترشّحًا
        canEdit: e.status === "candidacy_open" && (c.status === "pending" || c.status === "needs_edit"),
        canWithdraw: ACTIVE_CANDIDACY.includes(c.status) && (e.status === "candidacy_open" || e.status === "candidacy_closed"),
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
      canEdit: e.status === "candidacy_open" && (mineHere.status === "pending" || mineHere.status === "needs_edit"),
    } : null,
    siblings,
    preferredElectionId,
    otherOpen,
  };
}
