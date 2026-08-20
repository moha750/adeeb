import { fmtDateOnly } from "@adeeb/core/dates";
import { STATE_META, STATUS_META, type TaskState, type TaskStatus } from "@adeeb/core/tasks";

import { supabase } from "./supabase";

/**
 * مهامُّ صاحب الجلسة، تسليمًا وقراءةً.
 *
 * **بجلسته لا بمفتاح خدمة**: `task_assignments_select` تسمح لصاحب الإسناد بصفّه،
 * و`tasks_select` تسمح بمهمّته عبر `is_my_task`. والتسليمُ `submit_task` دالّةٌ
 * `SECURITY DEFINER` تقرأ الفاعلَ من `auth.uid()` لا من مُدخَل — وهو حكمُ ثغرة `p_actor`
 * (٢٠٢٦-٠٨-٠٦): لا تُصدَّق دعوى فاعلٍ تأتي من عميل.
 */

export type MyTask = {
  assignmentId: string;
  taskId: string;
  title: string;
  description: string | null;
  committee: string | null;
  dueLabel: string;
  status: TaskStatus;
  statusLabel: string;
  state: TaskState;
  stateLabel: string;
  stateTone: (typeof STATE_META)[TaskState]["tone"];
  submission: string | null;
  note: string | null;
};

type RawAssignment = {
  id: string;
  task_id: string;
  state: TaskState;
  submission: string | null;
  note: string | null;
};

type RawTask = {
  id: string;
  title: string;
  description: string | null;
  committee_id: number | null;
  status: TaskStatus;
  due_on: string | null;
};

export async function getMyTasks(): Promise<{ data: MyTask[]; error: string | null }> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return { data: [], error: null };

  const { data: aRaw, error: aErr } = await supabase
    .from("task_assignments")
    .select("id, task_id, state, submission, note")
    .eq("user_id", uid);
  if (aErr) return { data: [], error: aErr.message };

  const assignments = (aRaw ?? []) as RawAssignment[];
  const ids = [...new Set(assignments.map((a) => a.task_id))];
  if (!ids.length) return { data: [], error: null };

  const [tRes, cRes] = await Promise.all([
    supabase.from("tasks").select("id, title, description, committee_id, status, due_on").in("id", ids),
    supabase.from("committees").select("id, committee_name_ar"),
  ]);
  if (tRes.error) return { data: [], error: tRes.error.message };

  const taskById = new Map(((tRes.data ?? []) as RawTask[]).map((t) => [t.id, t]));
  const committeeName = new Map((cRes.data ?? []).map((c) => [c.id as number, c.committee_name_ar as string | null]));

  const rows = assignments
    .map((a): MyTask | null => {
      const t = taskById.get(a.task_id);
      if (!t) return null;
      return {
        assignmentId: a.id,
        taskId: t.id,
        title: t.title,
        description: t.description,
        committee: t.committee_id != null ? committeeName.get(t.committee_id) ?? null : null,
        dueLabel: fmtDateOnly(t.due_on),
        status: t.status,
        statusLabel: STATUS_META[t.status]?.label ?? "",
        state: a.state,
        stateLabel: STATE_META[a.state]?.label ?? "",
        stateTone: STATE_META[a.state]?.tone ?? "neutral",
        submission: a.submission,
        note: a.note,
      };
    })
    .filter((r): r is MyTask => r !== null);

  // ترتيبُ اللوحة نفسُه: ما ينتظرك أوّلًا، ثمّ الأقربُ موعدًا
  return {
    data: rows.sort((x, y) => {
      if (x.state === "pending" && y.state !== "pending") return -1;
      if (y.state === "pending" && x.state !== "pending") return 1;
      return (x.dueLabel || "").localeCompare(y.dueLabel || "", "ar");
    }),
    error: null,
  };
}

export type TaskResult = { ok: boolean; message: string };

const ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "جلستك غير صالحة. سجّل دخولك من جديد.",
  ASSIGNMENT_NOT_FOUND: "لم نعثر على الإسناد.",
  NOT_OWNER: "هذا الإسناد ليس لك.",
  TASK_CLOSED: "المهمّة مغلقة.",
};

/** تسليمُ مهمّة. والرسائلُ عربيّةٌ كما في اللوحة، ومصدرُ الحكم القاعدةُ لا الشاشة. */
export async function submitTask(assignmentId: string, submission: string): Promise<TaskResult> {
  const text = submission.trim();
  if (!text) return { ok: false, message: "اكتب ما تسلّمه أوّلًا." };

  const { error } = await supabase.rpc("submit_task", { p_assignment: assignmentId, p_submission: text });
  if (error) {
    const code = Object.keys(ERRORS).find((c) => error.message.includes(c));
    return { ok: false, message: code ? ERRORS[code] : "تعذّر التسليم. حاول مجدّدًا." };
  }
  return { ok: true, message: "حُفظ تسليمك." };
}
