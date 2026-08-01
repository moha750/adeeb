"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getElectionManager } from "@/lib/elections/authz";
import { createClient } from "@/lib/supabase/server";

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
  // تريغرات النظام ترفع رسائل عربيّة من عندنا (منصب مشغول · نطاق متداخل)
  if (error.code === "P0001" && error.message) return error.message;
  return "تعذّر فتح الانتخاب — تحقّق من أنّ المنصب شاغرٌ ولا انتخاب نشط له.";
}

/**
 * فتح انتخابٍ جديد لمنصبٍ منتخَب. الحارس قدراتيّ (manage_elections)، والإدراج عبر
 * الخدمة؛ وتريغرات القاعدة تفرض الشغور والحصر المتداخل والنطاق. يبدأ candidacy_open.
 */
export async function createElection(input: CreateElectionInput): Promise<ElectionResult> {
  const mgr = await getElectionManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الانتخابات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const invalid = scopeError(input);
  if (invalid) return { ok: false, message: invalid };

  const { data, error } = await sb
    .from("elections")
    .insert({
      target_role_name: input.roleName,
      target_committee_id: input.committeeId ?? null,
      target_department_id: input.departmentId ?? null,
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

/** انتقال حالةٍ صرف (إغلاق الترشّح · إعادة فتحه · إغلاق التصويت). */
export async function transitionElection(electionId: string, newStatus: "candidacy_open" | "candidacy_closed" | "voting_closed"): Promise<ElectionResult> {
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("transition_election", { p_election: electionId, p_new_status: newStatus });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر تغيير حالة الانتخاب.") };

  revalidatePath("/dashboard/elections", "layout");
  return { ok: true, message: "تمّ." };
}

/** فتح التصويت — يستلزم موعد إغلاقٍ مستقبليّ (الحمل الزائد ثلاثيّ الوسائط). */
export async function openVoting(electionId: string, votingEndIso: string): Promise<ElectionResult> {
  if (!votingEndIso || new Date(votingEndIso).getTime() <= Date.now()) {
    return { ok: false, message: "اختر موعد إغلاق تصويتٍ في المستقبل." };
  }
  const sb = await userClient();
  if (!sb) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { error } = await sb.rpc("transition_election", { p_election: electionId, p_new_status: "voting_open", p_voting_end: votingEndIso });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر فتح التصويت — تأكّد من اعتماد مرشّحَين على الأقلّ.") };

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
