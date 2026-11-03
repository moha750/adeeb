"use client";

/**
 * غرفةُ المهامّ على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `tasks/TasksView.tsx` القديم: **وجهان بقفلٍ واحد**،
 * «ما كُلِّفتُ به» يراه كلُّ من له منصب، و«مهامّ لجنتي» لا يظهر إلّا لمن تُرجع له القاعدةُ لجنةً يقودها (`canManage`)، ويفتح عليه
 * القائدُ إن لم يُكلَّف بشيء. وفي الأوّل تسليمُ العضو (`submitTask`) ما دامت مهمّتُه معلّقةً مفتوحة، وفي الثاني إنشاءُ المهمّة
 * والإسنادُ ونزعُه والتأشيرُ وإغلاقُ المهمّة وإعادةُ فتحها. **والحارسُ في القاعدة لا هنا**: هذا إخفاءٌ لِما لا يُستطاع لا حراسة.
 * والفرقُ في الشكل: ما كان في الكرت القديم حقلًا وأزرارًا (التسليم، والمُسنَدون بتأشيرهم) صار نافذتَه، يفتحها الفعلُ الأساسيّ.
 */
import type { RoomView } from "../view";
import { TASKS_ROOM } from "./tasks.meta";
import { Fragment, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, IconButton, Modal, ModalSectionHeading, Select, Textarea, matchesSearch } from "@adeeb/design-system";
import {
  CalendarBlank, ChatCenteredText, HandPalm, ListChecks, LockSimple, LockSimpleOpen, NotePencil, PaperPlaneTilt, TextAlignRight,
  UserMinus, UserPlus, Users, UsersThree,
} from "@phosphor-icons/react";
import { CaretDown, Check, Eye, PencilSimple, Plus, X } from "@/app/_components/glyphs";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { DropdownMenu } from "@/app/dashboard/_components/DropdownMenu";
import { EmptyState } from "@/app/dashboard/_components/EmptyState";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { MARKABLE, STATE_META, STATE_VALUES, STATUS_META } from "@/app/dashboard/tasks/vocab";
import type { ManagedTask, MyTaskRow, TaskState, TasksData } from "@/app/dashboard/tasks/data";
import { assignTask, createTask, markTask, setTaskStatus, submitTask, unassignTask } from "@/app/dashboard/tasks/actions";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdActs, AdBadge, AdButton, AdCard, AdRow, type AdAction, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { dayParts, fmtNum } from "../format";

const AR_TASK: ArForms = ["مهمّةٌ واحدة", "مهمّتان", "مهامّ", "مهمّةً"];
/** بعد «إلى»: «مُسنَدةٌ إلى عضوٍ واحد، إلى عضوين، إلى 3 أعضاء، إلى 12 عضوًا» */
const AR_TO_MEMBER: ArForms = ["عضوٍ واحد", "عضوين", "أعضاء", "عضوًا"];

const TONE: Record<(typeof STATE_META)[TaskState]["tone"], AdTone> = { neutral: "neutral", success: "ok", danger: "bad", warning: "warn" };
/** رموزُ التأشير الثلاثة في قائمة المُسنَد: ما يُحكم به على تسليمه */
const MARK_ICON: Record<TaskState, ReactNode> = { pending: null, delivered: <Check />, missed: <X />, excused: <HandPalm /> };

/** سجلُّ الغرفة: إسنادُ العضو نفسِه («ما كُلِّفتُ به»)، أو مهمّةٌ من مهامّ لجنته بمن أُسندت إليهم («مهامّ لجنتي»). */
type Item =
  | { kind: "mine"; id: string; title: string; dueOn: string | null; m: MyTaskRow }
  | { kind: "unit"; id: string; title: string; dueOn: string | null; t: ManagedTask };

type Result = { ok: boolean; message: string };

export function TasksRoom({ data, view }: { data: TasksData; serverNow: number; view?: RoomView }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  // النوافذُ تقرأ سجلَّها من البيانات نفسِها لا من نسخةٍ محفوظة — فتتبع تحديثَ الخادم بعد كلّ فعل
  const [mineId, setMineId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pick, setPick] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [committee, setCommittee] = useState(String(data.committees[0]?.id ?? ""));

  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(r.message); after?.(); router.refresh(); } else toast.error(r.message);
    });

  const items = useMemo<Item[]>(() => [
    ...data.mine.map((m) => ({ kind: "mine" as const, id: `m:${m.assignmentId}`, title: m.title, dueOn: m.dueOn, m })),
    ...data.managed.map((t) => ({ kind: "unit" as const, id: `u:${t.id}`, title: t.title, dueOn: t.dueOn, t })),
  ], [data.mine, data.managed]);

  const mine = mineId ? data.mine.find((m) => m.assignmentId === mineId) ?? null : null;
  const unit = unitId ? data.managed.find((t) => t.id === unitId) ?? null : null;
  const editable = (m: MyTaskRow) => m.state === "pending" && m.status === "open";
  const draftOf = (m: MyTaskRow) => drafts[m.assignmentId] ?? m.submission ?? "";

  const openUnit = (t: ManagedTask) => { setPick(""); setUnitId(t.id); };
  const closeCreate = () => { if (!pending) { setCreating(false); setTitle(""); setDesc(""); setDue(""); } };
  const openCreate = () => setCreating(true);

  /**
   * **المواضعُ الوجهان، وحالاتُ ما كُلِّفتُ به بينها** — كانت فوق القائمة القديمة كاردُ إحصاءٍ ثلاث لمهامّ العضو («تنتظرك»،
   * «سلّمتَها»، «لم تُسلَّم») فصارت مواضعَ بأعدادها، كرسائل التواصل. و«مهامّ لجنتي» للقائد وحده، والقالبُ يضع ما زاد على
   * أربعةٍ في «المزيد».
   */
  const positions: Position<Item>[] = [
    { key: "mine", label: "ما كُلِّفتُ به", match: (i) => i.kind === "mine", empty: "لا مهامَّ عليك. حين يُسنِد إليك قائدُ لجنتك مهمّةً ستظهر هنا." },
    { key: "waiting", label: "تنتظرك", match: (i) => i.kind === "mine" && i.m.state === "pending", empty: "لا مهمّةَ تنتظرك." },
    ...(data.canManage
      ? [{ key: "unit", label: "مهامّ لجنتي", match: (i: Item) => i.kind === "unit", empty: "لا مهامَّ في لجنتك بعد. أنشئ مهمّةً وأسنِدها إلى أعضائك، ثمّ أشّر تسليمهم.", canCreate: true }]
      : []),
    { key: "delivered", label: STATE_META.delivered.label, match: (i) => i.kind === "mine" && i.m.state === "delivered", empty: "لا مهمّةَ سُلّمت بعد." },
    { key: "missed", label: STATE_META.missed.label, match: (i) => i.kind === "mine" && i.m.state === "missed", empty: "لا مهمّةَ فات تسليمُها." },
  ];

  /** الشاراتُ: حالُ الإسناد (وحالُ المهمّة إن لم تكن مفتوحة) للعضو، وحالُ المهمّة للقائد — كما في الكرت القديم. */
  const chips = (i: Item) =>
    i.kind === "mine" ? (
      <>
        <AdBadge tone={TONE[STATE_META[i.m.state].tone]}>{STATE_META[i.m.state].label}</AdBadge>
        {i.m.status !== "open" && <AdBadge>{STATUS_META[i.m.status].label}</AdBadge>}
      </>
    ) : (
      <AdBadge tone={i.t.status === "open" ? "ok" : "neutral"}>{STATUS_META[i.t.status].label}</AdBadge>
    );

  /**
   * **السطورُ مصدرُها واحدٌ في العرضين**: اللجنة (كانت سطرَ الكرت تحت العنوان، والموعدُ معها صار الكعب)، ثمّ التفصيل، ثمّ
   * للعضو ملحوظةُ القائد وتسليمُه، وللقائد من أُسندت إليهم وحالُ تسليمهم بأعدادها (كانت صفًّا لكلّ شخصٍ بشارته). وكاملُها في النافذة.
   */
  const info = (i: Item): AdMeta[] => {
    const committeeName = i.kind === "mine" ? i.m.committee : i.t.committee;
    const description = i.kind === "mine" ? i.m.description : i.t.description;
    const out: AdMeta[] = [
      ...(committeeName ? [{ icon: <UsersThree />, text: committeeName }] : []),
      ...(description ? [{ icon: <TextAlignRight />, text: description, clip: true }] : []),
    ];
    if (i.kind === "mine") {
      if (i.m.note) out.push({ icon: <ChatCenteredText />, text: `ملحوظة القائد: ${i.m.note}`, clip: true });
      if (i.m.submission) out.push({ icon: <PaperPlaneTilt />, text: `تسليمك: ${i.m.submission}`, clip: true });
      return out;
    }
    const people = i.t.people;
    out.push({ icon: <Users />, text: people.length ? `مُسنَدةٌ إلى ${arCount(people.length, AR_TO_MEMBER)}` : "لم تُسنَد إلى أحدٍ بعد." });
    const states = STATE_VALUES
      .map((s) => [s, people.filter((p) => p.state === s).length] as const)
      .filter(([, n]) => n > 0)
      .map(([s, n]) => `${STATE_META[s].label} ${fmtNum(n)}`);
    if (states.length) out.push({ icon: <ListChecks />, text: states.join("، ") });
    return out;
  };
  /** الكعبُ: موعدُ التسليم يومًا وشهرًا وسنة (كان «الموعد: 16 يناير 2026» في سطر الكرت)؛ والمهمّةُ بلا موعدٍ كعبُها قماشُه. */
  const stubOf = (i: Item) => {
    if (!i.dueOn) return undefined;
    const d = dayParts(`${i.dueOn}T12:00:00`);
    return { big: d.day, small: d.month };
  };

  /**
   * **الأساسيُّ يفتح نافذةَ السجلّ**: للعضو تسليمُه (أو عرضُ مهمّته حين لا يُعدَّل التسليم: سُلّمت، أو أُغلقت)، وللقائد الإسنادُ
   * والتأشير. وللقائد بعده إغلاقُ المهمّة أو إعادةُ فتحها، كما كانا في قاع كرتها.
   */
  const primaryOf = (i: Item): AdAction => {
    if (i.kind === "unit") return { label: "الإسناد والتأشير", icon: <Users />, onClick: () => openUnit(i.t) };
    if (!editable(i.m)) return { label: "عرض المهمّة", icon: <Eye />, onClick: () => setMineId(i.m.assignmentId) };
    return { label: i.m.submission ? "تعديل التسليم" : "تسليم المهمّة", icon: i.m.submission ? <PencilSimple /> : <PaperPlaneTilt />, onClick: () => setMineId(i.m.assignmentId) };
  };
  const opsOf = (i: Item): AdOp[] => {
    if (i.kind === "mine") return [];
    const t = i.t;
    return t.status === "open"
      ? [{ key: "close", label: "إغلاق المهمّة", icon: <LockSimple />, onClick: () => run(() => setTaskStatus(t.id, "closed")), disabled: pending }]
      : [{ key: "open", label: "إعادة فتحها", icon: <LockSimpleOpen />, onClick: () => run(() => setTaskStatus(t.id, "open")), disabled: pending }];
  };
  const acts = (i: Item, inRow?: boolean) => <AdActs inRow={inRow} primary={primaryOf(i)} ops={opsOf(i)} />;
  const onOpen = (i: Item) => (i.kind === "mine" ? setMineId(i.m.assignmentId) : openUnit(i.t));

  const create = data.canManage ? <AdButton variant="fill" icon={<Plus />} onClick={openCreate}>مهمّة جديدة</AdButton> : undefined;
  const pool = unit
    ? (data.committees.find((c) => c.id === unit.committeeId)?.members ?? []).filter((m) => !unit.people.some((p) => p.id === m.id))
    : [];
  const canAssign = !!unit && unit.status === "open" && pool.length > 0;

  return (
    <>
      <CollectionRoom<Item>
        navPath={TASKS_ROOM.navPath}
        title={TASKS_ROOM.title}
        action={data.canManage ? { label: "مهمّة جديدة", icon: <Plus />, onClick: openCreate } : undefined}
        noun={AR_TASK}
        items={items}
        positions={positions}
        defaultPosition={data.canManage && data.mine.length === 0 ? "unit" : "mine"}
        searchPlaceholder="ابحث باسم المهمّة أو لجنتها…"
        matchSearch={(i, q) =>
          i.kind === "mine"
            ? matchesSearch(q, `${i.m.title} ${i.m.description ?? ""} ${i.m.committee ?? ""}`)
            : matchesSearch(q, `${i.t.title} ${i.t.description ?? ""} ${i.t.committee ?? ""} ${i.t.people.map((p) => p.name).join(" ")}`)
        }
        viewKey={TASKS_ROOM.viewKey}
        initialView={view}
        idOf={(i) => i.id}
        table={{
          // الترتيبُ بالمهمّة وموعدها من رأسيهما كجداول الغرف كلّها (لم يكن للغرفة القديمة جدول)
          head: "المهمّة",
          headSortBy: (i) => i.title,
          stub: { key: "due", label: "الموعد", icon: <CalendarBlank />, sortBy: (i) => (i.dueOn ? +new Date(`${i.dueOn}T12:00:00+03:00`) : 0) },
          columns: [],
        }}
        emptyAll={
          data.canManage
            ? { title: "لا مهامَّ في لجنتك بعد", desc: "أنشئ مهمّةً وأسنِدها إلى أعضائك، ثمّ أشّر تسليمهم." }
            : { title: "لا مهامَّ عليك", desc: "حين يُسنِد إليك قائدُ لجنتك مهمّةً ستظهر هنا." }
        }
        createAction={create}
        renderCard={(i) => (
          <AdCard key={i.id} seed={i.id} stub={stubOf(i)} chips={chips(i)} title={i.title} onOpen={() => onOpen(i)} meta={info(i)} foot={acts(i)} />
        )}
        renderRow={(i) => (
          <AdRow key={i.id} title={i.title} onOpen={() => onOpen(i)} stub={{ ...stubOf(i), seed: i.id }} badge={chips(i)} sub={info(i)} cells={[]} acts={acts(i, true)} />
        )}
      />

      {/* تسليمُ العضو — كان حقلَ الكرت القديم وزرَّ قاعه، والتفصيلُ وملحوظةُ القائد فوقه كما كانا */}
      <Modal
        open={!!mine}
        onClose={() => setMineId(null)}
        busy={pending}
        size="md"
        title={mine?.title ?? ""}
        description={mine ? [mine.committee, mine.dueLabel ? `الموعد: ${mine.dueLabel}` : ""].filter(Boolean).join("، ") || undefined : undefined}
        footer={
          mine ? (
            <>
              {editable(mine) ? (
                <Button
                  variant="primary"
                  size="md"
                  loading={pending}
                  onClick={() =>
                    run(() => submitTask(mine.assignmentId, draftOf(mine)), () => {
                      setMineId(null);
                      setDrafts((d) => { const n = { ...d }; delete n[mine.assignmentId]; return n; });
                    })
                  }
                >
                  حفظ التسليم
                </Button>
              ) : null}
              <Button variant="ghost" size="md" onClick={() => setMineId(null)} disabled={pending}>إغلاق</Button>
            </>
          ) : null
        }
      >
        {mine ? (
          <>
            {mine.description ? <p>{mine.description}</p> : null}
            {mine.note ? <Alert tone={STATE_META[mine.state].tone === "success" ? "success" : "info"} title="ملحوظة القائد">{mine.note}</Alert> : null}
            <Textarea
              label="تسليمك"
              icon={<PencilSimple />}
              innerIcon={<PencilSimple />}
              placeholder="اكتب ما أنجزتَه أو ضع رابطَه"
              rows={2}
              value={draftOf(mine)}
              onChange={(e) => setDrafts((d) => ({ ...d, [mine.assignmentId]: e.target.value }))}
              disabled={!editable(mine)}
              optional
            />
          </>
        ) : null}
      </Modal>

      {/* الإسنادُ والتأشير — كانا في كرت المهمّة القديم: صفٌّ لكلّ مُسنَدٍ بحاله وتسليمه وأزرار تأشيره ونزعِ إسناده، ثمّ «إسناد إلى».
          والصفُّ صفُّ الأشخاص المُقَرّ (`.lrow`، كشركاء الاستبيان): الحالُ ضابطٌ يُفتح بالتأشير، ونزعُ الإسناد زرٌّ أيقونيّ */}
      <Modal
        open={!!unit}
        onClose={() => setUnitId(null)}
        busy={pending}
        size="md"
        title={unit?.title ?? ""}
        description={unit ? [unit.committee, unit.dueLabel ? `الموعد: ${unit.dueLabel}` : ""].filter(Boolean).join("، ") || undefined : undefined}
        footer={
          unit ? (
            <>
              {canAssign ? (
                <Button
                  variant="primary"
                  size="md"
                  loading={pending}
                  disabled={!pick}
                  onClick={() => run(() => assignTask(unit.id, pick), () => setPick(""))}
                >
                  أسنِد
                </Button>
              ) : null}
              <Button variant="ghost" size="md" onClick={() => setUnitId(null)} disabled={pending}>إغلاق</Button>
            </>
          ) : null
        }
      >
        {unit ? (
          <>
            {unit.description ? <p>{unit.description}</p> : null}
            <ModalSectionHeading icon={<Users />} title="المُسنَدون" />
            {unit.people.length === 0 ? (
              <EmptyState variant="soft" icon={<Users />} title="لم تُسنَد إلى أحدٍ بعد." />
            ) : (
              unit.people.map((p) => (
                <Fragment key={p.assignmentId}>
                  <div className="lrow">
                    <div className="lrow-i">
                      <Avatar src={p.avatar ?? undefined} name={p.name} gender={p.gender} size="md" />
                      <span className="lrow-tx">
                        <b>{p.name}</b>
                        <span>{p.submittedLabel ? `سُلِّم في ${p.submittedLabel}` : "لا تسليم بعد."}</span>
                      </span>
                      <span className="lrow-end">
                        <DropdownMenu
                          ariaLabel={`تأشير ${p.name}`}
                          triggerClassName="abtn abtn-ghost abtn-sm lrow-sel"
                          trigger={<>{STATE_META[p.state].label} <CaretDown size={14} /></>}
                          groups={[{
                            header: "التأشير",
                            items: MARKABLE.map((s) => ({
                              label: STATE_META[s].label,
                              icon: MARK_ICON[s],
                              disabled: pending,
                              onSelect: () => run(() => markTask(p.assignmentId, s, "")),
                            })),
                          }]}
                        />
                        {p.state === "pending" ? (
                          <IconButton
                            tone="danger"
                            size="lg"
                            aria-label={`نزع الإسناد عن ${p.name}`}
                            disabled={pending}
                            onClick={() => run(() => unassignTask(unit.id, p.id))}
                          >
                            <UserMinus />
                          </IconButton>
                        ) : null}
                      </span>
                    </div>
                  </div>
                  {p.submission ? (
                    <Textarea
                      label="التسليم"
                      icon={<PaperPlaneTilt />}
                      innerIcon={<NotePencil />}
                      placeholder="لا تسليم بعد."
                      rows={3}
                      value={p.submission}
                      readOnly
                    />
                  ) : null}
                </Fragment>
              ))
            )}
            {canAssign ? (
              <>
                <ModalSectionHeading icon={<UserPlus />} title="إسناد" />
                <Select
                  label="إسناد إلى"
                  icon={<Users />}
                  options={[{ value: "", label: "اختر عضوًا" }, ...pool.map((m) => ({ value: m.id, label: m.name }))]}
                  value={pick}
                  onValueChange={setPick}
                  optional
                />
              </>
            ) : null}
          </>
        ) : null}
      </Modal>

      {/* إنشاءُ المهمّة — نافذةُ الغرفة القديمة كما هي */}
      <Modal
        open={creating}
        onClose={closeCreate}
        busy={pending}
        size="md"
        title="مهمّة جديدة"
        description="اكتب ما يُطلَب ومتى، ثمّ أسنِدها إلى من يعمل عليها."
        footer={
          <>
            <Button
              variant="primary"
              size="md"
              loading={pending}
              onClick={() =>
                run(() => createTask({ title, description: desc, committeeId: Number(committee), dueOn: due }), () => {
                  setCreating(false); setTitle(""); setDesc(""); setDue("");
                })
              }
            >
              إنشاء
            </Button>
            <Button variant="ghost" size="md" onClick={closeCreate} disabled={pending}>إلغاء</Button>
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
