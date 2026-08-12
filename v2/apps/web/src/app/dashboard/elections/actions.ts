"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getElectionManager } from "@/lib/elections/authz";
import { createClient } from "@/lib/supabase/server";
import type { BallotCandidate } from "./member-data";
import { statementError } from "./vocab";

export type ElectionResult = { ok: boolean; message: string; id?: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export type CreateElectionInput = {
  roleName: string;
  committeeId?: number;
  departmentId?: number;
  /** موعد إغلاق باب الترشّح (ISO) — اختياريّ؛ فارغُه بابٌ يُغلق بيد المشرف. */
  candidacyEndIso?: string | null;
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
    if (input.departmentId) return "هذا المنصب يُنتخَب على مستوى اللجنة لا القسم.";
  } else {
    return "منصبٌ غير قابل للانتخاب.";
  }
  return null;
}

/** رسائل أخطاء الإنشاء — قيود القاعدة وتريغراتها إلى عربيّة نظيفة. */
function mapCreateError(error: { code?: string; message?: string } | null): string {
  if (!error) return "تعذّر فتح الانتخاب.";
  if (error.code === "23505") return "يوجد انتخابٌ نشطٌ لهذا المنصب بالفعل.";
  if (error.code === "23514") return "نطاقٌ غير صالح لهذا المنصب.";
  // تريغرات النظام ترفع رسائل عربيّة من عندنا (منصب مشغول)
  if (error.code === "P0001" && error.message) return error.message;
  return "تعذّر فتح الانتخاب. تحقّق من أنّ المنصب شاغرٌ ولا انتخاب نشط له.";
}

/**
 * فتح انتخابٍ جديد لمنصبٍ منتخَب. الحارس قدراتيّ (manage_elections)، والإدراج عبر
 * الخدمة؛ وتريغرات القاعدة تفرض الشغور وتفرّد المقعد والنطاق. يبدأ candidacy_open.
 * والتداخل مسموح: مقعدُ القسم ومقاعدُ لجانه تُفتح معًا.
 *
 * وموعدُ إغلاق الترشّح يُكتب في `candidacy_end`، فتتولّاه كنّاسةُ القاعدة
 * (`sweep_election_deadlines` كلّ دقيقة): تُغلق الباب، أو تمدّه 24 ساعة مرّةً
 * واحدة إن قلّ المرشّحون عن اثنين، ثمّ تُلغي الانتخاب إن بقي الحال.
 */
export async function createElection(input: CreateElectionInput): Promise<ElectionResult> {
  const mgr = await getElectionManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الانتخابات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const invalid = scopeError(input);
  if (invalid) return { ok: false, message: invalid };

  const end = input.candidacyEndIso?.trim() || null;
  if (end) {
    const t = new Date(end).getTime();
    if (Number.isNaN(t)) return { ok: false, message: "موعد إغلاق الترشّح غير صالح." };
    if (t <= Date.now()) return { ok: false, message: "اختر موعد إغلاق ترشّحٍ في المستقبل." };
  }

  const { data, error } = await sb
    .from("elections")
    .insert({
      target_role_name: input.roleName,
      target_committee_id: input.committeeId ?? null,
      target_department_id: input.departmentId ?? null,
      candidacy_end: end,
      created_by: mgr.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: mapCreateError(error) };

  revalidatePath("/dashboard/elections", "layout");
  return { ok: true, message: "فُتح باب الترشّح للانتخاب.", id: data.id };
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
export async function reviewCandidate(
  candidateId: string,
  newStatus: "approved" | "rejected" | "needs_edit",
  note?: string,
): Promise<ElectionResult> {
  if ((newStatus === "rejected" || newStatus === "needs_edit") && !note?.trim()) {
    return { ok: false, message: "اكتب سبب الرفض أو التعديل." };
  }
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("review_candidate", { p_candidate: candidateId, p_new_status: newStatus, p_note_ar: note?.trim() || null });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّرت مراجعة المرشّح.") };

  revalidatePath("/dashboard/elections", "layout");
  const done = newStatus === "approved" ? "اعتُمد المرشّح." : newStatus === "rejected" ? "رُفض المرشّح." : "طُلب تعديل الترشّح.";
  return { ok: true, message: done };
}

/**
 * انتقال حالةٍ صرف (إغلاق الترشّح · إعادة فتحه · إغلاق التصويت).
 * وإعادةُ الفتح ترفع موعدَ الإغلاق في القاعدة نفسها، وإلّا التقطته الكنّاسة بعد دقيقة فأغلقه ثانيةً.
 */
export async function transitionElection(electionId: string, newStatus: "candidacy_open" | "candidacy_closed" | "voting_closed"): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("transition_election", { p_election: electionId, p_new_status: newStatus });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر تغيير حالة الانتخاب.") };

  revalidatePath("/dashboard/elections", "layout");
  return {
    ok: true,
    message: newStatus === "candidacy_open"
      ? "أُعيد فتح الترشّح، ورُفع موعد الإغلاق فيُغلق بيدك أو بموعدٍ جديد تضربه."
      : "تمّ.",
  };
}

/**
 * ضبط موعد الإغلاق التلقائيّ للطور المفتوح : بابٌ واحد لموعدَي الترشّح والتصويت،
 * والحالةُ الجارية تقول أيّ عمودٍ يُكتب. و`null` يرفع الموعد فيعود الإغلاق بيد المشرف.
 * الحالة تُقرأ من القاعدة لا من العميل، والكنّاسة (كلّ دقيقة) هي التي تُنفّذ الموعد.
 */
export async function setDeadline(electionId: string, iso: string | null): Promise<ElectionResult> {
  const mgr = await getElectionManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الانتخابات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const when = iso?.trim() || null;
  if (when) {
    const t = new Date(when).getTime();
    if (Number.isNaN(t)) return { ok: false, message: "موعدٌ غير صالح." };
    if (t <= Date.now()) return { ok: false, message: "اختر موعدًا في المستقبل." };
  }

  const { data: row, error: readErr } = await sb.from("elections").select("status, archived_at").eq("id", electionId).maybeSingle();
  if (readErr) return { ok: false, message: readErr.message };
  if (!row) return { ok: false, message: "الانتخاب غير موجود." };
  if (row.archived_at) return { ok: false, message: "الانتخاب مؤرشف." };

  const column = row.status === "candidacy_open" ? "candidacy_end"
    : row.status === "voting_open" ? "voting_end"
      : null;
  if (!column) return { ok: false, message: "لا موعدَ إلّا لبابٍ مفتوح (ترشّحًا أو تصويتًا)." };

  const { error } = await sb.from("elections").update({ [column]: when }).eq("id", electionId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/elections", "layout");
  const phase = column === "candidacy_end" ? "الترشّح" : "التصويت";
  return { ok: true, message: when ? `ضُبط موعد إغلاق ${phase}.` : `رُفع موعد إغلاق ${phase}، فيُغلق بيدك.` };
}

/** فتح التصويت — يستلزم موعد إغلاقٍ مستقبليّ (الحمل الزائد ثلاثيّ الوسائط). */
export async function openVoting(electionId: string, votingEndIso: string): Promise<ElectionResult> {
  if (!votingEndIso || new Date(votingEndIso).getTime() <= Date.now()) {
    return { ok: false, message: "اختر موعد إغلاق تصويتٍ في المستقبل." };
  }
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("transition_election", { p_election: electionId, p_new_status: "voting_open", p_voting_end: votingEndIso });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر فتح التصويت. تأكّد من اعتماد مرشّحَين على الأقلّ.") };

  revalidatePath("/dashboard/elections", "layout");
  return { ok: true, message: "فُتح باب التصويت." };
}

/** إعلان الفائز — القاعدة تفرض أن يكون الأعلى وزنًا، وتُسنِد المنصب عبر assign_position. */
export async function declareWinner(electionId: string, candidateId: string): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("declare_winner", { p_election: electionId, p_candidate: candidateId });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر إعلان الفائز.") };

  revalidatePath("/dashboard/elections", "layout");
  return { ok: true, message: "أُعلن الفائز وأُسنِد المنصب." };
}

/**
 * حسمُ مقاعد القسم معًا (تنسيقُه وقيادةُ لجانه ونيابتُها): إن تصدّر شخصٌ أكثر من مقعد أخذ
 * مفضّله وذهب الباقي للوصيف. القاعدة (`resolve_department_election_winners`) تتولّى الترتيب والإسناد.
 */
export async function resolveDepartmentWinners(departmentId: number): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("resolve_department_election_winners", { p_department: departmentId });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر إعلان فائزي القسم.") };

  revalidatePath("/dashboard/elections", "layout");
  return { ok: true, message: "أُعلن فائزو القسم وأُسنِدت مناصبهم." };
}

/** إلغاء انتخاب — بسببٍ يُحفظ؛ يُبقي المرشّحين والأصوات (لا حذف). */
export async function cancelElection(electionId: string, reason: string): Promise<ElectionResult> {
  if (!reason?.trim()) return { ok: false, message: "اكتب سبب الإلغاء." };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("cancel_election", { p_election: electionId, p_reason: reason.trim() });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر إلغاء الانتخاب.") };

  revalidatePath("/dashboard/elections", "layout");
  return { ok: true, message: "أُلغي الانتخاب." };
}

/* ══ وجه العضو: ترشّح · تصويت · سحب (بعميل الجلسة — auth.uid()=العضو) ═══ */

/** بيانات ملفّ الترشّح الاختياريّ — رُفع سلفًا إلى دلو election-files، ويُمرَّر مساره. */
export type CandidacyFile = { url: string; name: string; size: number | null; mime: string | null } | null;

const fileArgs = (f: CandidacyFile) => ({
  p_file_url: f?.url ?? null, p_file_name: f?.name ?? null, p_file_size_bytes: f?.size ?? null, p_file_mime: f?.mime ?? null,
});

/** ترشّح العضو ببيانٍ عربيّ (١٠٠–٤٠٠٠) وملفٍّ اختياريّ. التعمية تُذكّر: لا تكتب اسمك. */
export async function submitCandidacy(electionId: string, statement: string, file: CandidacyFile = null): Promise<ElectionResult> {
  const s = statement?.trim() ?? "";
  const bad = statementError(s);
  if (bad) return { ok: false, message: bad };
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("submit_candidacy", { p_election: electionId, p_statement_ar: s, ...fileArgs(file) });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر إرسال الترشّح. تأكّد من أهليّتك وأنّ الترشّح مفتوح.") };
  revalidatePath("/dashboard/elections", "layout");
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
  return { ok: true, message: "حُفظ تعديل ترشّحك، وهو الآن قيد المراجعة." };
}

/** تصويت العضو لمرشّحٍ مُعَمّى — سرّيّ ونهائيّ، صوتٌ واحد. */
export async function castVote(electionId: string, candidateId: string): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("cast_vote", { p_election: electionId, p_candidate: candidateId });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر تسجيل صوتك. تأكّد من أنّ التصويت مفتوحٌ ولم تصوّت بعد.") };
  revalidatePath("/dashboard/elections", "layout");
  return { ok: true, message: "سُجِّل صوتك، شكرًا لمشاركتك." };
}

/** سحب الترشّح — نهائيّ في هذه الدورة. */
export async function withdrawCandidacy(candidateId: string): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { error } = await sb.rpc("withdraw_candidacy", { p_candidate: candidateId });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر سحب الترشّح.") };
  revalidatePath("/dashboard/elections", "layout");
  return { ok: true, message: "سُحب ترشّحك." };
}

/** تحميل بطاقة تصويتٍ مُعَمّاة (رقم + بيان بلا اسم) عند فتح النافذة. */
export async function loadBallot(electionId: string): Promise<{ candidates: BallotCandidate[]; error: string | null }> {
  const sb = await userClient();
  if (!sb) return { candidates: [], error: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { data, error } = await sb.rpc("get_anonymized_candidates", { p_election: electionId });
  if (error) return { candidates: [], error: rpcMessage(error, "تعذّر تحميل المرشّحين.") };
  const candidates: BallotCandidate[] = ((data ?? []) as { candidate_id: string; candidate_number: number; statement_ar: string }[])
    .map((c) => ({ id: c.candidate_id, number: c.candidate_number, statement: c.statement_ar }));
  return { candidates, error: null };
}

/* ══ السجلّ الزمنيّ لترشّح العضو ═══════════════════════════════════════ */

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
function fmtStamp(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}، ${hh}:${mm}`;
}

export type TrailEvent = { type: string; date: string; actor: string | null; status: string | null; note: string | null };

/** سجلّ أحداث ترشّحٍ (قُدّم · عُدّل · رُوجِع · سُحب…) — لصاحبه أو للمدير. */
export async function loadCandidateTrail(candidateId: string): Promise<{ events: TrailEvent[]; error: string | null }> {
  const sb = await userClient();
  if (!sb) return { events: [], error: "سجّل الدخول ثمّ أعِد المحاولة." };
  const { data, error } = await sb.rpc("get_candidate_audit_trail", { p_candidate: candidateId });
  if (error) return { events: [], error: rpcMessage(error, "تعذّر تحميل السجلّ.") };
  const rows = (data ?? []) as { event_type: string; payload: Record<string, unknown> | null; actor_name: string | null; created_at: string }[];
  const events: TrailEvent[] = rows.map((e) => {
    const p = e.payload ?? {};
    return {
      type: e.event_type,
      date: fmtStamp(e.created_at),
      actor: e.actor_name ?? null,
      status: (p["new_status"] as string) ?? null,
      note: ((p["note_ar"] ?? p["review_note_ar"] ?? p["note"]) as string) ?? null,
    };
  });
  return { events, error: null };
}
