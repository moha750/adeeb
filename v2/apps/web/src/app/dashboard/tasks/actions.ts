"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * أفعالُ غرفة المهامّ — **كلُّها بجلسة صاحبها لا بمفتاح الخدمة**.
 *
 * ودوالُّ القاعدة تقرأ الفاعلَ من `auth.uid()` لا من مُدخَل — وهذا قرارٌ لا عادة: ثغرةُ
 * `p_actor` (٢٠٢٦-٠٨-٠٦) كشفت أنّ دالّةً تصدّق من يقول إنّه الفاعل تصير بابَ انتحال. فمن
 * أراد أن يُسنِد أو يؤشّر فليأتِ بجلسته، والقاعدةُ تعرفه بنفسها.
 *
 * **وأثرُه أنّ «المعاينة» تُري ولا تُنفّذ ههنا**: من عاين قائدًا رأى غرفتَه (القراءةُ تتبع
 * `getCurrentAdmin`)، فإن ضغط زرًّا نفّذته القاعدةُ باسمه هو فردّته. وهذا هو الصواب في بابٍ
 * كلُّ ما فيه حكمٌ على شخص.
 */

export type TaskResult = { ok: boolean; message: string };

const ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "جلستك غير صالحة. سجّل دخولك من جديد.",
  NOT_AUTHORIZED: "لا تملك مهامَّ هذه اللجنة.",
  TITLE_REQUIRED: "عنوان المهمّة مطلوب.",
  TASK_NOT_FOUND: "لم نعثر على المهمّة.",
  TASK_CLOSED: "المهمّة مغلقة، افتحها أوّلًا.",
  NOT_IN_COMMITTEE: "هذا الشخص ليس في اللجنة.",
  ASSIGNMENT_NOT_FOUND: "لم نعثر على الإسناد.",
  NOT_OWNER: "هذا الإسناد ليس لك.",
  NOT_ON_SELF: "لا تؤشّر على نفسك.",
  BAD_STATE: "حالةٌ غير معروفة.",
  BAD_STATUS: "حالةٌ غير معروفة.",
};
const toArabic = (raw: string): string => {
  const code = Object.keys(ERRORS).find((c) => raw.includes(c));
  return code ? ERRORS[code] : "تعذّر تنفيذ الطلب. حاول مجدّدًا.";
};

/** كلُّ فعلٍ يمرّ من هنا: نداءٌ واحدٌ بجلسة صاحبه، وترجمةٌ واحدة، وتحديثٌ واحد للصفحة. */
async function call(fn: string, args: Record<string, unknown>, okMsg: string): Promise<TaskResult> {
  const sb = await createClient();
  const { error } = await sb.rpc(fn, args);
  if (error) return { ok: false, message: toArabic(error.message) };
  revalidatePath("/dashboard/tasks");
  return { ok: true, message: okMsg };
}

export async function createTask(input: {
  title: string; description: string; committeeId: number; dueOn: string;
}): Promise<TaskResult> {
  if (!input.title.trim()) return { ok: false, message: "عنوان المهمّة مطلوب." };
  return call("create_task", {
    p_title: input.title.trim(),
    p_description: input.description.trim() || null,
    p_committee: input.committeeId,
    p_due_on: input.dueOn || null,
  }, "أُنشئت المهمّة.");
}

export async function updateTask(input: {
  taskId: string; title: string; description: string; dueOn: string;
}): Promise<TaskResult> {
  if (!input.title.trim()) return { ok: false, message: "عنوان المهمّة مطلوب." };
  return call("update_task", {
    p_task: input.taskId,
    p_title: input.title.trim(),
    p_description: input.description.trim() || null,
    p_due_on: input.dueOn || null,
  }, "حُفظت المهمّة.");
}

export async function assignTask(taskId: string, userId: string): Promise<TaskResult> {
  return call("assign_task", { p_task: taskId, p_user: userId }, "أُسندت المهمّة.");
}

export async function unassignTask(taskId: string, userId: string): Promise<TaskResult> {
  return call("unassign_task", { p_task: taskId, p_user: userId }, "نُزع الإسناد.");
}

export async function submitTask(assignmentId: string, submission: string): Promise<TaskResult> {
  return call("submit_task", { p_assignment: assignmentId, p_submission: submission }, "حُفظ تسليمك.");
}

export async function markTask(assignmentId: string, state: string, note: string): Promise<TaskResult> {
  return call("mark_task", { p_assignment: assignmentId, p_state: state, p_note: note.trim() || null }, "أُشّرت.");
}

export async function setTaskStatus(taskId: string, status: string): Promise<TaskResult> {
  const msg = status === "closed" ? "أُغلقت المهمّة." : status === "cancelled" ? "أُلغيت المهمّة." : "فُتحت المهمّة.";
  return call("set_task_status", { p_task: taskId, p_status: status }, msg);
}
