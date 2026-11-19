"use server";

import { revalidatePath } from "next/cache";
import { getElectionManager } from "@/lib/elections/authz";
// كلُّ فعلٍ في الانتخاب يكتب سطرًا في سجلّه، والسطرُ يولّد إشعارَه في القاعدة (`election_audit_notify`، الدفعة الخامسة)،
// فيُنادى الموزِّعُ بعد كلّ فعلٍ ناجح ليصل الإشعارُ في الحال لا بعد دقيقة.
import { kickDispatch } from "@/lib/notifications/emit";
import { createClient } from "@/lib/supabase/server";
import { getAppointableMembers, getLiveCandidacies, type AppointOption, type LiveCandidacy } from "./data";
import { getCurrentAdmin } from "@/lib/auth";
import { isClubPresident } from "@/lib/elections/president";
import { getCandidacyBan, type CandidacyBan } from "./member-data";
import { statementError } from "./vocab";
import { refreshStructurePage } from "@/lib/structurePage";

export type ElectionResult = { ok: boolean; message: string; id?: string };

export type CreateElectionInput = {
  roleName: string;
  committeeId?: number;
  departmentId?: number;
  /** موعد إغلاق باب الترشّح (ISO). إلزاميّ عند الفتح، بلا حدٍّ أدنى (المادتان ٨ و٢٣). */
  candidacyEndIso: string | null;
};

/**
 * تناسق المنصب مع نطاقه — يطابق elections_scope_check: منسّق القسم على مستوى القسم،
 * والقائد/النائب على مستوى اللجنة. لا نثق بالعميل؛ والقاعدة تبقى الحكَم النهائيّ.
 */
function scopeError(input: CreateElectionInput): string | null {
  if (input.roleName === "department_head") {
    if (!input.departmentId) return "اختر القسم المستهدَف.";
    if (input.committeeId) return "منسّق القسم يُنتخَب على مستوى القسم لا اللجنة.";
  } else if (input.roleName === "committee_leader" || input.roleName === "deputy_committee_leader") {
    if (!input.committeeId) return "اختر اللجنة المستهدَفة.";
    if (input.departmentId) return "هذا المقعد يُنتخَب على مستوى اللجنة لا القسم.";
  } else {
    return "منصبٌ غير قابل للانتخاب.";
  }
  return null;
}

/** رسائل أخطاء الإنشاء — قيود القاعدة وتريغراتها إلى عربيّة نظيفة. */
function mapCreateError(error: { code?: string; message?: string } | null): string {
  if (!error) return "تعذّر فتح الانتخاب.";
  if (error.code === "23505") return "يوجد انتخابٌ نشطٌ لهذا المقعد بالفعل.";
  if (error.code === "23514") return "نطاقٌ غير صالح لهذا المقعد.";
  // تريغرات النظام ترفع رسائل عربيّة من عندنا (منصب مشغول)
  if (error.code === "P0001" && error.message) return error.message;
  return "تعذّر فتح الانتخاب. تحقّق من أنّ المقعد فارغٌ ولا انتخاب نشط له.";
}

/**
 * فتح انتخابٍ جديد لمنصبٍ منتخَب، بدالّة القاعدة `open_election` بعميل الجلسة: حارسها من يدير
 * الانتخاب (المديرون الثلاثة، ومشرف اللجنة لقيادتها ونيابتها)، وتقيّد الفتح في السجلّ (المادة ٦).
 * وتريغرات القاعدة تفرض فراغ المقعد وتفرّده ونطاقه. يبدأ candidacy_open.
 * والتداخل مسموح: مقعدُ القسم ومقاعدُ لجانه تُفتح معًا.
 *
 * وموعدُ إغلاق الترشّح يُكتب في `candidacy_end`، فتتولّاه كنّاسةُ القاعدة
 * (`sweep_election_deadlines` كلّ دقيقة): تُغلق الباب إن كان فيه مرشّحٌ واحدٌ فأكثر
 * (والواحدُ يمضي تزكيةً)، وإن كان فارغًا أوقفت الانتخاب ينتظر قرار المشرف.
 */
export async function createElection(input: CreateElectionInput): Promise<ElectionResult> {
  const invalid = scopeError(input);
  if (invalid) return { ok: false, message: invalid };

  const end = input.candidacyEndIso?.trim() || null;
  if (!end) return { ok: false, message: "اختر موعد إغلاق باب الترشّح." };
  const t = new Date(end).getTime();
  if (Number.isNaN(t)) return { ok: false, message: "موعد إغلاق الترشّح غير صالح." };
  if (t <= Date.now()) return { ok: false, message: "اختر موعد إغلاق ترشّحٍ في المستقبل." };

  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { data, error } = await sb.rpc("open_election", {
    p_role: input.roleName,
    p_committee: input.committeeId ?? null,
    p_department: input.departmentId ?? null,
    p_candidacy_end: end,
  });
  if (error || !data) return { ok: false, message: error?.code === "42501" ? rpcMessage(error, "لا تملك فتح هذا الانتخاب.") : mapCreateError(error) };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "فُتح باب الترشّح للانتخاب.", id: data as string };
}

/* ══ أفعال الدورة والمراجعة — عبر دوالّ القاعدة بسياق المستخدم ═══════════ */
//
// حرِج: دوالّ الانتخابات تُصرّح بـ auth.uid() داخليًّا (has_election_admin_permission).
// فتُستدعى بعميل *الجلسة* (كوكيز المستخدم) لا الخدمة — وإلّا auth.uid()=NULL فتُرفض.
// الصلاحيّة تُفرَض قدراتيًّا في القاعدة نفسها (manage_elections)، فلا تكرار للحارس هنا.

/** رسالة خطأ الدالّة — تُعرض العربيّة من عندنا كما هي، وإلّا احتياطيّ نظيف. */
function rpcMessage(error: { message?: string } | null, fallback: string): string {
  const m = error?.message?.trim();
  return m && /[؀-ۿ]/.test(m) ? m : fallback;
}

async function userClient() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  return user ? session : null;
}

/** مراجعة مرشّح: اعتماد/رفض/طلب تعديل. السبب إلزاميّ للرفض وطلب التعديل (تفرضه القاعدة). */
/** أسباب الاعتذار الثلاثة (المادة ١٤)، وتطابق قيد القاعدة `election_candidates_reject_reason_check`. */
export type RejectReason = "ineligible" | "statement_violation" | "unrelated";

/**
 * مراجعة الترشّح (المادة ١٤): الاعتماد، أو طلب التعديل بمهلةٍ يحدّدها المراجع بلا حدٍّ أدنى،
 * أو الاعتذار بسببٍ من الثلاثة. والقاعدة تفرض المهلة والسبب، فرسالتها تُعرض كما هي.
 */
export async function reviewCandidate(
  candidateId: string,
  newStatus: "approved" | "rejected" | "needs_edit",
  note?: string,
  opts: { editDueIso?: string | null; rejectReason?: RejectReason | null } = {},
): Promise<ElectionResult> {
  if ((newStatus === "rejected" || newStatus === "needs_edit") && !note?.trim()) {
    return { ok: false, message: "اكتب سبب الاعتذار أو التعديل." };
  }
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("review_candidate", {
    p_candidate: candidateId,
    p_new_status: newStatus,
    p_note_ar: note?.trim() || null,
    p_edit_due: newStatus === "needs_edit" ? opts.editDueIso?.trim() || null : null,
    p_reject_reason: newStatus === "rejected" ? opts.rejectReason ?? null : null,
  });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّرت مراجعة المرشّح.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  const done = newStatus === "approved" ? "اعتُمد المرشّح." : newStatus === "rejected" ? "اعتُذر عن الترشّح." : "طُلب تعديل الترشّح بمهلته.";
  return { ok: true, message: done };
}

/**
 * إرجاعُ مرشّحٍ سحب ترشّحه — يعود «قيد المراجعة» لا معتمَدًا (اختيار المالك ٢٠٢٦-٠٨-١٤):
 * الرجعةُ تُعيده إلى الصفّ، والاعتمادُ قرارٌ يُتّخذ بعدها ويُوقَّع باسم صاحبه.
 *
 * وحارسُه في القاعدة لا هنا: قانونُ الانتقال (`enforce_candidate_status_transition`) يشترط
 * مشرفًا وطورَ ترشّحٍ لكلّ رجعة، فلا يفتح هذا الفعلُ بابًا يُغلقه القانون.
 */
/**
 * أساس الإرجاع (المادة ١٥): المنسحبُ بطلبه أو لخطأ في انسحابه، والمعتذَرُ عنه لخطأ في الاعتذار.
 * ويُكتب معه سببٌ يُقيَّد في السجلّ.
 */
export type RestoreBasis = "candidate_request" | "withdrawal_error" | "review_error";

export async function restoreCandidacy(candidateId: string, basis?: RestoreBasis, reason?: string): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("restore_candidacy", { p_candidate: candidateId, p_basis: basis ?? null, p_note: reason?.trim() || null });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر إرجاع المرشّح.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "أُعيد المرشّح إلى المراجعة، وأُبلِغ بذلك." };
}

/**
 * انتقال حالةٍ صرف: إغلاق الترشّح قبل موعده، وإعادة فتحه، وإغلاق التصويت قبل موعده.
 * والثلاثة بسببٍ مكتوب يُقيَّد ويُبلَّغ به الناخبون، وإعادة الفتح بموعدٍ جديد (المادة ٢٣).
 * والقاعدة هي التي تفرض السبب والموعد، فرسالتها تُعرض كما هي.
 */
export async function transitionElection(
  electionId: string,
  newStatus: "candidacy_open" | "candidacy_closed" | "voting_closed",
  opts: { reason?: string; candidacyEndIso?: string | null } = {},
): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("transition_election", {
    p_election: electionId,
    p_new_status: newStatus,
    p_reason: opts.reason?.trim() || null,
    p_candidacy_end: opts.candidacyEndIso?.trim() || null,
  });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر تغيير حالة الانتخاب.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return {
    ok: true,
    message: newStatus === "candidacy_open"
      ? "أُعيد فتح باب الترشّح بموعده الجديد."
      : "تمّ.",
  };
}

/**
 * تعديل موعد إغلاق الباب المفتوح، ترشّحًا أو تصويتًا، تأخيرًا أو تقديمًا، بسببٍ مكتوب يُقيَّد
 * ويُبلَّغ به ناخبو المقعد (المادة ٢٣). ولا يُرفع الموعد: لكلّ بابٍ مفتوح موعد. وفي المقعد
 * المتعثّر بلا ترشّح، الموعدُ الجديد هو إعادة فتح الباب (المادة ٢٥).
 * بدالّة القاعدة `set_election_deadline` بعميل الجلسة، وهي التي تقرأ الحالة وتحرس.
 */
export async function setDeadline(electionId: string, iso: string | null, reason?: string): Promise<ElectionResult> {
  const when = iso?.trim() || null;
  if (!when) return { ok: false, message: "اختر الموعد الجديد." };
  const t = new Date(when).getTime();
  if (Number.isNaN(t)) return { ok: false, message: "موعدٌ غير صالح." };
  if (t <= Date.now()) return { ok: false, message: "اختر موعدًا في المستقبل." };

  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("set_election_deadline", { p_election: electionId, p_end: when, p_reason: reason?.trim() || null });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر تعديل الموعد.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "عُدّل موعد الإغلاق، وقُيّد سببه." };
}

/** فتح التصويت — يستلزم موعد إغلاقٍ مستقبليّ (الحمل الزائد ثلاثيّ الوسائط). */
export async function openVoting(electionId: string, votingEndIso: string): Promise<ElectionResult> {
  if (!votingEndIso || new Date(votingEndIso).getTime() <= Date.now()) {
    return { ok: false, message: "اختر موعد إغلاق تصويتٍ في المستقبل." };
  }
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("transition_election", { p_election: electionId, p_new_status: "voting_open", p_voting_end: votingEndIso });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر فتح التصويت. تأكّد من اعتماد مرشّحٍ واحدٍ على الأقلّ ومن مراجعة الباقين.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "فُتح باب التصويت." };
}

/** أعضاءُ نطاق المقعد — تُحمَّل عند فتح نافذة التكليف (الحارس قدراتيّ قبل القراءة). */
/**
 * ترشّحاتُ عضوٍ القائمة، لسؤال «أهذا النقلُ بطلبه؟» قبل إسناد منصبه أو إزالته أو نقله في دفعة (المادة 2).
 * لمن يملك تعيين المناصب (مفتاحا نافذة الهيكلة نفسُهما)، والحكمُ بعده في القاعدة (`p_on_request`).
 */
export async function loadLiveCandidacies(userId: string): Promise<{ items: LiveCandidacy[]; error: string | null }> {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.caps.some((c) => c === "assign_positions" || c === "assign_unit_members")) {
    return { items: [], error: "لا تملك صلاحية إدارة الهيكلة." };
  }
  return getLiveCandidacies(userId);
}

export async function loadAppointOptions(electionId: string): Promise<{ members: AppointOption[]; error: string | null }> {
  const mgr = await getElectionManager();
  if (!mgr) return { members: [], error: "لا تملك صلاحية إدارة الانتخابات." };
  return getAppointableMembers(electionId);
}

/**
 * بابُ التكليف على مقعدٍ تعثّر انتخابُه — **تكليفٌ حقيقيّ** منذ 20261010 (الخيار أ من قرارات محمد):
 * بآخر يومٍ وخيار التجميد، عبر `appoint_to_seat` الخماسيّ (`assign_acting` داخلها). ولا يُلغي التكليفُ
 * الانتخابَ (نظام الانتخابات، المادة 8): يمضي بإعادة فتحه أو إلغائه بقرارٍ مستقلّ (المادة 25).
 * وينتهي التكليف بتاريخه، أو بإعلان فائز المقعد أيّهما أسبق.
 */
export async function appointToSeat(electionId: string, userId: string, reason: string, until?: string | null, freeze?: boolean): Promise<ElectionResult> {
  if (!userId) return { ok: false, message: "اختر العضو المكلَّف." };
  if (!reason?.trim() || reason.trim().length < 10) return { ok: false, message: "اكتب سبب التكليف (10 أحرف على الأقلّ)." };
  if (!until) return { ok: false, message: "حدِّد آخر يومٍ في التكليف." };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("appoint_to_seat", {
    p_election: electionId, p_user: userId, p_reason: reason.trim(), p_until: until, p_freeze: !!freeze,
  });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر التكليف على هذا المقعد.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  revalidatePath("/dashboard/unit", "layout");
  revalidatePath("/dashboard/members/assignments");
  refreshStructurePage();
  return { ok: true, message: "كُلّف العضو، وبقي الانتخاب على حاله: أعِد فتح بابه أو ألغِه." };
}

/**
 * الإعلان باليد سقط: تُعلن المنصّة الفائز آليًّا لحظة إغلاق التصويت، ولا يُعلنه أحد بيده (نظام
 * الانتخابات، المادة 28؛ الدفعة الثالثة، 2026-11-16). يبقى البابان إلى أن تُنقل الشاشات (الخطوة
 * الخامسة) فتسقط أزرارهما، ولا يبلغان القاعدة: دالّتاهما حُذفتا منها.
 */
export async function declareWinner(_electionId: string, _candidateId: string): Promise<ElectionResult> {
  void _electionId; void _candidateId;
  return { ok: false, message: "تُعلن المنصّة الفائز آليًّا لحظة إغلاق التصويت، ولا يُعلن باليد (المادة 28)." };
}

export async function resolveDepartmentWinners(_departmentId: number): Promise<ElectionResult> {
  void _departmentId;
  return { ok: false, message: "تُحسم مقاعد القسم آليًّا حين يُغلق تصويت آخرها (المادة 27)." };
}

/**
 * التعيين على مقعدٍ تعثّر انتخابه، أو أُلغي لتعثّره: يُسند المقعد دائمًا ويكتمل به الانتخاب «بالتعيين»
 * (نظام الانتخابات، المادة 25). للمديرين الثلاثة وحدهم، وتحرسه `appoint_seat_holder`.
 */
export async function appointSeatHolder(electionId: string, userId: string, reason: string): Promise<ElectionResult> {
  if (!userId) return { ok: false, message: "اختر العضو." };
  if (!reason?.trim() || reason.trim().length < 10) return { ok: false, message: "اكتب سبب التعيين (10 أحرف على الأقلّ)." };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("appoint_seat_holder", { p_election: electionId, p_user: userId, p_reason: reason.trim() });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر التعيين على هذا المقعد.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  revalidatePath("/dashboard/unit", "layout");
  refreshStructurePage();
  return { ok: true, message: "عُيّن العضو، واكتمل الانتخاب بالتعيين." };
}

/**
 * اختيار عضو المجلس الإداري في التعادل: مرشّحٌ من المتعادلين، أو `null` يترك الاختيار للأسبق ترشّحًا،
 * بسببٍ مكتوب لا يُعدَّل (نظام الانتخابات، المادة 26). والحسم في القاعدة (`choose_in_tie`).
 */
export async function chooseInTie(tieId: number, candidateId: string | null, reason: string): Promise<ElectionResult> {
  if (!reason?.trim() || reason.trim().length < 10) return { ok: false, message: "اكتب سبب اختيارك (10 أحرف على الأقلّ)." };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("choose_in_tie", { p_tie: tieId, p_candidate: candidateId, p_reason: reason.trim() });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر إرسال اختيارك.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  refreshStructurePage();
  return { ok: true, message: "أُرسل اختيارك." };
}

/**
 * إلغاء انتخاب — بسببٍ يُحفظ؛ يُبقي المرشّحين والأصوات (لا حذف). وبعد فتح التصويت لا يُلغى إلا
 * لتعثّره (`stalled`) أو لخللٍ يمسّ صحّته يُسمّى في السبب (`defect`) (نظام الانتخابات، المادة 29).
 */
export async function cancelElection(electionId: string, reason: string, basis?: "stalled" | "defect"): Promise<ElectionResult> {
  if (!reason?.trim()) return { ok: false, message: "اكتب سبب الإلغاء." };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("cancel_election", { p_election: electionId, p_reason: reason.trim(), p_basis: basis ?? null });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر إلغاء الانتخاب.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "أُلغي الانتخاب." };
}

/**
 * إعادة فتح التصويت بعد بطلان أصوات (المادة 16): لمن بطل صوته وحده إن انتهى ترشّحٌ بعد الإغلاق، أو للناخبين
 * كلّهم تزكيةً إن لم يبقَ إلا مرشّحٌ واحد. والقاعدةُ تعرف أيّهما من `revote_pending`، فيكفي الموعدُ والسبب.
 */
export async function openRevote(electionId: string, votingEndIso: string, reason: string): Promise<ElectionResult> {
  if (!reason?.trim() || reason.trim().length < 10) return { ok: false, message: "اكتب سبب إعادة التصويت (10 أحرف على الأقلّ)." };
  if (!votingEndIso || Number.isNaN(Date.parse(votingEndIso))) return { ok: false, message: "اختر موعد إغلاق إعادة التصويت." };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("open_revote", { p_election: electionId, p_end: votingEndIso, p_reason: reason.trim() });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر فتح إعادة التصويت.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "أُعيد فتح التصويت، وأُبلغ المصوّتون." };
}

/**
 * الحرمان من الترشّح (المادة 11): لرئيس أدِيب وحده، بسببٍ مكتوب، وأجلٍ من اليوم إلى سنةٍ على الأكثر (`YYYY-MM-DD`).
 * ينهي ترشّحات المحروم القائمة ما لم يُفتح تصويتها، ويُبلَّغ به. والحكمُ كلُّه في القاعدة (`ban_from_candidacy`).
 */
export async function banFromCandidacy(userId: string, reason: string, untilDate: string): Promise<ElectionResult> {
  if (!reason?.trim() || reason.trim().length < 10) return { ok: false, message: "اكتب سبب الحرمان (10 أحرف على الأقلّ)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(untilDate ?? "")) return { ok: false, message: "اختر آخر يومٍ في الحرمان." };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { data, error } = await sb.rpc("ban_from_candidacy", { p_user: userId, p_reason: reason.trim(), p_until: untilDate });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر الحرمان.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "حُرم العضو من الترشّح، وأُبلغ بذلك.", id: String(data) };
}

/** رفع الحرمان (المادة 11): لرئيس أدِيب وحده، بسببٍ مكتوب. */
/** الحرمانُ القائمُ على عضو، لنافذة رئيس أدِيب في «أعضاء أدِيب» (المادة ١١؛ الهويّة ٢٠٢٦-١١-١٧). لرئيس أدِيب وحده. */
export async function loadCandidacyBan(userId: string): Promise<{ ban: CandidacyBan | null; error: string | null }> {
  const admin = await getCurrentAdmin();
  if (!admin || !(await isClubPresident(admin.id))) return { ban: null, error: "الحرمان من الترشّح لرئيس أدِيب وحده." };
  return getCandidacyBan(userId);
}

export async function liftCandidacyBan(banId: number, reason: string): Promise<ElectionResult> {
  if (!reason?.trim() || reason.trim().length < 10) return { ok: false, message: "اكتب سبب رفع الحرمان (10 أحرف على الأقلّ)." };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("lift_candidacy_ban", { p_ban: banId, p_reason: reason.trim() });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر رفع الحرمان.") };

  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "رُفع الحرمان، وأُبلغ العضو." };
}

/* ══ وجه العضو: ترشّح · تصويت · سحب (بعميل الجلسة — auth.uid()=العضو) ═══ */

/** بيانات ملفّ الترشّح الاختياريّ — رُفع سلفًا إلى دلو election-files، ويُمرَّر مساره. */
export type CandidacyFile = { url: string; name: string; size: number | null; mime: string | null } | null;

const fileArgs = (f: CandidacyFile) => ({
  p_file_url: f?.url ?? null, p_file_name: f?.name ?? null, p_file_size_bytes: f?.size ?? null, p_file_mime: f?.mime ?? null,
});

/** ترشّح العضو ببيانٍ عربيّ (١٠٠–٤٠٠٠) وملفٍّ اختياريّ. والمرشّحُ يُعرَض باسمه (٢٠٢٦-١١-٠٧). */
export async function submitCandidacy(electionId: string, statement: string, file: CandidacyFile = null): Promise<ElectionResult> {
  const s = statement?.trim() ?? "";
  const bad = statementError(s);
  if (bad) return { ok: false, message: bad };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("submit_candidacy", { p_election: electionId, p_statement_ar: s, ...fileArgs(file) });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر إرسال الترشّح. تأكّد من أهليّتك وأنّ الترشّح مفتوح.") };
  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "أُرسل ترشّحك، وهو الآن قيد المراجعة." };
}

/** تعديل/إعادة ترشّحٍ قائم (بعد «طلب تعديل» أو أثناء المراجعة) — يعود قيد المراجعة. */
export async function resubmitCandidacy(candidateId: string, statement: string, file: CandidacyFile = null): Promise<ElectionResult> {
  const s = statement?.trim() ?? "";
  const bad = statementError(s);
  if (bad) return { ok: false, message: bad };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("resubmit_candidacy", { p_candidate: candidateId, p_statement_ar: s, ...fileArgs(file) });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر حفظ التعديل.") };
  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "حُفظ تعديل ترشّحك، وهو الآن قيد المراجعة." };
}

/**
 * تصويت العضو لمرشّحٍ مُعَمّى — سرّيّ ونهائيّ، صوتٌ واحد.
 * وحين يكون المرشّح وحيدًا يصير الصوتُ رأيًا فيه: تأييدٌ أو اعتراض (تزكية).
 *
 * **وكلُّ بطاقةٍ تقع على مرشّح** (قرار المالك ٢٠٢٦-٠٨-١٥): نُزع الامتناعُ فلم تبقَ ورقةٌ
 * تُختم فارغةً، ومن ترشّح وحدَه لا يُسأل عن نفسه فأُسقطت أهليّتُه للصوت في مقعده.
 */
export async function castVote(electionId: string, candidateId: string, choice: "approve" | "reject" = "approve"): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("cast_vote", { p_election: electionId, p_candidate: candidateId, p_choice: choice });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر تسجيل صوتك. تأكّد من أنّ التصويت مفتوحٌ ولم تصوّت بعد.") };
  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: choice === "reject" ? "سُجِّل اعتراضك، شكرًا لمشاركتك." : "سُجِّل صوتك، شكرًا لمشاركتك." };
}

/** سحب الترشّح — نهائيّ في هذه الدورة. */
export async function withdrawCandidacy(candidateId: string): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("withdraw_candidacy", { p_candidate: candidateId });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر سحب الترشّح.") };
  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "سُحب ترشّحك." };
}


/* ══ التجميد والاستبعاد (المادة ١٦) ══════════════════════════════════════
   كلّها بعميل الجلسة، وحرّاسها في القاعدة: الطلبُ لعضو الموارد أو قائدها، والموافقةُ والقرارُ
   لقائدها، والإجابةُ لصاحب الترشّح. والمهلتان نصٌّ يفهمه Postgres (مثل «6 hours»). */

/** طلب تجميد ترشّح: من عضو الموارد ينتظر موافقة القائد، ومن القائد يسري فورًا. */
export async function requestFreeze(candidateId: string, reason: string, answerWindow: string, decideWindow: string): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("request_candidacy_freeze", {
    p_candidate: candidateId, p_reason: reason.trim(), p_answer_window: answerWindow, p_decide_window: decideWindow,
  });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر طلب الاستبعاد.") };
  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "قُيّد طلب الاستبعاد." };
}

/** موافقة القائد على طلب التجميد أو ردّه بسبب. */
export async function approveFreeze(freezeId: number, approve: boolean, reason?: string): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("approve_candidacy_freeze", { p_freeze: freezeId, p_approve: approve, p_reason: reason?.trim() || null });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر حسم طلب الاستبعاد.") };
  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: approve ? "أُمهل المرشّح ليُجيب، وبدأت مهلته." : "رُدّ طلب الاستبعاد." };
}

/** إجابة المرشّح المجمَّد في مهلته. */
export async function answerFreeze(freezeId: number, text: string): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("answer_candidacy_freeze", { p_freeze: freezeId, p_text: text.trim() });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر إرسال إجابتك.") };
  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: "وصلت إجابتك إلى إدارة الموارد البشرية." };
}

/** قرار القائد: رفع التجميد، أو الاستبعاد بعد الإجابة. */
export async function decideFreeze(freezeId: number, outcome: "lift" | "exclude", reason: string): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("decide_candidacy_freeze", { p_freeze: freezeId, p_outcome: outcome, p_reason: reason.trim() });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر حسم الاستبعاد.") };
  revalidatePath("/dashboard/elections", "layout");
  kickDispatch();
  return { ok: true, message: outcome === "lift" ? "بقي الترشّح." : "استُبعد المرشّح." };
}

/* ══ السجلّ ═══════════════════════════════════════════════════════════
   لا فعلَ هنا للسجلّ: يُقرأ مع الصفحة نفسِها (`getElectionLog` في data.ts) لا بندائين،
   وشاشةُ المرشّح تنخل منه أحداثَه — مصدرٌ واحد يُجلَب مرّة، وتذييلُه توقيعُ صاحبه. */
