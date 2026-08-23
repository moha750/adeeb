"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader,
  Field, Modal, Segmented, Select, Stat, Textarea,
} from "@adeeb/design-system";
import { CalendarBlank, ListChecks, Users, UsersThree } from "@phosphor-icons/react";
import { PencilSimple, Plus } from "@/app/_components/glyphs";
import { Avatar } from "../_components/Avatar";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import { MARKABLE, STATE_META, STATUS_META } from "./vocab";
import type { ManagedTask, MyTaskRow, TaskState, TasksData } from "./data";
import { assignTask, createTask, markTask, setTaskStatus, submitTask, unassignTask } from "./actions";
import { PageHeader } from "../_components/PageHeader";

/**
 * غرفةُ المهامّ — **وجهان بقفلٍ واحد**: «ما كُلِّفتُ به» يراه كلُّ من له منصب، و«مهامّ لجنتي»
 * لا يظهر إلّا لمن تُرجع له القاعدةُ لجنةً يقودها. فمن بلغ الغرفةَ بلا سلطةٍ رأى مهامَّه ولم
 * يرَ زرًّا — **والحارسُ في القاعدة لا في هذا الملفّ**، وهذا إخفاءٌ لِما لا يُستطاع لا حراسة.
 */
export function TasksView({ data }: { data: TasksData }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"mine" | "unit">(data.canManage && data.mine.length === 0 ? "unit" : "mine");

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
    });

  const mineStats = {
    pending: data.mine.filter((t) => t.state === "pending").length,
    delivered: data.mine.filter((t) => t.state === "delivered").length,
    missed: data.mine.filter((t) => t.state === "missed").length,
  };

  return (
    <>
      <PageHeader title="مهامّي" status={data.canManage ? undefined : { label: "ما كُلِّفتَ به", tone: "info", variant: "soft" }} />

      {data.error ? <Alert tone="warning" title="تعذّر جلب المهامّ">{data.error}</Alert> : null}

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<ListChecks />} value={mineStats.pending} label="مهامٌّ تنتظرك" tone={mineStats.pending > 0 ? "warning" : "brand"} />
        <Stat icon={<CalendarBlank />} value={mineStats.delivered} label="سلّمتَها" tone="success" />
        <Stat icon={<Users />} value={mineStats.missed} label="لم تُسلَّم" tone={mineStats.missed > 0 ? "danger" : "brand"} />
      </div>

      {data.canManage ? (
        <div style={{ marginBottom: 18 }}>
          <Segmented
            items={[
              { value: "mine", label: "ما كُلِّفتُ به" },
              { value: "unit", label: "مهامّ لجنتي" },
            ]}
            value={tab}
            onValueChange={(v) => setTab(v as "mine" | "unit")}
          />
        </div>
      ) : null}

      {tab === "mine" ? (
        <MineList rows={data.mine} busy={pending} run={run} />
      ) : (
        <UnitTasks data={data} busy={pending} run={run} />
      )}
    </>
  );
}

/* ══ ما كُلِّفتُ به ══════════════════════════════════════════════════════════ */

function MineList({
  rows, busy, run,
}: {
  rows: MyTaskRow[];
  busy: boolean;
  run: (fn: () => Promise<{ ok: boolean; message: string }>) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (rows.length === 0) {
    return <EmptyState icon={<ListChecks />} title="لا مهامَّ عليك" description="حين يُسنِد إليك قائدُ لجنتك مهمّةً ستظهر هنا." />;
  }

  return (
    <div className="card-grid">
      {rows.map((t) => {
        const meta = STATE_META[t.state];
        const editable = t.state === "pending" && t.status === "open";
        const value = drafts[t.assignmentId] ?? t.submission ?? "";
        return (
          <Card key={t.assignmentId}>
            <CardHeader
              className="acard-header-clip"
              icon={<ListChecks aria-hidden />}
              title={t.title}
              subtitle={[t.committee, t.dueLabel ? `الموعد: ${t.dueLabel}` : ""].filter(Boolean).join("، ")}
            />
            <CardBody className="pt-3">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={meta.tone} variant="soft" dot>{meta.label}</Badge>
                  {t.status !== "open" ? <Badge tone="neutral" variant="soft">{STATUS_META[t.status].label}</Badge> : null}
                </div>
                {t.description ? <p className="text-content-muted text-sm">{t.description}</p> : null}
                {t.note ? <Alert tone={meta.tone === "success" ? "success" : "info"} title="ملحوظة القائد">{t.note}</Alert> : null}
                <Textarea
                  label="تسليمك"
                  icon={<PencilSimple />}
                  innerIcon={<PencilSimple />}
                  placeholder="اكتب ما أنجزتَه أو ضع رابطَه"
                  rows={2}
                  value={value}
                  onChange={(e) => setDrafts((d) => ({ ...d, [t.assignmentId]: e.target.value }))}
                  disabled={!editable}
                  optional
                />
              </div>
            </CardBody>
            {editable ? (
              <CardFooter>
                <Button
                  variant="primary"
                  size="sm"
                  loading={busy}
                  onClick={() => run(() => submitTask(t.assignmentId, value))}
                >
                  حفظ التسليم
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

/* ══ مهامّ لجنتي ═════════════════════════════════════════════════════════════ */

function UnitTasks({
  data, busy, run,
}: {
  data: TasksData;
  busy: boolean;
  run: (fn: () => Promise<{ ok: boolean; message: string }>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [committee, setCommittee] = useState(String(data.committees[0]?.id ?? ""));

  const close = () => { if (!busy) { setOpen(false); setTitle(""); setDesc(""); setDue(""); } };

  return (
    <>
      <div className="btn-row" style={{ marginBottom: 14 }}>
        <Button variant="primary" size="md" onClick={() => setOpen(true)}>
          <Plus /> مهمّة جديدة
        </Button>
      </div>

      {data.managed.length === 0 ? (
        <EmptyState icon={<ListChecks />} title="لا مهامَّ في لجنتك بعد" description="أنشئ مهمّةً وأسنِدها إلى أعضائك، ثمّ أشّر تسليمهم." />
      ) : (
        <div className="flex flex-col gap-4">
          {data.managed.map((t) => (
            <UnitTaskCard key={t.id} task={t} data={data} busy={busy} run={run} />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        busy={busy}
        size="md"
        title="مهمّة جديدة"
        description="اكتب ما يُطلَب ومتى، ثمّ أسنِدها إلى من يعمل عليها."
        footer={
          <>
            <Button
              variant="primary"
              size="md"
              loading={busy}
              onClick={() =>
                run(async () => {
                  const r = await createTask({ title, description: desc, committeeId: Number(committee), dueOn: due });
                  if (r.ok) close();
                  return r;
                })
              }
            >
              إنشاء
            </Button>
            <Button variant="ghost" size="md" onClick={close} disabled={busy}>إلغاء</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field
            className="form-full" label="عنوان المهمّة" icon={<ListChecks />} innerIcon={<PencilSimple />}
            placeholder="كتابة سكربت الحلقة الثالثة" value={title} onChange={(e) => setTitle(e.target.value)} required
          />
          <Textarea
            className="form-full" label="تفصيلها" icon={<PencilSimple />} innerIcon={<PencilSimple />}
            placeholder="ما المطلوب بالضبط؟" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} optional
          />
          <Field
            label="موعد التسليم" type="date" icon={<CalendarBlank />} innerIcon={<CalendarBlank />}
            placeholder="اختر التاريخ" value={due} onChange={(e) => setDue(e.target.value)} optional
          />
          {data.committees.length > 1 ? (
            <Select
              label="اللجنة" icon={<UsersThree />}
              options={data.committees.map((c) => ({ value: String(c.id), label: c.name }))}
              value={committee} onValueChange={setCommittee} required
            />
          ) : null}
        </div>
      </Modal>
    </>
  );
}

function UnitTaskCard({
  task, data, busy, run,
}: {
  task: ManagedTask;
  data: TasksData;
  busy: boolean;
  run: (fn: () => Promise<{ ok: boolean; message: string }>) => void;
}) {
  const [pick, setPick] = useState("");
  const committee = data.committees.find((c) => c.id === task.committeeId);
  const assignedIds = new Set(task.people.map((p) => p.id));
  const pool = (committee?.members ?? []).filter((m) => !assignedIds.has(m.id));

  return (
    <Card>
      <CardHeader
        className="acard-header-clip"
        icon={<ListChecks aria-hidden />}
        title={task.title}
        subtitle={[task.committee, task.dueLabel ? `الموعد: ${task.dueLabel}` : ""].filter(Boolean).join("، ")}
      />
      <CardBody className="pt-3">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={task.status === "open" ? "success" : "neutral"} variant="soft" dot>
              {STATUS_META[task.status].label}
            </Badge>
            <Badge tone="neutral" variant="soft">{task.people.length} مُسنَدًا</Badge>
          </div>
          {task.description ? <p className="text-content-muted text-sm">{task.description}</p> : null}

          {task.people.length === 0 ? (
            <p className="text-content-muted text-sm">لم تُسنَد إلى أحدٍ بعد.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {task.people.map((p) => (
                <PersonRow key={p.assignmentId} person={p} taskId={task.id} busy={busy} run={run} />
              ))}
            </div>
          )}

          {task.status === "open" && pool.length > 0 ? (
            <div className="flex items-end gap-2">
              <div style={{ flex: 1 }}>
                <Select
                  label="إسناد إلى" icon={<Users />}
                  options={[{ value: "", label: "اختر عضوًا" }, ...pool.map((m) => ({ value: m.id, label: m.name }))]}
                  value={pick} onValueChange={setPick}
                  optional
                />
              </div>
              <Button
                variant="neutral" size="md" loading={busy} disabled={!pick}
                onClick={() => run(async () => { const r = await assignTask(task.id, pick); if (r.ok) setPick(""); return r; })}
              >
                أسنِد
              </Button>
            </div>
          ) : null}
        </div>
      </CardBody>
      <CardFooter>
        {task.status === "open" ? (
          <Button variant="ghost" size="sm" loading={busy} onClick={() => run(() => setTaskStatus(task.id, "closed"))}>
            إغلاق المهمّة
          </Button>
        ) : (
          <Button variant="ghost" size="sm" loading={busy} onClick={() => run(() => setTaskStatus(task.id, "open"))}>
            إعادة فتحها
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function PersonRow({
  person, taskId, busy, run,
}: {
  person: ManagedTask["people"][number];
  taskId: string;
  busy: boolean;
  run: (fn: () => Promise<{ ok: boolean; message: string }>) => void;
}) {
  const meta = STATE_META[person.state];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Avatar src={person.avatar ?? undefined} name={person.name} gender={person.gender} size="sm" />
        <span className="font-bold">{person.name}</span>
        <Badge tone={meta.tone} variant="soft" dot>{meta.label}</Badge>
        {person.source === "volunteered" ? <Badge tone="info" variant="soft">متطوّع</Badge> : null}
        {person.submittedLabel ? <span className="text-content-muted text-sm">سلّم {person.submittedLabel}</span> : null}
      </div>

      {person.submission ? (
        <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{person.submission}</p>
      ) : (
        <p className="text-content-muted text-sm">لا تسليم بعد.</p>
      )}

      <div className="btn-row">
        {MARKABLE.map((s: TaskState) => (
          <Button
            key={s}
            size="sm"
            variant={person.state === s ? "neutral" : "ghost"}
            loading={busy}
            onClick={() => run(() => markTask(person.assignmentId, s, ""))}
          >
            {STATE_META[s].label}
          </Button>
        ))}
        {person.state === "pending" ? (
          <Button
            size="sm" variant="ghost-danger" loading={busy}
            onClick={() => run(() => unassignTask(taskId, person.id))}
          >
            نزع الإسناد
          </Button>
        ) : null}
      </div>
    </div>
  );
}
