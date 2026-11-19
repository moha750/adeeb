// **محرّكُ المحاكي** — كلُّ فعلٍ في نظام الانتخابات، منقولًا عن القاعدة دالّةً دالّةً وحارسًا
// حارسًا. وكلُّ دالّةٍ هنا تحمل في تعليقها **اسمَ نظيرتها** (`@db`)، ورسائلُ الرفض **بنصّها
// العربيّ كما ترفعه القاعدة** — فما يظهر في التوست هنا هو ما يظهر هناك.
//
// **ولِمَ نُقلت ولم تُخترع؟** لأنّ محاكيًا بقواعدَ من عنده يعطي طمأنينةً كاذبة قبل الإطلاق.
//
// **وما الذي يحرس هذا المحرّك اليوم؟** `sim/__tests__/rules.test.ts` و`world.test.ts`
// و`coverage.test.ts` (تُشغَّل بـ`pnpm test`): تمسّ كلَّ حارسٍ ههنا برسالته العربيّة، وتُشغّل
// مصفوفةَ التغطية بمجَسّاتها فتصير حَكَمًا لا لوحةَ عرض. وهي تقيس **المحرّك في الذاكرة** وحده.
//
// **وما لا يحرسه شيء**: مطابقةُ ما ههنا لما في القاعدة فعلًا. لا مُعايِرَ آليًّا يُشغّل
// السيناريو نفسَه هنا وهناك ويقارن — لم يُبنَ، ولا ملفَّ `parity` في المستودع (كان هذا
// التعليقُ يَعِد به فصُحّح ٢٠٢٦-٠٨-١٦). فسلامةُ النقل تبقى على قارئٍ يقابل كلَّ `@db` بأصلها،
// ومن غيّر دالّةً في القاعدة فعليه أن يغيّر نظيرتها هنا بيده.
//
// وكلُّ دالّةٍ تُعدّل `w` في مكانه (المتّجرُ يستنسخ قبل النداء) وتردّ `{ ok, message }`
// بالشكل الذي تردّه أفعالُ الخادم (`ElectionResult`).

import type { ElectionResult } from "@/app/dashboard/elections/actions";
import { STATEMENT_MAX, STATEMENT_MIN, type CandidateStatus, type ElectionStatus } from "@/app/dashboard/elections/vocab";
import { COMMITTEES, ROLES, committeeOf, departmentOf, type ElectedRole } from "./org";
import {
  ACTIVE_CANDIDACY, LIVE_STATUSES, candidateWeight, choiceWeight, countActive, countApproved,
  electionDepartment, eligibleToRun, eligibleToVote, isConfidence, isElectionAdmin, memberIn, membersIn, soleCandidate,
  activeBanOf, nextId, notify, riyadhDay, seatHolder, voteWeight, writeLog, type SimCandidate, type SimElection, type SimWorld,
} from "./world";

const ok = (message: string, id?: string): ElectionResult => ({ ok: true, message, id });
const no = (message: string): ElectionResult => ({ ok: false, message });

/** اسمُ المقعد كما يبنيه `_election_target_label` — للرسائل والإشعارات. */
export function targetLabel(e: SimElection): string {
  const rank = ROLES[e.targetRoleName]?.ar ?? e.targetRoleName;
  const unit = committeeOf(e.targetCommitteeId)?.ar ?? departmentOf(e.targetDepartmentId)?.ar ?? null;
  return unit ? `${rank} ${unit}` : rank;
}

/* ══ إسنادُ المنصب ═══════════════════════════════════════════════════ */

/**
 * @db `assign_position(...)` — البوّابةُ المحروسة. لا يُحاكى منها إلّا أثرُها في هذا العالم:
 * يُزاح الشاغلُ السابق (`p_replace => true`) ويجلس الجديد، فيتغيّر وزنُه وأهليّتُه من فوره.
 */
function assignPosition(w: SimWorld, userId: string, roleName: string, committeeId: number | null, departmentId: number | null, note: string) {
  const previous = seatHolder(w, roleName, committeeId, departmentId);
  if (previous && previous.id !== userId) {
    w.seatOverride[previous.id] = { roleName: "committee_member", committeeId: committeeId ?? previous.committeeId, departmentId: null };
  }
  w.seatOverride[userId] = { roleName, committeeId, departmentId };
  w.assignments.push({ userId, roleName, committeeId, departmentId, at: w.now, note });
}

/* ══ فتحُ انتخاب ═════════════════════════════════════════════════════ */

export type CreateInput = { roleName: string; committeeId?: number | null; departmentId?: number | null; candidacyEndIso?: string | null };

/**
 * @db `INSERT INTO elections` + تريغرا `enforce_vacant_target` و`elections_active_*_uniq`.
 * والحارسُ القدراتيّ في الفعل الخادميّ (`manage_elections`).
 */
export function createElection(w: SimWorld, actorId: string, input: CreateInput): ElectionResult {
  if (!isElectionAdmin(w, actorId)) return no("لا تملك صلاحية إدارة الانتخابات.");

  const role = input.roleName as ElectedRole;
  const committeeId = input.committeeId ?? null;
  const departmentId = input.departmentId ?? null;

  // مطابقةُ `elections_scope_check` — والفعلُ الخادميّ يقولها بهذه الجمل نفسِها
  if (role === "department_head") {
    if (!departmentId) return no("اختر القسم المستهدَف.");
    if (committeeId) return no("منسّق القسم يُنتخَب على مستوى القسم لا اللجنة.");
  } else if (role === "committee_leader" || role === "deputy_committee_leader") {
    if (!committeeId) return no("اختر اللجنة المستهدَفة.");
    if (departmentId) return no("هذا المنصب يُنتخَب على مستوى اللجنة لا القسم.");
  } else {
    return no("منصبٌ غير قابل للانتخاب.");
  }

  if (seatHolder(w, role, committeeId, departmentId)) {
    return no("لا يمكن إنشاء انتخاب لمنصب مشغول حالياً — المنصب له شاغل نشط بالفعل");
  }

  const clash = w.elections.some((e) =>
    !e.archivedAt && LIVE_STATUSES.includes(e.status)
    && e.targetRoleName === role
    && (e.targetCommitteeId ?? null) === committeeId
    && (e.targetDepartmentId ?? null) === departmentId);
  if (clash) return no("يوجد انتخابٌ نشطٌ لهذا المنصب بالفعل.");

  const end = input.candidacyEndIso ? new Date(input.candidacyEndIso).getTime() : null;
  const id = nextId(w, "e");
  w.elections.push({
    id, targetRoleName: role, targetCommitteeId: committeeId, targetDepartmentId: departmentId,
    status: "candidacy_open", candidacyOpenedAt: w.now, candidacyEnd: Number.isFinite(end) ? end : null,
    votingOpenedAt: null, votingEnd: null, stalledAt: null, archivedAt: null,
    winnerCandidateId: null, winnerDeclaredAt: null, createdAt: w.now, createdBy: actorId, cancelReason: null,
  });
  writeLog(w, id, actorId, "election_created", { role_name: role });
  notify(w, "election_voters", "فُتح باب الترشّح", `فُتح بابُ الترشّح لـ${targetLabel(w.elections[w.elections.length - 1])}.`);
  return ok("فُتح باب الترشّح.", id);
}

/* ══ الترشّح ═════════════════════════════════════════════════════════ */

/** @db `submit_candidacy` + تريغرا `enforce_candidacy_eligibility` و`enforce_candidacy_statement_length` و`clear_stall_on_candidacy`. */
export function submitCandidacy(w: SimWorld, actorId: string, electionId: string, statement: string, file: { url: string; name: string; size: number | null; mime: string | null } | null): ElectionResult {
  const s = statement.trim();
  if (s.length < STATEMENT_MIN) return no("بيان الترشّح قصيرٌ جدًّا (١٠٠ حرفٍ على الأقلّ).");
  if (s.length > STATEMENT_MAX) return no("بيان الترشّح طويلٌ جدًّا (٤٠٠٠ حرفٍ حدًّا أقصى).");

  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود");
  if (!eligibleToRun(w, actorId, electionId)) return no("غير مؤهل للترشح في هذا الانتخاب");

  const number = w.candidates.filter((c) => c.electionId === electionId).reduce((m, c) => Math.max(m, c.number), 0) + 1;
  const id = nextId(w, "c");
  w.candidates.push({
    id, electionId, userId: actorId, number, status: "pending", statement: s,
    fileName: file?.name ?? null, fileUrl: file?.url ?? null, fileSize: file?.size ?? null, fileMime: file?.mime ?? null,
    reviewNote: null, reviewedBy: null, reviewedAt: null,
    submittedAt: w.now, withdrawnAt: null, preferenceRank: 1,
  });
  writeLog(w, electionId, actorId, "candidacy_submitted", { candidate_id: id, has_file: !!file });

  // @db `clear_stall_on_candidacy` — ترشّحٌ جديد يرفع وسمَ الوقوف والموعدَ الماضي معًا
  if (e.stalledAt) {
    e.stalledAt = null;
    e.candidacyEnd = null;
    writeLog(w, electionId, actorId, "stall_cleared_by_candidacy", { candidate_id: id });
  }
  notify(w, "election_admins", "ترشّحٌ جديد", `تقدّم مرشّحٌ في ${targetLabel(e)}.`);
  return ok("أُرسل ترشّحك، وهو الآن قيد المراجعة.", id);
}

/** @db `resubmit_candidacy` — المعتمَدُ لا يُعدَّل، والحقُّ يسقط بإغلاق الترشّح. */
export function resubmitCandidacy(w: SimWorld, actorId: string, candidateId: string, statement: string, file: { url: string; name: string; size: number | null; mime: string | null } | null): ElectionResult {
  const s = statement.trim();
  if (s.length < STATEMENT_MIN) return no("بيان الترشّح قصيرٌ جدًّا (١٠٠ حرفٍ على الأقلّ).");
  if (s.length > STATEMENT_MAX) return no("بيان الترشّح طويلٌ جدًّا (٤٠٠٠ حرفٍ حدًّا أقصى).");

  const c = w.candidates.find((x) => x.id === candidateId);
  if (!c) return no("الترشح غير موجود");
  if (c.userId !== actorId) return no("لا يمكن تعديل ترشح مستخدم آخر");
  if (c.status !== "pending" && c.status !== "needs_edit") return no("لا يمكن تعديل الترشح في حالته الحالية");
  const e = w.elections.find((x) => x.id === c.electionId)!;
  // @db `resubmit_candidacy` (الدفعة الثانية): المطلوبُ تعديلُه يعدّل في مهلته ولو أُغلق الباب (المادة 14)
  if (c.status === "needs_edit") {
    if (e.status !== "candidacy_open" && e.status !== "candidacy_closed") return no("لا يمكن التعديل بعد فتح التصويت");
    if (c.editDueAt && c.editDueAt <= w.now) return no("مضت مهلة التعديل");
  } else if (e.status !== "candidacy_open") return no("لا يمكن التعديل بعد إغلاق باب الترشّح");

  const oldFile = c.fileUrl;
  const newFile = file?.url ?? null;
  const fileChange = oldFile === null && newFile !== null ? "added"
    : oldFile !== null && newFile === null ? "removed"
      : oldFile !== newFile ? "replaced" : "none";
  const statementChanged = c.statement !== s;
  const event = c.status === "needs_edit" ? "candidate_resubmitted" : "candidate_updated";

  c.statement = s;
  c.fileUrl = newFile;
  c.fileName = file?.name ?? null;
  c.fileSize = file?.size ?? null;
  c.fileMime = file?.mime ?? null;
  c.status = "pending";
  c.reviewNote = null;
  c.reviewedBy = null;
  c.reviewedAt = null;
  c.editDueAt = null;

  writeLog(w, e.id, actorId, event, { candidate_id: candidateId, statement_changed: statementChanged, file_change: fileChange });
  return ok("حُفظ تعديل ترشّحك، وهو الآن قيد المراجعة.");
}

/** @db `withdraw_candidacy` + `enforce_candidate_status_transition` (لا انسحابَ بعد فتح التصويت). */
export function withdrawCandidacy(w: SimWorld, actorId: string, candidateId: string): ElectionResult {
  const c = w.candidates.find((x) => x.id === candidateId);
  if (!c) return no("الترشح غير موجود");
  if (c.userId !== actorId && !isElectionAdmin(w, actorId)) return no("لا يمكن الانسحاب نيابة عن مرشح آخر");
  const e = w.elections.find((x) => x.id === c.electionId)!;
  if (!ACTIVE_CANDIDACY.includes(c.status)) return no(`هذه الحالة نهائية: ${c.status}`);
  if (e.status !== "candidacy_open" && e.status !== "candidacy_closed") return no("لا يمكن الانسحاب بعد فتح التصويت");

  c.status = "withdrawn";
  c.withdrawnAt = w.now;
  writeLog(w, e.id, actorId, "candidate_withdrawn", { candidate_id: candidateId });
  return ok("سُحب ترشّحك.");
}

/** @db `review_candidate` — والسببُ إلزاميٌّ للرفض وطلب التعديل (يفرضه التريغر). */
export function reviewCandidate(
  w: SimWorld, actorId: string, candidateId: string, newStatus: "approved" | "rejected" | "needs_edit", note?: string,
  opts: { editDueIso?: string | null; rejectReason?: SimCandidate["rejectReason"] } = {},
): ElectionResult {
  if ((newStatus === "rejected" || newStatus === "needs_edit") && !note?.trim()) return no("اكتب سبب الاعتذار أو التعديل.");
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بمراجعة المرشحين");

  const c = w.candidates.find((x) => x.id === candidateId);
  if (!c) return no("المرشح غير موجود");
  // @db `review_candidate` (الدفعة الثانية): لا يُبتّ إلا فيما كان قيد المراجعة، ولا يُعاد النظر في قرار (المادة 14)
  if (c.status !== "pending") return no("لا يُبتّ إلا في ترشّحٍ قيد المراجعة");
  const due = opts.editDueIso ? Date.parse(opts.editDueIso) : NaN;
  if (newStatus === "needs_edit" && (!Number.isFinite(due) || due <= w.now)) return no("حدّد مهلة التعديل موعدًا في المستقبل (المادة 14)");
  if (newStatus === "rejected" && !["ineligible", "statement_violation", "unrelated"].includes(opts.rejectReason ?? "")) {
    return no("اختر سبب الاعتذار: لا يجوز له، أو بيانٌ يخالف الضوابط، أو لا يتّصل بالمقعد (المادة 14)");
  }

  c.status = newStatus as CandidateStatus;
  c.reviewNote = note?.trim() || null;
  c.reviewedBy = actorId;
  c.reviewedAt = w.now;
  c.editDueAt = newStatus === "needs_edit" ? due : null;
  c.rejectReason = newStatus === "rejected" ? opts.rejectReason ?? null : null;
  writeLog(w, c.electionId, actorId, "candidate_reviewed", {
    candidate_id: candidateId, new_status: newStatus, note: note?.trim() ?? null,
    edit_due: newStatus === "needs_edit" ? opts.editDueIso : undefined, reject_reason: c.rejectReason ?? undefined,
  });
  notify(w, "candidate", "قرارٌ في ترشّحك", newStatus === "approved" ? "اعتُمد ترشّحك." : newStatus === "rejected" ? "اعتُذر عن ترشّحك." : "طُلب تعديل بيانك.");
  return ok(newStatus === "approved" ? "اعتُمد المرشّح." : newStatus === "rejected" ? "اعتُذر عن الترشّح." : "طُلب تعديل الترشّح بمهلته.");
}

/** @db `restore_candidacy` — يعود «قيد المراجعة» ما دام بابُ الترشّح قائمًا. */
export function restoreCandidacy(w: SimWorld, actorId: string, candidateId: string): ElectionResult {
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بإرجاع المرشحين");
  const c = w.candidates.find((x) => x.id === candidateId);
  if (!c) return no("الترشح غير موجود");
  if (c.status !== "withdrawn") return no("هذا الترشح ليس منسحبا");
  const e = w.elections.find((x) => x.id === c.electionId)!;
  if (e.status !== "candidacy_open" && e.status !== "candidacy_closed") return no("لا يُرجع مرشح إلا وباب الترشح قائم");

  c.status = "pending";
  c.withdrawnAt = null;
  writeLog(w, e.id, actorId, "candidate_restored", { candidate_id: candidateId, new_status: "pending" });
  return ok("أُعيد المرشّح إلى المراجعة، وأُبلِغ بذلك.");
}

/** @db `set_seat_preference(department, election)` — الأدنى أوثَر: المفضَّل ١ وما سواه ٢. */
export function setSeatPreference(w: SimWorld, actorId: string, departmentId: number, preferredElectionId: string): void {
  for (const c of w.candidates) {
    if (c.userId !== actorId || !ACTIVE_CANDIDACY.includes(c.status)) continue;
    const e = w.elections.find((x) => x.id === c.electionId);
    if (!e || e.archivedAt || !LIVE_STATUSES.includes(e.status)) continue;
    if (electionDepartment(e) !== departmentId) continue;
    c.preferenceRank = e.id === preferredElectionId ? 1 : 2;
  }
}

/* ══ دورةُ الحياة ════════════════════════════════════════════════════ */

/** @db `transition_election` + `enforce_election_status_transition` + `promote_to_voting_check`. */
export function transitionElection(w: SimWorld, actorId: string, electionId: string, next: "candidacy_open" | "candidacy_closed" | "voting_closed" | "voting_open", votingEndIso?: string | null, opts: { reason?: string; candidacyEndIso?: string | null } = {}): ElectionResult {
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بتغيير حالة الانتخاب");
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود");

  if (next === "candidacy_closed" && e.status === "candidacy_open" && countActive(w, electionId) < 1) {
    return no("لا يمكن إغلاق باب الترشح ولا مرشّح فيه؛ مدِّد المهلة أو كلِّف شاغلًا أو ألغِ الانتخاب.");
  }

  if (next === "voting_open") {
    const end = votingEndIso ? new Date(votingEndIso).getTime() : null;
    if (end !== null && end <= w.now) return no("نهاية التصويت يجب أن تكون في المستقبل");
    if (e.status !== "candidacy_closed") return no(`انتقال غير مسموح للحالة: ${e.status} → ${next}`);
    const unreviewed = w.candidates.filter((c) => c.electionId === electionId && (c.status === "pending" || c.status === "needs_edit")).length;
    if (unreviewed > 0) return no(`لا يمكن فتح التصويت: يوجد ${unreviewed} مرشحاً قيد المراجعة`);
    if (countApproved(w, electionId) < 1) return no("لا يمكن فتح التصويت: لا مرشّح معتمَد");
    e.status = "voting_open";
    e.votingOpenedAt = w.now;
    e.votingEnd = end;
  } else if (next === "candidacy_open" && e.status === "voting_closed") {
    // @db الدفعة الرابعة §٩ — إعادةُ فتح الباب بعد التصويت للمتعثّر: تبطل الأصواتُ كلُّها،
    // وينتهي ترشّحُ من سقطت تزكيتُه، ويبقى المعتمَدُ على حاله
    if (!e.stalledAt || e.winnerCandidateId) return no("لا يُعاد فتح الترشّح بعد التصويت إلا لانتخابٍ متعثّر (المادة 25)");
    const end = opts.candidacyEndIso ? Date.parse(opts.candidacyEndIso) : NaN;
    if (!Number.isFinite(end) || end <= w.now) return no("اختر لإغلاق الباب المعاد فتحه موعدًا في المستقبل (المادة 23)");
    if (!opts.reason || opts.reason.trim().length < 10) return no("اكتب سبب إعادة فتح الباب (10 أحرف على الأقلّ) (المادة 25)");
    const failed = e.stallReason === "confidence_failed";
    voidVotes(w, electionId, null, "reopened");
    e.status = "candidacy_open";
    e.candidacyEnd = end;
    e.votingEnd = null;
    e.votingOpenedAt = null;
    e.stalledAt = null;
    e.stallReason = null;
    e.revotePending = null;
    e.revoteOnly = false;
    if (failed) {
      for (const c of w.candidates.filter((x) => x.electionId === electionId && x.status === "approved")) endCandidacy(w, c.id, "confidence_failed", actorId);
    }
  } else if (next === "candidacy_open") {
    if (e.status !== "candidacy_closed") return no(`انتقال غير مسموح للحالة: ${e.status} → ${next}`);
    e.status = "candidacy_open";
    e.candidacyEnd = opts.candidacyEndIso ? Date.parse(opts.candidacyEndIso) : null;
    e.stalledAt = null;
    e.stallReason = null;
  } else if (next === "candidacy_closed") {
    if (e.status !== "candidacy_open") return no(`انتقال غير مسموح للحالة: ${e.status} → ${next}`);
    e.status = "candidacy_closed";
  } else {
    if (e.status !== "voting_open") return no(`انتقال غير مسموح للحالة: ${e.status} → ${next}`);
    e.status = "voting_closed";
  }

  writeLog(w, electionId, actorId, "status_transition", {
    new_status: next, voting_end: votingEndIso ?? null, candidacy_end: opts.candidacyEndIso ?? null,
    early: next === "voting_closed" || next === "candidacy_closed" ? true : undefined, reason: opts.reason?.trim() || undefined,
  });
  if (next === "voting_closed") { e.revoteOnly = false; afterVotingClosed(w, electionId); }

  return ok(next === "candidacy_open"
    ? "أُعيد فتح الترشّح، ورُفع موعد الإغلاق فيُغلق بيدك أو بموعدٍ جديد تضربه."
    : next === "voting_open" ? "فُتح باب التصويت." : "تمّ.");
}

/** @db الفعلُ الخادميّ `openVoting` — يشترط موعدًا مستقبليًّا ثمّ ينادي `transition_election`. */
export function openVoting(w: SimWorld, actorId: string, electionId: string, votingEndIso: string): ElectionResult {
  if (!votingEndIso || new Date(votingEndIso).getTime() <= w.now) return no("اختر موعد إغلاق تصويتٍ في المستقبل.");
  return transitionElection(w, actorId, electionId, "voting_open", votingEndIso);
}

/** @db الفعلُ الخادميّ `setDeadline` — بابٌ واحدٌ للطورين، وضبطُ مهلةِ ترشّحٍ يرفع وسمَ الوقوف. */
export function setDeadline(w: SimWorld, actorId: string, electionId: string, iso: string | null): ElectionResult {
  if (!isElectionAdmin(w, actorId)) return no("لا تملك صلاحية إدارة الانتخابات.");
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود.");
  if (e.archivedAt) return no("الانتخاب مؤرشف.");

  const when = iso?.trim() ? new Date(iso).getTime() : null;
  if (when !== null) {
    if (Number.isNaN(when)) return no("موعدٌ غير صالح.");
    if (when <= w.now) return no("اختر موعدًا في المستقبل.");
  }

  const column = e.status === "candidacy_open" ? "candidacy" : e.status === "voting_open" ? "voting" : null;
  if (!column) return no("لا موعدَ إلّا لبابٍ مفتوح (ترشّحًا أو تصويتًا).");

  if (column === "candidacy") { e.candidacyEnd = when; e.stalledAt = null; }
  else e.votingEnd = when;

  writeLog(w, electionId, actorId, "deadline_set", { phase: column, when: iso ?? null });
  const phase = column === "candidacy" ? "الترشّح" : "التصويت";
  return ok(when ? `ضُبط موعد إغلاق ${phase}.` : `رُفع موعد إغلاق ${phase}، فيُغلق بيدك.`);
}

/** @db `cancel_election` → `_cancel_election_apply` — يُحفظ المرشّحون والأصوات، ويُوقَف الانتخاب. */
export function cancelElection(w: SimWorld, actorId: string, electionId: string, reason: string, basis?: "stalled" | "defect"): ElectionResult {
  if (!reason?.trim()) return no("اكتب سبب الإلغاء.");
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بإلغاء الانتخاب");
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود");
  if (e.status === "completed") return no("لا يمكن إلغاء انتخاب مكتمل");
  if (e.status === "cancelled") return no("الانتخاب ملغًى من قبل");
  if (reason.trim().length < 10) return no("اكتب سبب الإلغاء (10 أحرف على الأقلّ) (المادة 29)");
  // @db الدفعة الثالثة — بعد فتح التصويت لا يُلغى إلا لتعثّره أو لخللٍ يمسّ صحّته (المادة 29)
  if (e.status === "voting_open" || e.status === "voting_closed") {
    if (basis !== "stalled" && basis !== "defect") return no("بعد فتح التصويت لا يُلغى الانتخاب إلا لتعثّره، أو لخللٍ يمسّ صحّته يُسمّى في القرار (المادة 29)");
    if (basis === "stalled" && !e.stalledAt) return no("هذا الانتخاب لم يتعثّر؛ سمِّ الخلل الذي يمسّ صحّته (المادة 29)");
  }
  applyCancel(w, actorId, e, reason.trim(), basis ?? null);
  return ok("أُلغي الانتخاب.");
}

/** والمتعثّرُ يبقى متعثّرًا بعد إلغائه: يصحّ التعيينُ عليه بعده (المادة 25). */
function applyCancel(w: SimWorld, actorId: string | null, e: SimElection, reason: string, basis: "stalled" | "defect" | null) {
  e.status = "cancelled";
  e.winnerCandidateId = null;
  e.winnerDeclaredAt = null;
  e.archivedAt = e.archivedAt ?? w.now;
  e.cancelReason = reason;
  e.cancelBasis = basis;
  for (const t of w.ties) if (t.electionId === e.id && t.status === "open") t.status = "void";
  writeLog(w, e.id, actorId, "cancelled", { reason, basis: basis ?? undefined, was_stalled: !!e.stalledAt });
}

/* ══ التصويت ═════════════════════════════════════════════════════════ */

/** @db `cast_vote` + تريغر `enforce_vote_eligibility` — بترتيب حرّاسهما نفسِه. */
export function castVote(w: SimWorld, actorId: string, electionId: string, candidateId: string | null, choice: "approve" | "reject" = "approve"): ElectionResult {
  if (!["approve", "reject"].includes(choice)) return no("رأيٌ غير معروف في بطاقة الاقتراع");
  if (choice === "reject" && !isConfidence(w, electionId)) return no("الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد");
  if (candidateId === null) return no("لا مرشّحَ في بطاقتك");
  // الصوتُ الباطلُ لا يحجب صاحبَه (المادة 16): يصوّت من جديد بوزنه الأوّل
  if (w.votes.some((v) => v.electionId === electionId && v.voterId === actorId && !v.voidedAt)) {
    return no("بطاقتُك في هذا المقعد مختومةٌ، ولا يُعاد الصوت");
  }

  const e = w.elections.find((x) => x.id === electionId);
  if (!e || e.archivedAt) return no("انتخاب غير موجود أو مؤرشف");
  if (e.status !== "voting_open") return no("التصويت غير مفتوح");

  const c = w.candidates.find((x) => x.id === candidateId);
  if (!c || c.electionId !== electionId || c.status !== "approved") return no("المرشح غير صالح في هذا الانتخاب");
  if (c.userId === actorId) return no("لا يمكنك التصويت لنفسك");
  // @db `enforce_vote_eligibility` (الدفعة الرابعة): من بطل صوتُه بانتهاء ترشّح صاحبه يعود بوزنه ولقطته الأولى،
  // وإعادةُ التصويت المقصورة لا يدخلها غيرُه
  const prev = [...w.votes].reverse().find((v) => v.electionId === electionId && v.voterId === actorId && v.voidReason === "candidacy_ended") ?? null;
  if (e.revoteOnly && !prev) return no("إعادة التصويت هذه لمن بطل صوته وحده (المادة 16)");
  // والأهليّةُ تحمل بندَ المرشّح الوحيد، فهي مَن يردّ بطاقتَه
  if (!prev && !eligibleToVote(w, actorId, electionId)) return no("غير مؤهل للتصويت في هذا الانتخاب");

  const m = memberIn(w, actorId);
  const id = nextId(w, "v");
  w.votes.push({
    id, electionId, voterId: actorId, candidateId,
    weight: prev?.weight ?? voteWeight(w, actorId), roleSnapshot: prev?.roleSnapshot ?? m?.roleName ?? "unknown", choice, at: w.now,
  });
  // السجلُّ يقول «صوّت» ولا يقول «بماذا» — والعرضُ يطويه أصلًا (سرّيّة الاقتراع)
  writeLog(w, electionId, actorId, "vote_cast", { vote_id: id });

  // @db `close_voting_when_all_voted` — إذا صوّت الناخبون جميعًا أُغلق التصويت وحُسم في الحال
  const electorate = e.revoteOnly
    ? [...new Set(w.votes.filter((v) => v.electionId === electionId && v.voidReason === "candidacy_ended").map((v) => v.voterId))]
    : membersIn(w).map((x) => x.id).filter((u) => eligibleToVote(w, u, electionId) && !soleCandidate(w, u, electionId));
  if (electorate.length && electorate.every((u) => w.votes.some((v) => v.electionId === electionId && v.voterId === u && !v.voidedAt))) {
    e.status = "voting_closed";
    e.revoteOnly = false;
    writeLog(w, electionId, null, "status_transition", { new_status: "voting_closed", auto: true, all_voted: true });
    afterVotingClosed(w, electionId);
  }

  return ok(choice === "reject" ? "سُجِّل اعتراضك، شكرًا لمشاركتك." : "سُجِّل صوتك، شكرًا لمشاركتك.");
}

/* ══ الإعلان والحسم ══════════════════════════════════════════════════
   سقط الإعلانُ باليد (المادة 28): المنصّةُ تعلن الفائز لحظة الإغلاق (`afterVotingClosed` أسفل الملفّ).
   و`declareWinner`/`resolveDepartmentWinners` في المتجر تردّان بنصّ الفعل الخادميّ نفسِه. */

/** @db `appoint_to_seat` — إسنادٌ عاديٌّ بلا مدّة، ثمّ يُوقَف الانتخاب بسببٍ مسجَّل. */
export function appointToSeat(w: SimWorld, actorId: string, electionId: string, userId: string, reason: string): ElectionResult {
  if (!userId) return no("اختر العضو المكلَّف.");
  if (!reason?.trim() || reason.trim().length < 10) return no("اكتب سبب التكليف (١٠ أحرف على الأقلّ).");
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بالتكليف على هذا المقعد");

  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود");
  if (e.status === "completed") return no("هذا الانتخاب اكتمل بفائزٍ معلَن");
  if (e.status === "voting_open") return no("لا تُكلِّف والتصويتُ جارٍ؛ أغلِق التصويت أوّلًا");
  if (failedConfidenceUser(w, electionId, userId)) return no("من سقطت تزكيته في هذا الانتخاب لا يُكلَّف به (المادة 25)");
  const m = memberIn(w, userId);
  if (!m) return no("العضو غير موجود");

  assignPosition(w, userId, e.targetRoleName, e.targetCommitteeId, e.targetDepartmentId, `تكليف على مقعدٍ تعثّر انتخابُه (${electionId}) : ${reason.trim()}`);
  writeLog(w, electionId, actorId, "seat_appointed", { user_id: userId, reason: reason.trim() });
  // ولم يعد التكليفُ يلغي الانتخاب (المادة 8): يمضي بإعادة فتحه أو إلغائه بقرارٍ مستقلّ
  notify(w, "election_voters", "كُلّف شاغلٌ للمقعد", `كُلّف ${m.name} بـ${targetLabel(e)}، والانتخابُ قائم.`);
  return ok("كُلّف العضو وأُسنِد المنصب، والانتخاب قائم.");
}

/* ══ الكنّاسة ════════════════════════════════════════════════════════ */

/**
 * @db `sweep_election_deadlines()` — تجري في الإنتاج كلَّ دقيقة بـ`pg_cron`، وتجري هنا كلّما
 * قُدِّمت الساعة. **لا تمدّد ولا تُلغي**: تُغلق ما فيه مرشّح، وتوقف ما خلا فينتظر قرارَ المدير.
 */
export function sweep(w: SimWorld): { closedCandidacy: number; stalled: number; closedVoting: number } {
  let closedCandidacy = 0;
  let stalled = 0;
  let closedVoting = 0;

  // @db `sweep_candidacy_deadlines` (الدفعة الثانية): مهلةُ التعديل، وطلباتُ التجميد البائتة، ومهلُ التجميد
  for (const c of w.candidates) {
    if (c.status !== "needs_edit" || !c.editDueAt || c.editDueAt > w.now) continue;
    const e = w.elections.find((x) => x.id === c.electionId);
    if (e && (e.status === "candidacy_open" || e.status === "candidacy_closed")) endCandidacy(w, c.id, "edit_expired", null);
  }
  for (const f of w.freezes) {
    if (f.status === "closed") continue;
    const e = w.elections.find((x) => x.id === f.electionId);
    const c = w.candidates.find((x) => x.id === f.candidateId);
    if (e && (e.status === "cancelled" || e.status === "completed")) { f.status = "closed"; f.outcome = "election_cancelled"; continue; }
    if (f.status === "requested" && (!c || !["pending", "approved", "needs_edit"].includes(c.status) || !!e?.winnerCandidateId)) { f.status = "closed"; f.outcome = "stale"; continue; }
    // مرآةُ الدفعة ٨: طلبٌ لم يُوافَق عليه خلال ٢٤ ساعة يسقط
    if (f.status === "requested" && f.requestedAt + 24 * 3600_000 <= w.now) {
      f.status = "closed"; f.outcome = "expired";
      writeLog(w, f.electionId, null, "freeze_expired", { candidate_id: f.candidateId, freeze_id: f.id });
    }
  }
  for (const f of w.freezes.filter((x) => x.status === "active" && (x.answerDue ?? Infinity) <= w.now)) {
    excludeFrozen(w, f.id, null, "auto_excluded", "مضت مهلة الإجابة ولم يُجب");
  }
  for (const f of w.freezes.filter((x) => x.status === "answered" && (x.decideDue ?? Infinity) <= w.now)) {
    liftFreeze(w, f.id, null, "auto_lifted", "مضى أجل القرار ولم تقرّر الإدارة");
  }
  for (const e of w.elections) {
    if (e.status !== "candidacy_closed" || e.archivedAt || e.stalledAt || countActive(w, e.id) > 0) continue;
    if (w.candidates.some((c) => c.electionId === e.id && c.status === "frozen")) continue;
    stallElection(w, e.id, "no_live_after_close");
    stalled += 1;
  }

  // @db `sweep_election_deadlines` (الدفعة الثالثة)
  for (const e of w.elections) {
    if (e.status !== "candidacy_open" || e.archivedAt || e.stalledAt) continue;
    if (e.candidacyEnd === null || e.candidacyEnd >= w.now) continue;
    const count = countActive(w, e.id) + w.candidates.filter((c) => c.electionId === e.id && c.status === "frozen").length;
    if (count === 0) {
      stallElection(w, e.id, "no_candidates", { active_count: 0 });
      stalled += 1;
    } else {
      e.status = "candidacy_closed";
      writeLog(w, e.id, null, "status_transition", { new_status: "candidacy_closed", auto: true, active_count: count });
      notify(w, "election_participants", "أُغلق باب الترشح تلقائياً", `انتهت فترة تقديم الترشيحات لـ ${targetLabel(e)}. لن يُقبل مرشحون جدد.`);
      closedCandidacy += 1;
    }
  }

  for (const e of w.elections) {
    if (e.status !== "voting_open" || e.archivedAt) continue;
    if (e.votingEnd === null || e.votingEnd >= w.now) continue;
    e.status = "voting_closed";
    e.revoteOnly = false;
    writeLog(w, e.id, null, "status_transition", { new_status: "voting_closed", auto: true });
    notify(w, "election_participants", "انتهى التصويت", `انتهى التصويت لـ ${targetLabel(e)}.`);
    afterVotingClosed(w, e.id);
    closedVoting += 1;
  }

  let ties = 0;
  for (const t of w.ties.filter((x) => x.status === "open" && !x.pausedAt && x.dueAt <= w.now)) {
    settleTie(w, t.id, tieEarliest(w, t.id), "earliest");
    ties += 1;
  }
  settle(w);

  if (closedCandidacy + stalled + closedVoting + ties > 0) {
    writeLog(w, null, null, "sweep_deadlines", { closed_candidacy: closedCandidacy, stalled_candidacy: stalled, closed_voting: closedVoting, ties_settled: ties });
  }
  return { closedCandidacy, stalled, closedVoting };
}

/* ══ خياراتُ الفتح والتكليف ═════════════════════════════════════════ */

/** @db `getElectionCreateOptions` — المقعدُ فارغٌ فعلًا ولا انتخابَ نشطٌ له. */
export function createOptions(w: SimWorld) {
  const free = (role: ElectedRole, committeeId: number | null, departmentId: number | null) =>
    !seatHolder(w, role, committeeId, departmentId)
    && !w.elections.some((e) => !e.archivedAt && LIVE_STATUSES.includes(e.status)
      && e.targetRoleName === role
      && (e.targetCommitteeId ?? null) === committeeId
      && (e.targetDepartmentId ?? null) === departmentId);

  return {
    leaderCommittees: COMMITTEES.filter((c) => free("committee_leader", c.id, null)).map((c) => ({ id: c.id, label: c.ar })),
    deputyCommittees: COMMITTEES.filter((c) => free("deputy_committee_leader", c.id, null)).map((c) => ({ id: c.id, label: c.ar })),
    departments: departmentOptions(w, free),
  };
}

function departmentOptions(w: SimWorld, free: (r: ElectedRole, c: number | null, d: number | null) => boolean) {
  return COMMITTEES
    .map((c) => c.departmentId)
    .filter((id, i, all) => all.indexOf(id) === i)
    .filter((id) => free("department_head", null, id))
    .map((id) => ({ id, label: departmentOf(id)?.ar ?? `قسم #${id}` }));
}

/**
 * @db `getAppointableMembers` — أعضاءُ نطاق المقعد السارون، **ونطاقُهم نطاقُ ناخبيه نفسُه**:
 * أعضاءُ اللجنة لمقعدَيها، وأعضاءُ لجان القسم لمقعد تنسيقه. والحَكَمُ الأخير `assign_position`.
 */
export function appointableMembers(w: SimWorld, electionId: string): { id: string; label: string }[] {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return [];
  const inScope = (committeeId: number | null) => e.targetRoleName === "department_head"
    ? COMMITTEES.some((c) => c.departmentId === e.targetDepartmentId && c.id === committeeId)
    : committeeId === e.targetCommitteeId;
  // الاسمُ وحدَه في التسمية، كما يُخرجها `getAppointableMembers` (وترتيبُها بالاسم)
  return membersIn(w)
    .filter((m) => inScope(m.committeeId))
    .filter((m) => !failedConfidenceUser(w, electionId, m.id))
    .map((m) => ({ id: m.id, label: m.name }))
    .sort((a, b) => a.label.localeCompare(b.label, "ar"));
}

/** المرشّحُ الأعلى وزنًا في مقعد — تقرؤه لوحةُ النتائج ومعايرةُ القاعدة. */
export const topCandidate = (w: SimWorld, electionId: string): SimCandidate | null =>
  w.candidates
    .filter((c) => c.electionId === electionId && c.status === "approved")
    .sort((a, b) => candidateWeight(w, b.id) - candidateWeight(w, a.id) || a.number - b.number)[0] ?? null;

/** حالةُ الانتخاب المعروضة — يقرؤها المحاكي ليعرف أيَّ شاشةٍ يُظهر. */
export const statusOf = (w: SimWorld, electionId: string): ElectionStatus | null =>
  w.elections.find((e) => e.id === electionId)?.status ?? null;

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   القواعدُ الجديدة — دفعاتُ إصلاح الانتخابات ١–٥ (2026-11-16/17)، منقولةً عن دوالّها كما كُتبت
   في `supabase/migrations/2026111*_elections_v2_0*`. وطُبّقت الدفعاتُ على القاعدة الحيّة في 2026-11-17،
   فالمحاكي مرآتُها: كلُّ دالّةٍ تحمل اسمَ أصلها (`@db`)، ورسائلُ الرفض بنصّها، ومن غيّر أصلًا هناك غيّره هنا.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const reasonOk = (s?: string | null) => !!s && s.trim().length >= 10;
const roleOf = (w: SimWorld, u: string) => memberIn(w, u)?.roleName ?? "";
/** @db `_is_hr_member` / `_is_hr_leader` */
const isHrMember = (w: SimWorld, u: string) => ["hr_admin_member", "hr_committee_leader"].includes(roleOf(w, u));
const isHrLeader = (w: SimWorld, u: string) => roleOf(w, u) === "hr_committee_leader";
const isPresident = (w: SimWorld, u: string) => roleOf(w, u) === "club_president";
/** @db `_is_live_candidacy` */
const LIVE_CANDIDACY: CandidateStatus[] = ["pending", "approved", "needs_edit", "frozen"];

/** @db `_council_members()` — مقاعدُ المجلس الإداريّ المشغولة (وقائدُ الجودة ليس في عالم المحاكي). */
export const COUNCIL_ROLES = ["club_president", "executive_council_president", "hr_committee_leader"];
export const councilMembers = (w: SimWorld) => membersIn(w).filter((m) => COUNCIL_ROLES.includes(m.roleName)).map((m) => m.id);

/** مدّةٌ كما تقبلها القاعدةُ فترةً (`interval`): «6 hours»، «1 day»، «06:00:00». و`null` ما لم يُفهم. */
export function intervalMs(s: string | null | undefined): number | null {
  const t = (s ?? "").trim().toLowerCase();
  const hms = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (hms) return ((+hms[1]) * 3600 + (+hms[2]) * 60 + (+(hms[3] ?? 0))) * 1000;
  const unit: Record<string, number> = { minute: 60_000, min: 60_000, hour: 3_600_000, hr: 3_600_000, day: 86_400_000, week: 604_800_000 };
  let total = 0;
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(minute|min|hour|hr|day|week)s?/g)) total += +m[1] * unit[m[2]];
  return total > 0 ? total : null;
}

/* ── البطلان والتعثّر والإعلان ──────────────────────────────────────────────────────────────── */

/** @db `_void_votes` — الصوتُ لا يُحذف: يبطل ويبقى، ويُردّ مَن بطل صوتُه. */
function voidVotes(w: SimWorld, electionId: string, candidateId: string | null, reason: "candidacy_ended" | "single_left" | "reopened"): string[] {
  const hit = w.votes.filter((v) => v.electionId === electionId && !v.voidedAt && (candidateId === null || v.candidateId === candidateId));
  for (const v of hit) { v.voidedAt = w.now; v.voidReason = reason; }
  if (hit.length) writeLog(w, electionId, null, "votes_voided", { candidate_id: candidateId, reason, count: hit.length });
  return [...new Set(hit.map((v) => v.voterId))];
}

/** @db `_stall_election` — يقف المقعدُ بسببه، ويُنادى من يديره (المادة 25). */
export function stallElection(w: SimWorld, electionId: string, reason: NonNullable<SimElection["stallReason"]>, payload: Record<string, unknown> = {}) {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e || e.stalledAt) return;
  e.stalledAt = w.now;
  e.stallReason = reason;
  writeLog(w, electionId, null, "election_stalled", { reason, ...payload });
  notify(w, "election_admins", "انتخابٌ متعثّر ينتظر قرارك", `تعثّر انتخاب ${targetLabel(e)}. اختر: إعادة فتح الباب بموعدٍ جديد، أو التعيين، أو الإلغاء (المادة 25).`, "warning");
}

/** @db `_declare_seat` + `auto_grant_winner_role` — المنصّةُ تعلن الفائز وتُسند المنصب (المادة 28). */
function declareSeat(w: SimWorld, electionId: string, candidateId: string, how: string) {
  const e = w.elections.find((x) => x.id === electionId);
  const c = w.candidates.find((x) => x.id === candidateId);
  if (!e || !c || e.status !== "voting_closed" || e.winnerCandidateId) return;
  e.winnerCandidateId = candidateId;
  e.winnerDeclaredAt = w.now;
  e.status = "completed";
  e.completedBy = "winner";
  e.archivedAt = w.now;
  writeLog(w, electionId, null, "winner_declared_auto", { candidate_id: candidateId, how });
  assignPosition(w, c.userId, e.targetRoleName, e.targetCommitteeId, e.targetDepartmentId, `تعيين تلقائيّ بعد الفوز في الانتخاب ${e.id}`);
  writeLog(w, electionId, null, "winner_declared", { winner_user_id: c.userId, role_name: e.targetRoleName });
  notify(w, "election_participants", "أُعلن الفائز", `أعلنت المنصّة فائز ${targetLabel(e)}.`, "success");
}

/** @db `_end_candidacy` — ينتهي الترشّحُ بسببه، ويُغلق تجميدُه، ثمّ ما يلزم المقعدَ بعده. */
export function endCandidacy(w: SimWorld, candidateId: string, reason: NonNullable<SimCandidate["endReason"]>, actorId: string | null, payload: Record<string, unknown> = {}): boolean {
  const c = w.candidates.find((x) => x.id === candidateId);
  if (!c || !LIVE_CANDIDACY.includes(c.status)) return false;
  c.status = "ended";
  c.endReason = reason;
  c.endedAt = w.now;
  for (const f of w.freezes) {
    if (f.candidateId !== candidateId || f.status === "closed") continue;
    f.status = "closed";
    f.outcome = typeof payload["freeze_outcome"] === "string" ? (payload["freeze_outcome"] as string) : "ended";
    f.decidedBy = f.decidedBy ?? actorId;
  }
  writeLog(w, c.electionId, actorId, "candidacy_ended", { candidate_id: candidateId, user_id: c.userId, reason, ...payload });
  if (reason !== "kept_other_seat") afterCandidacyLost(w, c.electionId, candidateId);
  return true;
}

/**
 * @db `_after_candidacy_lost` — ما يقع للمقعد إذا انتهى ترشّحٌ والتصويتُ مفتوحٌ أو مغلقٌ لم يُعلَن (المادة 16):
 * لا أحد ← تعثّر؛ واحدٌ ← تبطل الأصواتُ كلُّها وتُعاد تزكيةً؛ أكثر ← تبطل أصواتُ صاحبه وحدها، فإن كان
 * التصويتُ مغلقًا انتظر من يفتح الإعادة لأصحابها.
 */
function afterCandidacyLost(w: SimWorld, electionId: string, candidateId: string) {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e || (e.status !== "voting_open" && e.status !== "voting_closed") || e.winnerCandidateId) return;
  for (const t of w.ties) if (t.electionId === electionId && t.status === "open") t.status = "void";

  const left = w.candidates.filter((c) => c.electionId === electionId && (c.status === "approved" || c.status === "frozen")).length;
  const close = (flag: string) => {
    if (e.status !== "voting_open") return;
    e.status = "voting_closed";
    e.revoteOnly = false;
    writeLog(w, electionId, null, "status_transition", { new_status: "voting_closed", auto: true, [flag]: true });
  };
  if (left === 0) {
    close("none_left");
    stallElection(w, electionId, "none_left_in_voting");
  } else if (left === 1) {
    const voters = voidVotes(w, electionId, null, "single_left");
    close("single_left");
    e.revotePending = "full";
    e.revoteOnly = false;
    if (voters.length) notify(w, "voided_voters", "بطل صوتك", `لم يبقَ في ${targetLabel(e)} إلا مرشّحٌ واحد، فبطلت أصواته كلّها، ويُعاد التصويت تزكيةً (المادة 16).`, "warning");
    notify(w, "election_admins", "حدّد موعد إعادة التصويت", `لم يبقَ في ${targetLabel(e)} إلا مرشّحٌ واحد. افتح التصويت من أوّله تزكيةً بموعدٍ تحدّده (المادة 16).`, "warning");
  } else {
    const voters = voidVotes(w, electionId, candidateId, "candidacy_ended");
    if (voters.length && e.status === "voting_closed") {
      e.revotePending = "partial";
      notify(w, "election_admins", "حدّد موعد إعادة التصويت", `بطلت أصوات مرشّحٍ انتهى ترشّحه في ${targetLabel(e)} بعد الإغلاق. افتحه لأصحابها وحدهم (المادة 16).`, "warning");
    }
    if (voters.length) notify(w, "voided_voters", "بطل صوتك", `انتهى ترشّح من صوّتَّ له في ${targetLabel(e)}، فبطل صوتك (المادة 16).`, "warning");
  }
}

/* ── التعادل (المادة 26) ───────────────────────────────────────────────────────────────────────── */

/** @db `_open_tie` — القرارُ للمجلس الإداري خلال أربعٍ وعشرين ساعة. */
function openTie(w: SimWorld, electionId: string, candidateIds: string[]) {
  const id = w.ties.reduce((m, t) => Math.max(m, t.id), 0) + 1;
  const dueAt = w.now + 24 * 3_600_000;
  w.ties.push({ id, electionId, candidateIds, openedAt: w.now, dueAt, status: "open", outcome: null, winnerCandidateId: null, pausedAt: null, choices: [] });
  writeLog(w, electionId, null, "tie_opened", { tie_id: id, candidate_ids: candidateIds, due_at: new Date(dueAt).toISOString(), council_size: councilMembers(w).length });
  const e = w.elections.find((x) => x.id === electionId)!;
  notify(w, "council", "تعادلٌ ينتظر قرار المجلس", `تعادل المتصدّرون في ${targetLabel(e)}. اختر الفائز بسببٍ مكتوب خلال أربع وعشرين ساعة، وإلا فاز الأسبق ترشّحًا (المادة 26).`, "warning");
}

/** @db `_tie_earliest` — الأسبقُ ترشّحًا بين المتعادلين المعتمَدين. */
function tieEarliest(w: SimWorld, tieId: number): string | null {
  const t = w.ties.find((x) => x.id === tieId);
  if (!t) return null;
  return w.candidates
    .filter((c) => t.candidateIds.includes(c.id) && c.status === "approved")
    .sort((a, b) => a.submittedAt - b.submittedAt || a.id.localeCompare(b.id))[0]?.id ?? null;
}

/** @db `_settle_tie` */
function settleTie(w: SimWorld, tieId: number, candidateId: string | null, outcome: "majority" | "president" | "earliest") {
  const t = w.ties.find((x) => x.id === tieId);
  if (!t || t.status !== "open" || !candidateId) return;
  t.status = "decided";
  t.outcome = outcome;
  t.winnerCandidateId = candidateId;
  writeLog(w, t.electionId, null, "tie_decided", { tie_id: tieId, outcome, candidate_id: candidateId });
  declareSeat(w, t.electionId, candidateId, `tie_${outcome}`);
}

/** @db `_evaluate_tie` — الأغلبيّةُ من المقاعد المشغولة، فإن اختار الجميعُ وتساووا رجح رئيسُ أدِيب. */
function evaluateTie(w: SimWorld, tieId: number) {
  const t = w.ties.find((x) => x.id === tieId);
  if (!t || t.status !== "open") return;
  const council = councilMembers(w);
  if (!council.length || t.pausedAt) return;
  const earliest = tieEarliest(w, tieId);
  const eff = t.choices.filter((c) => council.includes(c.memberId)).map((c) => ({ member: c.memberId, cand: c.candidateId ?? earliest }));
  const counts = new Map<string | null, number>();
  for (const x of eff) counts.set(x.cand, (counts.get(x.cand) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return;
  const [best, top] = ranked[0];
  const nTop = ranked.filter(([, n]) => n === top).length;
  if (top * 2 > council.length) { settleTie(w, tieId, best, "majority"); return; }
  if (eff.length >= council.length && nTop > 1) {
    const pres = eff.find((x) => roleOf(w, x.member) === "club_president")?.cand ?? null;
    if (pres && counts.get(pres) === top) settleTie(w, tieId, pres, "president");
  }
}

/* ── الحسم (المواد 26 و27 و28) ─────────────────────────────────────────────────────────────────── */

/**
 * @db `_resolve_department` — يأخذ مقاعد القسم التي أُغلق تصويتها ولم تُعلَن ولم تتعثّر ولا تعادل فيها
 * ولا إعادةَ تنتظر، فيحجز ما فيه مجمَّد أو ما يشارك مقعدًا حيًّا مرشّحًا، ويُعثّر التزكية الساقطة،
 * ويطبّق المادة 27 على من تصدّر أكثر من مقعد، ثمّ يُعلن، ثمّ يفتح التعادل.
 */
export function resolveSeats(w: SimWorld, electionId: string) {
  const me = w.elections.find((x) => x.id === electionId);
  if (!me) return;
  const dept = electionDepartment(me);
  const seats = w.elections.filter((e) => e.status === "voting_closed" && !e.archivedAt && !e.winnerCandidateId && !e.stalledAt
    && !e.revotePending && !w.ties.some((t) => t.electionId === e.id && t.status === "open")
    && (e.id === electionId || (dept !== null && electionDepartment(e) === dept)));
  if (!seats.length) return;

  // أ. الحجز
  const blocked = new Set<string>();
  for (const s of seats) {
    const mine = w.candidates.filter((c) => c.electionId === s.id);
    if (mine.some((c) => c.status === "frozen")) { blocked.add(s.id); continue; }
    const users = mine.filter((c) => c.status === "approved" || c.status === "frozen").map((c) => c.userId);
    const shares = w.candidates.some((b) => users.includes(b.userId) && b.electionId !== s.id && LIVE_CANDIDACY.includes(b.status) && (() => {
      const o = w.elections.find((x) => x.id === b.electionId);
      return !!o && !o.archivedAt && !o.stalledAt && ["candidacy_open", "candidacy_closed", "voting_open"].includes(o.status) && electionDepartment(o) === dept;
    })());
    if (shares) blocked.add(s.id);
  }
  for (let grew = true; grew;) {
    grew = false;
    for (const s of seats) {
      if (blocked.has(s.id)) continue;
      const users = w.candidates.filter((c) => c.electionId === s.id && c.status === "approved").map((c) => c.userId);
      if (w.candidates.some((b) => blocked.has(b.electionId) && users.includes(b.userId) && (b.status === "approved" || b.status === "frozen"))) {
        blocked.add(s.id);
        grew = true;
      }
    }
  }
  let live = seats.filter((s) => !blocked.has(s.id));

  // ب. التزكية الساقطة تتعثّر
  for (const s of live) {
    if (!isConfidence(w, s.id)) continue;
    const yes = choiceWeight(w, s.id, "approve");
    const nay = choiceWeight(w, s.id, "reject");
    if (yes <= nay) {
      // ويبقى المرشّحُ معتمَدًا: ينتهي ترشّحه بسقوط التزكية حين يُعاد فتح الباب (`transition_election`)
      stallElection(w, s.id, "confidence_failed", { approve_weight: yes, reject_weight: nay });
    }
  }
  live = live.filter((s) => !s.stalledAt);

  type Row = { eid: string; cid: string; uid: string; pref: number; sub: number; w: number; rk: number; conf: boolean; dropped: boolean };
  const rk = (r: ElectedRole) => (r === "department_head" ? 1 : r === "committee_leader" ? 2 : 3);
  const rows: Row[] = [];
  for (const s of live) {
    const conf = isConfidence(w, s.id);
    for (const c of w.candidates.filter((x) => x.electionId === s.id && x.status === "approved")) {
      rows.push({ eid: s.id, cid: c.id, uid: c.userId, pref: c.preferenceRank ?? 2, sub: c.submittedAt, w: candidateWeight(w, c.id), rk: rk(s.targetRoleName), conf, dropped: false });
    }
  }
  const soleTop = (r: Row) => {
    const peers = rows.filter((x) => x.eid === r.eid && !x.dropped);
    const max = Math.max(...peers.map((x) => x.w));
    return !r.dropped && r.w > 0 && r.w === max && peers.filter((x) => x.w === max).length === 1;
  };

  // ج. المادة 27 على المتصدّرين وحدهم
  const order: string[] = [];
  for (let guard = 0; guard < 64; guard++) {
    const tops = rows.filter(soleTop);
    const byUser = new Map<string, Row[]>();
    for (const r of tops) byUser.set(r.uid, [...(byUser.get(r.uid) ?? []), r]);
    const clash = [...byUser.entries()].find(([, l]) => l.length > 1);
    if (!clash) break;
    const [uid, list] = clash;
    const keep = [...list].sort((a, b) => a.pref - b.pref || a.rk - b.rk || a.sub - b.sub)[0].eid;
    for (const r of rows) {
      if (r.uid !== uid || r.eid === keep) continue;
      if (r.conf && !r.dropped) endCandidacy(w, r.cid, "kept_other_seat", null, { kept_election: keep });
      r.dropped = true;
    }
    order.push(keep);
  }
  for (const s of [...live].sort((a, b) => rk(a.targetRoleName) - rk(b.targetRoleName) || a.id.localeCompare(b.id))) {
    if (!order.includes(s.id)) order.push(s.id);
  }

  // د. الإعلان، ثمّ التعادل
  const tied: string[] = [];
  for (const pass of [1, 2] as const) {
    for (const eid of pass === 1 ? order : tied) {
      const seat = w.elections.find((x) => x.id === eid)!;
      for (const r of rows) {
        if (r.eid !== eid || r.dropped) continue;
        const wonElsewhere = w.elections.some((o) => o.id !== eid && o.status === "completed" && !!o.winnerCandidateId
          && electionDepartment(o) === dept && (o.winnerDeclaredAt ?? 0) >= seat.candidacyOpenedAt
          && w.candidates.find((c) => c.id === o.winnerCandidateId)?.userId === r.uid);
        if (wonElsewhere) r.dropped = true;
      }
      const mine = rows.filter((r) => r.eid === eid && !r.dropped);
      const top = mine.length ? Math.max(...mine.map((r) => r.w)) : 0;
      const atTop = mine.filter((r) => r.w === top);
      if (top <= 0) {
        stallElection(w, eid, rows.some((r) => r.eid === eid && r.w > 0) ? "none_left_after_27" : "no_votes");
      } else if (atTop.length === 1) {
        declareSeat(w, eid, atTop[0].cid, rows.some((r) => r.eid === eid && r.dropped && r.w > top) ? "after_27" : "top");
      } else if (pass === 1) {
        tied.push(eid);
      } else {
        openTie(w, eid, [...atTop].sort((a, b) => a.sub - b.sub || a.cid.localeCompare(b.cid)).map((r) => r.cid));
      }
    }
  }
}

/** @db `_after_voting_closed` — الحسمُ بعد كلّ إغلاق، ولا يُفسد خطؤه الإغلاق: يُقيَّد ويُعاد. */
export function afterVotingClosed(w: SimWorld, electionId: string) {
  try {
    resolveSeats(w, electionId);
  } catch (err) {
    writeLog(w, electionId, null, "resolve_failed", { error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * ما تفعله كنّاسةُ القاعدة في دقيقتها بلا مرور زمن: تحسم كلَّ مقعدٍ أُغلق تصويتُه ولم يُحسم.
 * والمتجرُ يُجريها بعد كلّ فعلٍ ناجح، فلا ينتظر المجرِّبُ دقيقةً لا تمرّ في المحاكي.
 */
export function settle(w: SimWorld) {
  for (const e of w.elections) {
    if (e.status !== "voting_closed" || e.archivedAt || e.winnerCandidateId || e.stalledAt || e.revotePending) continue;
    if (w.ties.some((t) => t.electionId === e.id && t.status === "open")) continue;
    afterVotingClosed(w, e.id);
  }
}

/** @db `_failed_confidence_user` — مرشّحُ تزكيةٍ سقطت في هذا الانتخاب. */
export const failedConfidenceUser = (w: SimWorld, electionId: string, userId: string) =>
  w.elections.some((e) => e.id === electionId && e.stallReason === "confidence_failed")
  && w.candidates.some((c) => c.electionId === electionId && c.userId === userId);

/* ── الأفعالُ التسعة ───────────────────────────────────────────────────────────────────────────── */

/** @db `open_revote` — لأصحاب الأصوات الباطلة وحدهم (`partial`)، أو من أوّله تزكيةً (`full`). */
export function openRevote(w: SimWorld, actorId: string, electionId: string, votingEndIso: string, reason: string): ElectionResult {
  if (!reasonOk(reason)) return no("اكتب سبب إعادة التصويت (10 أحرف على الأقلّ).");
  if (!votingEndIso || Number.isNaN(Date.parse(votingEndIso))) return no("اختر موعد إغلاق إعادة التصويت.");
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بإعادة التصويت");
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود");
  if (e.status !== "voting_closed" || !e.revotePending) return no("لا إعادة تصويتٍ تنتظر في هذا الانتخاب");
  const end = Date.parse(votingEndIso);
  if (end <= w.now) return no("اختر لإغلاق إعادة التصويت موعدًا في المستقبل");
  const kind = e.revotePending;
  e.status = "voting_open";
  e.votingEnd = end;
  e.revoteOnly = kind === "partial";
  e.revotePending = null;
  writeLog(w, electionId, actorId, "revote_opened", { kind, voting_end: votingEndIso, reason: reason.trim() });
  notify(w, kind === "partial" ? "voided_voters" : "election_voters", "أُعيد فتح التصويت", `أُعيد فتح التصويت في ${targetLabel(e)}. ${reason.trim()}`, "info");
  return ok("أُعيد فتح التصويت، وأُبلغ الناخبون.");
}

/** @db `appoint_seat_holder` — يُسند المقعدَ المتعثّر ويكتمل به الانتخاب «بالتعيين» (المادة 25). */
export function appointSeatHolder(w: SimWorld, actorId: string, electionId: string, userId: string, reason: string): ElectionResult {
  if (!userId) return no("اختر العضو.");
  if (!reasonOk(reason)) return no("اكتب سبب التعيين (10 أحرف على الأقلّ).");
  if (!isElectionAdmin(w, actorId)) return no("التعيين على المقعد المتعثّر لمديري الانتخابات الثلاثة وحدهم (المادة 25)");
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود");
  if (e.status === "completed") return no("هذا الانتخاب مكتمل");
  if (!e.stalledAt) return no("لا يُعيَّن إلا على مقعدٍ تعثّر انتخابه، أو أُلغي لتعثّره (المادة 25)");
  if (failedConfidenceUser(w, electionId, userId)) {
    return no("من سقطت تزكيته في هذا الانتخاب لا يُعيَّن عليه (المادة 25)");
  }
  const m = memberIn(w, userId);
  if (!m) return no("العضو غير موجود");

  const from = e.status;
  assignPosition(w, userId, e.targetRoleName, e.targetCommitteeId, e.targetDepartmentId, `تعيينٌ على مقعدٍ تعثّر انتخابه (${electionId}) : ${reason.trim()}`);
  e.status = "completed";
  e.completedBy = "appointment";
  e.appointedUserId = userId;
  e.archivedAt = e.archivedAt ?? w.now;
  for (const t of w.ties) if (t.electionId === electionId && t.status === "open") t.status = "void";
  writeLog(w, electionId, actorId, "completed_by_appointment", { user_id: userId, reason: reason.trim(), from_status: from });
  notify(w, "election_voters", "اكتمل الانتخاب بالتعيين", `عُيّن ${m.name} على ${targetLabel(e)} بعد تعثّر انتخابه.`);
  afterVotingClosed(w, electionId);
  return ok("عُيّن العضو، واكتمل الانتخاب بالتعيين.");
}

/** @db `choose_in_tie` — اختيارٌ واحدٌ لكلّ عضو، بسببٍ لا يُعدَّل. */
export function chooseInTie(w: SimWorld, actorId: string, tieId: number, candidateId: string | null, reason: string): ElectionResult {
  if (!reasonOk(reason)) return no("اكتب سبب اختيارك (10 أحرف على الأقلّ).");
  if (!councilMembers(w).includes(actorId)) return no("الفصل في التعادل للمجلس الإداري (المادة 26)");
  const t = w.ties.find((x) => x.id === tieId);
  if (!t || t.status !== "open") return no("لا تعادل قائم هنا");
  if (t.dueAt <= w.now) return no("مضى أجل الفصل، ويفوز الأسبق ترشّحًا آليًّا");
  if (candidateId !== null && !t.candidateIds.includes(candidateId)) return no("اختر من المتعادلين");
  if (t.choices.some((c) => c.memberId === actorId)) return no("اخترتَ في هذا التعادل من قبل، ولا يُعدَّل الاختيار");
  t.choices.push({ memberId: actorId, candidateId, reason: reason.trim(), at: w.now });
  writeLog(w, t.electionId, actorId, "tie_choice", { tie_id: tieId, candidate_id: candidateId, deferred: candidateId === null, reason: reason.trim() });
  evaluateTie(w, tieId);
  return ok("أُرسل اختيارك.");
}

/* ── التجميد (المادة 16) ───────────────────────────────────────────────────────────────────────── */

/** @db `_apply_freeze` — يُجمَّد الترشّح وتبدأ مهلةُ الإجابة، ويتوقّف أجلُ تعادلٍ هو فيه. */
function applyFreeze(w: SimWorld, freezeId: number, approverId: string) {
  const f = w.freezes.find((x) => x.id === freezeId)!;
  const c = w.candidates.find((x) => x.id === f.candidateId)!;
  f.priorStatus = c.status;
  f.editRemaining = c.status === "needs_edit" && c.editDueAt ? Math.max(c.editDueAt - w.now, 0) : null;
  c.status = "frozen";
  f.status = "active";
  f.answerDue = w.now + (intervalMs(f.answerWindow) ?? 0);
  for (const t of w.ties) if (t.electionId === f.electionId && t.status === "open" && !t.pausedAt && t.candidateIds.includes(c.id)) t.pausedAt = w.now;
  writeLog(w, f.electionId, approverId, "candidate_frozen", {
    candidate_id: c.id, freeze_id: freezeId, reason: f.reason, requested_by: f.requestedBy, answer_due: new Date(f.answerDue).toISOString(),
  });
  notify(w, "candidate", "جُمّد ترشّحك", `جُمّد ترشّحك. السبب: ${f.reason}`, "warning");
}

/** @db `_lift_freeze` — يعود الترشّح إلى حاله، ويُكمل التعادلُ أجلَه، ويُعاد الحسم إن كان ينتظره. */
function liftFreeze(w: SimWorld, freezeId: number, actorId: string | null, outcome: "lifted" | "auto_lifted", reason: string) {
  const f = w.freezes.find((x) => x.id === freezeId);
  if (!f || (f.status !== "active" && f.status !== "answered")) return;
  const c = w.candidates.find((x) => x.id === f.candidateId);
  if (c && c.status === "frozen") {
    c.status = f.priorStatus ?? "approved";
    c.editDueAt = c.status === "needs_edit" ? w.now + (f.editRemaining ?? 0) : null;
  }
  f.status = "closed";
  f.outcome = outcome;
  f.decidedBy = actorId;
  f.decisionReason = reason;
  writeLog(w, f.electionId, actorId, "freeze_lifted", { candidate_id: f.candidateId, freeze_id: freezeId, outcome, reason });
  for (const t of w.ties) {
    if (t.electionId !== f.electionId || t.status !== "open" || !t.pausedAt) continue;
    if (w.candidates.some((x) => t.candidateIds.includes(x.id) && x.status === "frozen")) continue;
    t.dueAt += w.now - t.pausedAt;
    t.pausedAt = null;
    evaluateTie(w, t.id);
  }
  afterVotingClosed(w, f.electionId);
}

/** @db `_exclude_frozen` — الاستبعادُ إنهاءٌ للترشّح بسببه، وتبطل أصواته (المادة 16). */
function excludeFrozen(w: SimWorld, freezeId: number, actorId: string | null, outcome: "excluded" | "auto_excluded", reason: string) {
  const f = w.freezes.find((x) => x.id === freezeId);
  if (!f || (f.status !== "active" && f.status !== "answered")) return;
  f.decisionReason = reason;
  endCandidacy(w, f.candidateId, "excluded", actorId, { freeze_id: freezeId, freeze_outcome: outcome, note: reason });
}

/** @db `request_candidacy_freeze` — يطلبه عضوُ الموارد، وإن طلبه قائدُها جُمّد في الحال. */
export function requestFreeze(w: SimWorld, actorId: string, candidateId: string, reason: string, answerWindow: string, decideWindow: string): ElectionResult {
  if (!isHrMember(w, actorId)) return no("التجميد لإدارة الموارد البشرية (المادة 16)");
  const c = w.candidates.find((x) => x.id === candidateId);
  if (!c) return no("الترشح غير موجود");
  const e = w.elections.find((x) => x.id === c.electionId)!;
  if (!["pending", "approved", "needs_edit"].includes(c.status)) return no("لا يُجمَّد إلا ترشّحٌ قائم");
  if (!["candidacy_open", "candidacy_closed", "voting_open", "voting_closed"].includes(e.status) || e.winnerCandidateId) {
    return no("لا تجميد بعد إعلان الفائز أو إلغاء الانتخاب");
  }
  if (!reasonOk(reason)) return no("اكتب سبب التجميد: الضابط الذي خالفه (10 أحرف على الأقلّ)");
  if (!intervalMs(answerWindow) || !intervalMs(decideWindow)) return no("حدّد مهلة الإجابة وأجل القرار");
  if (w.freezes.some((f) => f.candidateId === candidateId && f.status !== "closed")) return no("على هذا الترشّح تجميدٌ قائم أو طلبٌ ينتظر");

  const id = w.freezes.reduce((m, f) => Math.max(m, f.id), 0) + 1;
  w.freezes.push({
    id, candidateId, electionId: c.electionId, status: "requested", reason: reason.trim(), answerWindow, decideWindow,
    requestedBy: actorId, requestedAt: w.now, answerDue: null, answerText: null, answeredAt: null, decideDue: null,
  });
  writeLog(w, c.electionId, actorId, "freeze_requested", { candidate_id: candidateId, freeze_id: id, reason: reason.trim() });
  if (isHrLeader(w, actorId)) {
    applyFreeze(w, id, actorId);
    return ok("جُمّد الترشّح، وأُبلغ صاحبه بالسبب ومهلة الإجابة.", String(id));
  }
  notify(w, "hr_leader", "طلب تجميدٍ ينتظر موافقتك", `طُلب تجميد ترشّحٍ في ${targetLabel(e)}.`, "warning");
  return ok("أُرسل طلب التجميد إلى قائد الموارد البشرية.", String(id));
}

/** @db `approve_candidacy_freeze` — موافقةُ القائد تُجمّد، وردُّه بسبب. */
export function approveFreeze(w: SimWorld, actorId: string, freezeId: number, approve: boolean, reason?: string): ElectionResult {
  if (!isHrLeader(w, actorId)) return no("الموافقة على التجميد لقائد إدارة الموارد البشرية (المادة 16)");
  const f = w.freezes.find((x) => x.id === freezeId);
  if (!f || f.status !== "requested") return no("لا طلب تجميد ينتظر هنا");
  if (approve) {
    const c = w.candidates.find((x) => x.id === f.candidateId);
    const e = w.elections.find((x) => x.id === f.electionId);
    if (!c || !["pending", "approved", "needs_edit"].includes(c.status)
      || !e || e.winnerCandidateId || !["candidacy_open", "candidacy_closed", "voting_open", "voting_closed"].includes(e.status)) {
      return no("تغيّر حال الترشّح أو الانتخاب منذ الطلب");
    }
    applyFreeze(w, freezeId, actorId);
    return ok("جُمّد الترشّح، وأُبلغ صاحبه بالسبب ومهلة الإجابة.");
  }
  if (!reasonOk(reason)) return no("اكتب سبب رفض الطلب (10 أحرف على الأقلّ)");
  f.status = "closed";
  f.outcome = "declined";
  f.decidedBy = actorId;
  f.decisionReason = reason!.trim();
  writeLog(w, f.electionId, actorId, "freeze_declined", { candidate_id: f.candidateId, freeze_id: freezeId, reason: reason!.trim() });
  return ok("رُدّ طلب التجميد.");
}

/** @db `answer_candidacy_freeze` — يجيب صاحبُ الترشّح قبل المهلة، فيبدأ أجلُ القرار. */
export function answerFreeze(w: SimWorld, actorId: string, freezeId: number, text: string): ElectionResult {
  const f = w.freezes.find((x) => x.id === freezeId);
  if (!f) return no("التجميد غير موجود");
  if (!w.candidates.some((c) => c.id === f.candidateId && c.userId === actorId)) return no("الإجابة لصاحب الترشّح وحده");
  if (f.status !== "active") return no("لا تجميد ينتظر إجابتك");
  if ((f.answerDue ?? 0) <= w.now) return no("مضت مهلة الإجابة");
  if (!reasonOk(text)) return no("اكتب إجابتك (10 أحرف على الأقلّ)");
  f.status = "answered";
  f.answerText = text.trim();
  f.answeredAt = w.now;
  f.decideDue = w.now + (intervalMs(f.decideWindow) ?? 0);
  writeLog(w, f.electionId, actorId, "freeze_answered", { candidate_id: f.candidateId, freeze_id: freezeId, decide_due: new Date(f.decideDue).toISOString() });
  notify(w, "hr_leader", "أجاب المرشّح عن التجميد", "وصلت إجابة المرشّح، والقرار لك قبل أجله.", "info");
  return ok("وصلت إجابتك، والقرار قبل أجله.");
}

/** @db `decide_candidacy_freeze` — رفعٌ أو استبعاد، ولا استبعاد قبل الإجابة. */
export function decideFreeze(w: SimWorld, actorId: string, freezeId: number, outcome: "lift" | "exclude", reason: string): ElectionResult {
  if (!isHrLeader(w, actorId)) return no("قرار التجميد لقائد إدارة الموارد البشرية");
  const f = w.freezes.find((x) => x.id === freezeId);
  if (!f || (f.status !== "active" && f.status !== "answered")) return no("لا تجميد قائم هنا");
  if (!reasonOk(reason)) return no("اكتب سبب القرار (10 أحرف على الأقلّ)");
  if (f.status === "answered" && (f.decideDue ?? 0) <= w.now) return no("مضى أجل القرار، فيُرفع التجميد آليًّا (المادة 16)");
  if (outcome === "lift") {
    liftFreeze(w, freezeId, actorId, "lifted", reason.trim());
    return ok("رُفع التجميد، وعاد الترشّح إلى حاله.");
  }
  if (f.status !== "answered") return no("لا يُستبعد قبل أن يُجيب أو تمضي مهلة إجابته (المادة 16)");
  excludeFrozen(w, freezeId, actorId, "excluded", reason.trim());
  return ok("استُبعد المرشّح، وانتهى ترشّحه.");
}

/* ── الحرمان (المادة 11) ──────────────────────────────────────────────────────────────────────── */

/** @db `ban_from_candidacy` — لرئيس أدِيب وحده، وأجلُه من اليوم إلى سنة، وينهي ما لم يُفتح تصويتُه. */
export function banFromCandidacy(w: SimWorld, actorId: string, userId: string, reason: string, untilDate: string): ElectionResult {
  if (!isPresident(w, actorId)) return no("الحرمان من الترشّح لرئيس أدِيب وحده (المادة 11)");
  if (!userId || !memberIn(w, userId)) return no("العضو غير موجود");
  if (!reasonOk(reason)) return no("اكتب سبب الحرمان (10 أحرف على الأقلّ)");
  const today = riyadhDay(w.now);
  const yearOn = riyadhDay(Date.parse(`${today}T12:00:00Z`) + 365 * 86_400_000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(untilDate ?? "") || untilDate < today || untilDate > yearOn) {
    return no("أجل الحرمان من اليوم إلى سنةٍ على الأكثر (المادة 11)");
  }
  if (activeBanOf(w, userId)) return no("هذا العضو محرومٌ من الترشّح الآن");
  const id = w.bans.reduce((m, b) => Math.max(m, b.id), 0) + 1;
  w.bans.push({ id, userId, reason: reason.trim(), until: untilDate, issuedBy: actorId, issuedAt: w.now, liftedAt: null, liftReason: null });
  for (const c of w.candidates.filter((x) => x.userId === userId && LIVE_CANDIDACY.includes(x.status))) {
    const e = w.elections.find((x) => x.id === c.electionId);
    if (!e || e.archivedAt || !["candidacy_open", "candidacy_closed"].includes(e.status)) continue;
    endCandidacy(w, c.id, "debarred", actorId, { ban_id: id });
  }
  notify(w, "banned", "حُرمتَ من الترشّح", `قرّر رئيس أدِيب حرمانك من الترشّح حتى ${untilDate}. السبب: ${reason.trim()}.`, "warning");
  return ok("حُرم العضو من الترشّح، وأُبلغ بالسبب والأجل.", String(id));
}

/** @db `lift_candidacy_ban` */
export function liftCandidacyBan(w: SimWorld, actorId: string, banId: number, reason: string): ElectionResult {
  if (!isPresident(w, actorId)) return no("رفع الحرمان لرئيس أدِيب وحده (المادة 11)");
  const b = w.bans.find((x) => x.id === banId);
  if (!b || b.liftedAt) return no("لا حرمان قائم هنا");
  if (!reasonOk(reason)) return no("اكتب سبب رفع الحرمان (10 أحرف على الأقلّ)");
  b.liftedAt = w.now;
  b.liftReason = reason.trim();
  notify(w, "banned", "رُفع حرمانك من الترشّح", `رفع رئيس أدِيب حرمانك من الترشّح. السبب: ${reason.trim()}.`, "info");
  return ok("رُفع الحرمان، وأُبلغ العضو.");
}
