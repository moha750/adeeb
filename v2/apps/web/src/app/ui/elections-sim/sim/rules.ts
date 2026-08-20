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
  electionDepartment, eligibleToRun, eligibleToVote, isConfidence, isElectionAdmin, memberIn, membersIn,
  nextId, notify, seatHolder, voteWeight, writeLog, type SimCandidate, type SimElection, type SimWorld,
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
  if (e.status !== "candidacy_open") return no("لا يمكن التعديل بعد إغلاق باب الترشّح");

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
export function reviewCandidate(w: SimWorld, actorId: string, candidateId: string, newStatus: "approved" | "rejected" | "needs_edit", note?: string): ElectionResult {
  if ((newStatus === "rejected" || newStatus === "needs_edit") && !note?.trim()) return no("اكتب سبب الرفض أو التعديل.");
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بمراجعة المرشحين");

  const c = w.candidates.find((x) => x.id === candidateId);
  if (!c) return no("المرشح غير موجود");
  const allowed = (c.status === "pending" && ["approved", "rejected", "needs_edit"].includes(newStatus))
    || (c.status === "needs_edit" && newStatus === "approved")
    || (c.status === "needs_edit" && newStatus === "rejected");
  if (!allowed) return no(`انتقال مرشح غير مسموح: ${c.status} → ${newStatus}`);

  c.status = newStatus as CandidateStatus;
  c.reviewNote = note?.trim() || null;
  c.reviewedBy = actorId;
  c.reviewedAt = w.now;
  writeLog(w, c.electionId, actorId, "candidate_reviewed", { candidate_id: candidateId, new_status: newStatus, note: note?.trim() ?? null });
  notify(w, "candidate", "قرارٌ في ترشّحك", newStatus === "approved" ? "اعتُمد ترشّحك." : newStatus === "rejected" ? "اعتُذر عن ترشّحك." : "طُلب تعديل بيانك.");
  return ok(newStatus === "approved" ? "اعتُمد المرشّح." : newStatus === "rejected" ? "رُفض المرشّح." : "طُلب تعديل الترشّح.");
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
export function transitionElection(w: SimWorld, actorId: string, electionId: string, next: "candidacy_open" | "candidacy_closed" | "voting_closed" | "voting_open", votingEndIso?: string | null): ElectionResult {
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
  } else if (next === "candidacy_open") {
    if (e.status !== "candidacy_closed") return no(`انتقال غير مسموح للحالة: ${e.status} → ${next}`);
    e.status = "candidacy_open";
    e.candidacyEnd = null;
    e.stalledAt = null;
  } else if (next === "candidacy_closed") {
    if (e.status !== "candidacy_open") return no(`انتقال غير مسموح للحالة: ${e.status} → ${next}`);
    e.status = "candidacy_closed";
  } else {
    if (e.status !== "voting_open") return no(`انتقال غير مسموح للحالة: ${e.status} → ${next}`);
    e.status = "voting_closed";
  }

  writeLog(w, electionId, actorId, "status_transition", { new_status: next, voting_end: votingEndIso ?? null, candidacy_end_cleared: next === "candidacy_open" });
  if (next === "voting_closed") finalizeConfidence(w, actorId, electionId);

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
export function cancelElection(w: SimWorld, actorId: string, electionId: string, reason: string, event = "cancelled"): ElectionResult {
  if (!reason?.trim()) return no("اكتب سبب الإلغاء.");
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بإلغاء الانتخاب");
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود");
  if (e.status === "completed") return no("لا يمكن إلغاء انتخاب مكتمل");
  applyCancel(w, actorId, e, reason.trim(), event);
  return ok("أُلغي الانتخاب.");
}

function applyCancel(w: SimWorld, actorId: string | null, e: SimElection, reason: string, event: string) {
  e.status = "cancelled";
  e.winnerCandidateId = null;
  e.winnerDeclaredAt = null;
  e.stalledAt = null;
  e.archivedAt = e.archivedAt ?? w.now;
  e.cancelReason = reason;
  writeLog(w, e.id, actorId, event, { reason });
}

/** @db `_finalize_confidence` — تسقط التزكيةُ عند إغلاق التصويت إن لم يغلب التأييدُ الاعتراض. */
export function finalizeConfidence(w: SimWorld, actorId: string | null, electionId: string): boolean {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e || e.status !== "voting_closed") return false;
  if (!isConfidence(w, electionId)) return false;
  const yes = choiceWeight(w, electionId, "approve");
  const nay = choiceWeight(w, electionId, "reject");
  if (yes > nay) return false;
  applyCancel(w, actorId, e, `سقطت التزكية : لم يغلب التأييدُ الاعتراض (تأييد ${yes} مقابل ${nay})`, "confidence_failed");
  notify(w, "election_participants", "سقطت التزكية", `لم يغلب التأييدُ الاعتراضَ في تزكية ${targetLabel(e)}. أُلغي الانتخاب وبقي المقعد شاغرًا.`, "warning");
  return true;
}

/* ══ التصويت ═════════════════════════════════════════════════════════ */

/** @db `cast_vote` + تريغر `enforce_vote_eligibility` — بترتيب حرّاسهما نفسِه. */
export function castVote(w: SimWorld, actorId: string, electionId: string, candidateId: string | null, choice: "approve" | "reject" = "approve"): ElectionResult {
  if (!["approve", "reject"].includes(choice)) return no("رأيٌ غير معروف في بطاقة الاقتراع");
  if (choice === "reject" && !isConfidence(w, electionId)) return no("الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد");
  if (candidateId === null) return no("لا مرشّحَ في بطاقتك");
  if (w.votes.some((v) => v.electionId === electionId && v.voterId === actorId)) {
    return no("بطاقتُك في هذا المقعد مختومةٌ، ولا يُعاد الصوت");
  }

  const e = w.elections.find((x) => x.id === electionId);
  if (!e || e.archivedAt) return no("انتخاب غير موجود أو مؤرشف");
  if (e.status !== "voting_open") return no("التصويت غير مفتوح");

  const c = w.candidates.find((x) => x.id === candidateId);
  if (!c || c.electionId !== electionId || c.status !== "approved") return no("المرشح غير صالح في هذا الانتخاب");
  if (c.userId === actorId) return no("لا يمكنك التصويت لنفسك");
  // والأهليّةُ تحمل بندَ المرشّح الوحيد، فهي مَن يردّ بطاقتَه
  if (!eligibleToVote(w, actorId, electionId)) return no("غير مؤهل للتصويت في هذا الانتخاب");

  const m = memberIn(w, actorId);
  const id = nextId(w, "v");
  w.votes.push({
    id, electionId, voterId: actorId, candidateId,
    weight: voteWeight(w, actorId), roleSnapshot: m?.roleName ?? "unknown", choice, at: w.now,
  });
  // السجلُّ يقول «صوّت» ولا يقول «بماذا» — والعرضُ يطويه أصلًا (سرّيّة الاقتراع)
  writeLog(w, electionId, actorId, "vote_cast", { vote_id: id });

  return ok(choice === "reject" ? "سُجِّل اعتراضك، شكرًا لمشاركتك." : "سُجِّل صوتك، شكرًا لمشاركتك.");
}

/* ══ الإعلان والحسم ══════════════════════════════════════════════════ */

/** @db `declare_winner_apply` + `enforce_winner_declaration` + `auto_grant_winner_role`. */
function declareApply(w: SimWorld, actorId: string, electionId: string, candidateId: string): ElectionResult {
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود");
  if (e.archivedAt) return no("الانتخاب مؤرشف");
  if (e.status !== "voting_closed") return no("يجب أن يكون التصويت مغلقاً قبل إعلان الفائز");
  if (e.winnerCandidateId) return no("الفائز معلن مسبقاً");

  const cand = w.candidates.find((c) => c.id === candidateId);
  if (!cand || cand.electionId !== electionId || cand.status !== "approved") {
    return no("الفائز المقترح ليس مرشحاً معتمداً في هذا الانتخاب");
  }

  // (١) التزكية: يُشترَط غلبةُ التأييد وحدَها، ولا يُنظَر في القسم
  if (isConfidence(w, electionId)) {
    if (!(choiceWeight(w, electionId, "approve") > choiceWeight(w, electionId, "reject"))) {
      return no("سقطت التزكية: لم يغلب التأييدُ الاعتراض");
    }
  } else {
    const dept = electionDepartment(e);
    // (٢) لا يفوز بمقعدين في القسم نفسِه في الدورة نفسِها
    const alreadyWon = w.elections.some((o) => {
      if (o.id === e.id || o.status !== "completed") return false;
      if (electionDepartment(o) !== dept) return false;
      if ((o.winnerDeclaredAt ?? 0) < e.candidacyOpenedAt) return false;
      const ow = w.candidates.find((c) => c.id === o.winnerCandidateId);
      return ow?.userId === cand.userId;
    });
    if (alreadyWon) return no("هذا العضو فائزٌ بمقعدٍ آخر في هذا القسم؛ أعلِن الوصيفَ لهذا المقعد.");

    // (٣) الأعلى وزنًا **بين غير المُقصَين** — فيصحّ إعلانُ الوصيف
    const excluded = new Set(
      w.candidates.filter((c) => c.electionId === electionId).filter((c) => w.elections.some((o) => {
        if (o.id === e.id || o.status !== "completed") return false;
        if (electionDepartment(o) !== dept) return false;
        if ((o.winnerDeclaredAt ?? 0) < e.candidacyOpenedAt) return false;
        const ow = w.candidates.find((x) => x.id === o.winnerCandidateId);
        return ow?.userId === c.userId;
      })).map((c) => c.id),
    );
    const top = w.candidates
      .filter((c) => c.electionId === electionId && !excluded.has(c.id))
      .reduce((best, c) => Math.max(best, candidateWeight(w, c.id)), 0);
    if (top > candidateWeight(w, candidateId)) return no("الفائز المعلن ليس صاحب أعلى الأصوات");
  }

  e.winnerCandidateId = candidateId;
  e.winnerDeclaredAt = w.now;
  e.status = "completed";
  e.archivedAt = w.now;
  writeLog(w, electionId, actorId, "declare_winner", { candidate_id: candidateId, auto_archived: true });
  writeLog(w, electionId, actorId, "archived", { auto: true, trigger: "declare_winner" });

  assignPosition(w, cand.userId, e.targetRoleName, e.targetCommitteeId, e.targetDepartmentId, `تعيين تلقائيّ بعد الفوز في الانتخاب ${e.id}`);
  writeLog(w, electionId, actorId, "winner_declared", { winner_user_id: cand.userId, role_name: e.targetRoleName });
  notify(w, "election_participants", "أُعلن الفائز", `أُعلن فائزُ ${targetLabel(e)} وأُسنِد المنصب.`, "success");
  return ok("أُعلن الفائز وأُسنِد المنصب.");
}

/** @db `declare_winner` — بابٌ محروس: لا إعلانَ منفردًا ما دام في القسم مقعدٌ حيٌّ يشاركه مرشّحًا. */
export function declareWinner(w: SimWorld, actorId: string, electionId: string, candidateId: string): ElectionResult {
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بإعلان الفائز");
  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود");

  const dept = electionDepartment(e);
  const mine = w.candidates.filter((c) => c.electionId === electionId && c.status === "approved").map((c) => c.userId);
  const shared = w.elections.some((o) => {
    if (o.id === e.id || o.archivedAt || !LIVE_STATUSES.includes(o.status)) return false;
    if (electionDepartment(o) !== dept) return false;
    return w.candidates.some((c) => c.electionId === o.id && mine.includes(c.userId) && ACTIVE_CANDIDACY.includes(c.status));
  });
  if (shared) return no("في هذا القسم مقعدٌ آخر يخوضه أحدُ مرشّحيك؛ أعلِن مقاعد القسم معًا.");

  return declareApply(w, actorId, electionId, candidateId);
}

/**
 * @db `resolve_department_election_winners(department)` — حلقةٌ لا حالتان:
 * مَن تصدّر أكثر من مقعد أخذ مفضَّله وأُقصي من الباقي فيرتقي التالي، **وقد يتصدّر التالي مقعدًا
 * آخر فتُعاد الكرّة**؛ ثمّ يُعلَن بترتيب الحسم (المحتفَظ به أوّلًا) كي يصحّ الوصيف.
 */
export function resolveDepartmentWinners(w: SimWorld, actorId: string, departmentId: number): ElectionResult {
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بإعلان الفائز");

  const seatRank = (role: ElectedRole) => (role === "department_head" ? 1 : role === "committee_leader" ? 2 : 3);
  type Row = { electionId: string; candId: string; userId: string; pref: number; num: number; weight: number; seatRank: number; dropped: boolean };

  const rows: Row[] = [];
  for (const e of w.elections) {
    if (e.status !== "voting_closed" || e.archivedAt || e.winnerCandidateId) continue;
    if (electionDepartment(e) !== departmentId) continue;
    for (const c of w.candidates.filter((x) => x.electionId === e.id && x.status === "approved")) {
      rows.push({
        electionId: e.id, candId: c.id, userId: c.userId, pref: c.preferenceRank ?? 2,
        num: c.number, weight: candidateWeight(w, c.id), seatRank: seatRank(e.targetRoleName), dropped: false,
      });
    }
  }
  const seats = [...new Set(rows.map((r) => r.electionId))];
  if (!seats.length) return no("لا مقاعدَ جاهزةً للإعلان في هذا القسم (أغلِق التصويت أوّلًا).");

  const users = new Set(rows.map((r) => r.userId));
  const blocked = w.elections.some((e) => {
    if (e.archivedAt) return false;
    if (!["candidacy_open", "candidacy_closed", "voting_open"].includes(e.status)) return false;
    if (electionDepartment(e) !== departmentId) return false;
    return w.candidates.some((c) => c.electionId === e.id && users.has(c.userId) && ACTIVE_CANDIDACY.includes(c.status));
  });
  if (blocked) return no("مقعدٌ آخر في القسم لم يُغلق تصويتُه بعد، وفيه أحدُ هؤلاء المرشّحين؛ أغلِقه أوّلًا.");

  /** متصدّرُ كلّ مقعدٍ بين غير المُقصَين — بالوزن ثمّ برقم المرشّح. */
  const leaders = () => {
    const out = new Map<string, Row>();
    for (const r of rows) {
      if (r.dropped) continue;
      const cur = out.get(r.electionId);
      if (!cur || r.weight > cur.weight || (r.weight === cur.weight && r.num < cur.num)) out.set(r.electionId, r);
    }
    return out;
  };

  const order: string[] = [];
  let shared = false;
  for (let guard = 0; guard < 64; guard++) {
    const top = leaders();
    const bySeatCount = new Map<string, Row[]>();
    for (const r of top.values()) bySeatCount.set(r.userId, [...(bySeatCount.get(r.userId) ?? []), r]);
    const conflict = [...bySeatCount.entries()].find(([, list]) => list.length > 1);
    if (!conflict) break;
    shared = true;
    const [userId, list] = conflict;
    const keep = [...list].sort((a, b) => a.pref - b.pref || a.seatRank - b.seatRank)[0];
    for (const r of rows) if (r.userId === userId && r.electionId !== keep.electionId) r.dropped = true;
    order.push(keep.electionId);
  }
  for (const s of seats) if (!order.includes(s)) order.push(s);

  const declared: string[] = [];
  for (const electionId of order) {
    const top = leaders().get(electionId);
    if (!top) continue;
    const r = declareApply(w, actorId, electionId, top.candId);
    if (!r.ok) return no(r.message);
    declared.push(electionId);
  }
  if (!declared.length) return no("لا مقاعدَ جاهزةً للإعلان في هذا القسم (أغلِق التصويت أوّلًا).");
  return ok(shared ? "أُعلن فائزو القسم وأُسنِدت مناصبهم (حُسم مَن تصدّر مقعدين بمفضَّله)." : "أُعلن فائزو القسم وأُسنِدت مناصبهم.");
}

/** @db `appoint_to_seat` — إسنادٌ عاديٌّ بلا مدّة، ثمّ يُوقَف الانتخاب بسببٍ مسجَّل. */
export function appointToSeat(w: SimWorld, actorId: string, electionId: string, userId: string, reason: string): ElectionResult {
  if (!userId) return no("اختر العضو المكلَّف.");
  if (!reason?.trim() || reason.trim().length < 10) return no("اكتب سبب التكليف (١٠ أحرف على الأقلّ).");
  if (!isElectionAdmin(w, actorId)) return no("غير مصرح بالتكليف على هذا المقعد");

  const e = w.elections.find((x) => x.id === electionId);
  if (!e) return no("الانتخاب غير موجود");
  if (e.status === "completed") return no("هذا الانتخاب اكتمل بفائزٍ معلَن");
  if (e.status === "voting_open") return no("لا تُكلِّف والتصويتُ جارٍ؛ أغلِق التصويت أوّلًا");
  const m = memberIn(w, userId);
  if (!m) return no("العضو غير موجود");

  assignPosition(w, userId, e.targetRoleName, e.targetCommitteeId, e.targetDepartmentId, `تكليف على مقعدٍ تعثّر انتخابُه (${electionId}) : ${reason.trim()}`);
  writeLog(w, electionId, actorId, "seat_appointed", { user_id: userId, reason: reason.trim() });
  if (e.status !== "cancelled") applyCancel(w, actorId, e, `كُلّف شاغلٌ للمقعد : ${reason.trim()}`, "cancelled");
  notify(w, "election_voters", "كُلّف شاغلٌ للمقعد", `كُلّف ${m.name} بـ${targetLabel(e)} بعد تعثّر الانتخاب.`);
  return ok("كُلّف العضو وأُسنِد المنصب، وأُوقف الانتخاب.");
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

  for (const e of w.elections) {
    if (e.status !== "candidacy_open" || e.archivedAt || e.stalledAt) continue;
    if (e.candidacyEnd === null || e.candidacyEnd >= w.now) continue;
    const count = countActive(w, e.id);
    if (count === 0) {
      e.stalledAt = w.now;
      writeLog(w, e.id, null, "candidacy_stalled", { active_count: 0 });
      notify(w, "election_admins", "انتخابٌ بلا مرشّحين ينتظر قرارك",
        `انتهت مهلةُ الترشّح لـ ${targetLabel(e)} ولم يتقدّم أحد. الانتخابُ واقفٌ حتّى تختار: تمديدُ المهلة، أو تكليفُ شاغل، أو إلغاءٌ بسبب.`, "warning");
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
    writeLog(w, e.id, null, "status_transition", { new_status: "voting_closed", auto: true });
    closedVoting += 1;
    if (!finalizeConfidence(w, null, e.id)) {
      notify(w, "election_participants", "انتهى التصويت تلقائياً", `انتهت فترة التصويت لـ ${targetLabel(e)}. بانتظار إعلان الفائز.`);
    }
  }

  if (closedCandidacy + stalled + closedVoting > 0) {
    writeLog(w, null, null, "sweep_deadlines", { closed_candidacy: closedCandidacy, stalled_candidacy: stalled, closed_voting: closedVoting });
  }
  return { closedCandidacy, stalled, closedVoting };
}

/* ══ خياراتُ الفتح والتكليف ═════════════════════════════════════════ */

/** @db `getElectionCreateOptions` — المقعدُ شاغرٌ فعلًا ولا انتخابَ نشطٌ له. */
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
