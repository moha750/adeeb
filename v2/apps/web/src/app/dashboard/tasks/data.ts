// يُستورَد من مكوّنات خادميّة وحدها — المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import { createAdeebServiceClient } from "@adeeb/core";
import { getCurrentAdmin } from "@/lib/auth";
import { fmtDateOnly } from "@/lib/dates";

/**
 * قارئُ غرفة المهامّ — **وجهان بقفلٍ واحد**: ما كُلِّفتَ به، وما تُكلّف به لجنتُك.
 *
 * ومدى القيادة **تقوله القاعدة لا هذا الملفّ**: `task_committees_of` تُرجع اللجانَ التي
 * يملك الفاعلُ مهامَّها (وهي نفسُها `can_manage_tasks_of` التي تحرس الكتابة) — فلو نُسخ
 * الحكمُ ههنا لَافترق يومًا عن حارسه، فرأى في الشاشة ما لا يستطيعه في القاعدة.
 *
 * ويتبع **الهويّةَ المعروضة** لا صاحبَ الجلسة (`getCurrentAdmin`): من عاين قائدًا رأى غرفتَه.
 */

export type TaskState = "pending" | "delivered" | "missed" | "excused";
export type TaskStatus = "open" | "closed" | "cancelled";

export type TaskPerson = {
  id: string;
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
};

/** مهمّةٌ كما يراها صاحبُها. */
export type MyTaskRow = {
  assignmentId: string;
  taskId: string;
  title: string;
  description: string | null;
  committee: string | null;
  dueOn: string | null;
  dueLabel: string;
  status: TaskStatus;
  state: TaskState;
  submission: string | null;
  note: string | null;
};

/** صفُّ شخصٍ داخل مهمّةٍ كما يراها قائدُها. */
export type TaskAssignee = TaskPerson & {
  assignmentId: string;
  source: "assigned" | "volunteered";
  state: TaskState;
  submission: string | null;
  submittedLabel: string;
  note: string | null;
};

export type ManagedTask = {
  id: string;
  title: string;
  description: string | null;
  committeeId: number | null;
  committee: string | null;
  dueOn: string | null;
  dueLabel: string;
  status: TaskStatus;
  people: TaskAssignee[];
};

export type TaskCommittee = { id: number; name: string; members: TaskPerson[] };

export type TasksData = {
  mine: MyTaskRow[];
  managed: ManagedTask[];
  committees: TaskCommittee[];
  /** أله لجنةٌ يملك مهامَّها؟ (وإلّا فالغرفةُ عرضٌ محض) */
  canManage: boolean;
  error?: string;
};

const EMPTY: TasksData = { mine: [], managed: [], committees: [], canManage: false };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

type RawTask = {
  id: string; title: string; description: string | null; committee_id: number | null;
  status: TaskStatus; due_on: string | null; created_at: string;
};
type RawAssignment = {
  id: string; task_id: string; user_id: string; source: "assigned" | "volunteered";
  state: TaskState; submission: string | null; submitted_at: string | null; note: string | null;
};

export async function getTasks(): Promise<TasksData> {
  const me = await getCurrentAdmin();
  if (!me) return { ...EMPTY, error: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ...EMPTY, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  // اللجانُ التي يقودها — من القاعدة، حكمًا واحدًا لا نسختين
  const { data: cidRows, error: cErr } = await sb.rpc("task_committees_of", { p_actor: me.id });
  if (cErr) return { ...EMPTY, error: cErr.message };
  const myCommitteeIds = ((cidRows ?? []) as number[]).filter((n) => typeof n === "number");

  // مهامُّه هو: نبدأ من إسناداته ثمّ نجلب مهامَّها (لا وصلةَ مضمَّنة — الاستعلامُ صريح)
  const { data: mineRaw, error: mErr } = await sb
    .from("task_assignments")
    .select("id, task_id, user_id, source, state, submission, submitted_at, note")
    .eq("user_id", me.id);
  if (mErr) return { ...EMPTY, error: mErr.message };
  const myAssignments = (mineRaw ?? []) as RawAssignment[];

  // مهامُّ لجانه (للقيادة) — وقد لا تكون له لجنة، فتبقى فارغة
  const { data: managedRaw, error: tErr } = myCommitteeIds.length
    ? await sb
        .from("tasks")
        .select("id, title, description, committee_id, status, due_on, created_at")
        .in("committee_id", myCommitteeIds)
        .order("created_at", { ascending: false })
    : { data: [] as RawTask[], error: null };
  if (tErr) return { ...EMPTY, error: tErr.message };
  const managedTasks = (managedRaw ?? []) as RawTask[];

  // مهامُّ إسناداته (لتفاصيل شاشة العضو) — قد تكون في لجنةٍ لا يقودها
  const myTaskIds = [...new Set(myAssignments.map((a) => a.task_id))];
  const { data: myTasksRaw } = myTaskIds.length
    ? await sb.from("tasks").select("id, title, description, committee_id, status, due_on, created_at").in("id", myTaskIds)
    : { data: [] as RawTask[] };
  const taskById = new Map<string, RawTask>(
    [...((myTasksRaw ?? []) as RawTask[]), ...managedTasks].map((t) => [t.id, t]),
  );

  // إسنادات مهامّه المُقادة (لعرض من فيها)
  const managedIds = managedTasks.map((t) => t.id);
  const { data: peopleRaw } = managedIds.length
    ? await sb
        .from("task_assignments")
        .select("id, task_id, user_id, source, state, submission, submitted_at, note")
        .in("task_id", managedIds)
    : { data: [] as RawAssignment[] };
  const managedAssignments = (peopleRaw ?? []) as RawAssignment[];

  // الأسماءُ واللجانُ وأعضاؤها
  const personIds = [...new Set(managedAssignments.map((a) => a.user_id))];
  const [pRes, cRes, urRes] = await Promise.all([
    personIds.length
      ? sb.from("members").select("id, full_name, avatar_url, gender").in("id", personIds)
      : Promise.resolve({ data: [] as unknown[] }),
    myCommitteeIds.length
      ? sb.from("committees").select("id, committee_name_ar").in("id", myCommitteeIds)
      : Promise.resolve({ data: [] as unknown[] }),
    myCommitteeIds.length
      ? sb.from("user_roles").select("user_id, committee_id").eq("is_active", true).in("committee_id", myCommitteeIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const roleRows = (urRes.data ?? []) as { user_id: string; committee_id: number }[];
  const memberIds = [...new Set(roleRows.map((r) => r.user_id))];
  const { data: allPeopleRaw } = memberIds.length
    ? await sb.from("members").select("id, full_name, avatar_url, gender").in("id", memberIds)
    : { data: [] as unknown[] };

  type RawPerson = { id: string; full_name: string | null; avatar_url: string | null; gender: string | null };
  const toPerson = (p: RawPerson): TaskPerson => ({
    id: p.id,
    name: p.full_name ?? "بلا اسم",
    avatar: p.avatar_url ?? null,
    gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
  });
  const personById = new Map<string, TaskPerson>(
    [...((pRes.data ?? []) as RawPerson[]), ...((allPeopleRaw ?? []) as RawPerson[])].map((p) => [p.id, toPerson(p)]),
  );

  const committeeName = new Map<number, string>(
    ((cRes.data ?? []) as { id: number; committee_name_ar: string }[]).map((c) => [c.id, c.committee_name_ar]),
  );

  const committees: TaskCommittee[] = myCommitteeIds.map((id) => ({
    id,
    name: committeeName.get(id) ?? `لجنة ${id}`,
    members: roleRows
      .filter((r) => r.committee_id === id)
      .map((r) => personById.get(r.user_id))
      .filter((p): p is TaskPerson => !!p)
      // صفٌّ واحدٌ للشخص ولو تعدّدت أدوارُه في اللجنة
      .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
      .sort((a, b) => a.name.localeCompare(b.name, "ar")),
  }));

  const mine: MyTaskRow[] = myAssignments
    .map((a) => {
      const t = taskById.get(a.task_id);
      if (!t) return null;
      return {
        assignmentId: a.id,
        taskId: t.id,
        title: t.title,
        description: t.description,
        committee: t.committee_id != null ? committeeName.get(t.committee_id) ?? null : null,
        dueOn: t.due_on,
        dueLabel: fmtDateOnly(t.due_on),
        status: t.status,
        state: a.state,
        submission: a.submission,
        note: a.note,
      } satisfies MyTaskRow;
    })
    .filter((r): r is MyTaskRow => r !== null)
    // المعلَّقُ أوّلًا ثمّ الأقربُ موعدًا — ما ينتظرك قبل ما انتهى
    .sort((x, y) => {
      if (x.state === "pending" && y.state !== "pending") return -1;
      if (y.state === "pending" && x.state !== "pending") return 1;
      return (x.dueOn ?? "9999").localeCompare(y.dueOn ?? "9999");
    });

  const managed: ManagedTask[] = managedTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    committeeId: t.committee_id,
    committee: t.committee_id != null ? committeeName.get(t.committee_id) ?? null : null,
    dueOn: t.due_on,
    dueLabel: fmtDateOnly(t.due_on),
    status: t.status,
    people: managedAssignments
      .filter((a) => a.task_id === t.id)
      .map((a) => {
        const p = personById.get(a.user_id);
        return {
          assignmentId: a.id,
          id: a.user_id,
          name: p?.name ?? "بلا اسم",
          avatar: p?.avatar ?? null,
          gender: p?.gender ?? null,
          source: a.source,
          state: a.state,
          submission: a.submission,
          submittedLabel: a.submitted_at ? fmtDateOnly(a.submitted_at.slice(0, 10)) : "",
          note: a.note,
        } satisfies TaskAssignee;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ar")),
  }));

  return { mine, managed, committees, canManage: committees.length > 0 };
}
