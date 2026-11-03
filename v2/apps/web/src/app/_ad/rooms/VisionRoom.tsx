"use client";

/**
 * **غرفةُ «متابعة الرؤية»** (٢٠٢٦-١١-٠٣؛ بُنيت مع الصفحة العلنيّة حين قال محمد: «نفّذ مقترحك») — على قالب «قائمة السجلّات».
 * الإدارةُ التنفيذيّة تنفّذ، **وإدارةُ الضمان والجودة تتابع من هنا** (والرئيسان معها): تغيّر حالَ كلّ هدف — لم يبدأ، قيد العمل،
 * تحقّق — فتُضاء قطعتُه في هلال `/vision` لحظةَ الحفظ، وتسجّل موعدَه الذي يضعه المجلسُ الإداريّ، وتصحّح نصَّه.
 *
 * الأهدافُ تحت مساراتها: رأسُ المسار طبقتُه من الهلال وما تحقّق منها. والفعلُ الظاهرُ في كلّ سطرٍ خطوتُه التالية
 * («بدأ العمل» ثمّ «تحقّق»)، و«تحقّق» بتأكيدٍ لأنّه يُعلَن للأعضاء في الصفحة العلنيّة.
 * ولا إضافةَ ولا حذفَ: عددُ الأهداف عددُ قطع الشعار المنشور (`dashboard/vision/actions.ts`).
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarBlank, ClockCounterClockwise, Flag, Hash, Play, SealCheck, Target, TextAlignRight, UserCircle } from "@phosphor-icons/react";
import { Button, Field, Modal, Textarea, matchesSearch } from "@adeeb/design-system";
import { ArrowCounterClockwise, ArrowSquareOut, PencilSimple } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { VisionMark } from "@/app/vision/_parts/VisionMark";
import type { VisionGoalRow, VisionRoomData } from "@/app/dashboard/vision/data";
import { setGoalStatus, updateGoal, type GoalInput, type VisionResult } from "@/app/dashboard/vision/actions";
import { arCount, arCounted, type ArForms } from "@/lib/arabicCount";
import { clubDayKey, daysBetweenKeys, fmtDateOnly } from "@/lib/dates";
import { GOAL_STATUS, VISION_PATH, type GoalStatus } from "@/lib/vision/vocab";
import type { RoomView } from "../view";
import { AdActs, AdBadge, AdCard, AdConfirm, AdGroupHead, AdRow, type AdMeta, type AdOp } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { VISION_ROOM } from "./vision.meta";

const NOUN: ArForms = ["هدفٌ واحد", "هدفان", "أهداف", "هدفًا"];
const DAY: ArForms = ["يوم", "يومان", "أيام", "يومًا"];
const ORDINAL = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن"];

const POSITIONS: Position<VisionGoalRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا أهداف في الرؤية." },
  { key: "pending", label: "لم يبدأ", match: (g) => g.status === "pending", empty: "كلُّ الأهداف بدأ العمل عليها." },
  { key: "active", label: "قيد العمل", match: (g) => g.status === "active", empty: "لا هدف قيد العمل الآن." },
  { key: "done", label: "تحقّق", match: (g) => g.status === "done", empty: "لم يتحقّق هدفٌ بعد." },
];

const EMPTY_FORM: GoalInput = { title: "", detail: "", target: "", owner: "", baseline: "", dueOn: "" };

export function VisionRoom({ data, view }: { data: VisionRoomData; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<{ g: VisionGoalRow; to: GoalStatus } | null>(null);
  const [editing, setEditing] = useState<VisionGoalRow | null>(null);
  const [form, setForm] = useState<GoalInput>(EMPTY_FORM);
  const { vision, counts, goals } = data;

  const layerOf = useMemo(() => {
    const order = [...new Set(goals.map((g) => g.trackPosition))].sort((a, b) => a - b);
    return new Map(order.map((p, i) => [p, i]));
  }, [goals]);
  const onByLayer = useMemo(() => {
    const out = counts.map((n) => Array<boolean>(n).fill(false));
    for (const g of goals) {
      const k = layerOf.get(g.trackPosition) ?? 0;
      out[k][g.position - 1] = g.status === "done";
    }
    return out;
  }, [counts, goals, layerOf]);
  const tally = useMemo(() => {
    const m = new Map<number, { n: number; done: number }>();
    for (const g of goals) {
      const t = m.get(g.trackPosition) ?? { n: 0, done: 0 };
      t.n++;
      if (g.status === "done") t.done++;
      m.set(g.trackPosition, t);
    }
    return m;
  }, [goals]);

  const run = (job: () => Promise<VisionResult>, after?: () => void) =>
    start(async () => {
      const r = await job();
      if (r.ok) { toast.success(r.message); after?.(); router.refresh(); } else toast.error(r.message);
    });

  const move = (g: VisionGoalRow, to: GoalStatus) => {
    // «تحقّق» يُعلَن للأعضاء، وإرجاعُ المتحقّق يُطفئ قطعةً رآها الناس — كلاهما بتأكيد؛ والبدءُ بلا تأكيد
    if (to === "done" || g.status === "done") setConfirm({ g, to });
    else run(() => setGoalStatus(g.id, to));
  };
  const openEdit = (g: VisionGoalRow) => {
    setForm({ title: g.title, detail: g.detail ?? "", target: g.target, owner: g.owner, baseline: g.baseline ?? "", dueOn: g.dueOn ?? "" });
    setEditing(g);
  };

  /** الفعلُ الظاهر خطوةُ الهدف التالية، والباقي في «المزيد» */
  const acts = (g: VisionGoalRow, inRow?: boolean) => {
    const edit: AdOp = { key: "edit", label: "تعديل الهدف", icon: <PencilSimple />, onClick: () => openEdit(g) };
    if (g.status === "pending") {
      return (
        <AdActs inRow={inRow} primary={{ label: "بدأ العمل", icon: <Play />, onClick: () => move(g, "active") }}
          ops={[{ key: "done", label: "تحقّق", icon: <SealCheck />, onClick: () => move(g, "done") }, edit]} />
      );
    }
    if (g.status === "active") {
      return (
        <AdActs inRow={inRow} primary={{ label: "تحقّق", icon: <SealCheck />, onClick: () => move(g, "done") }}
          ops={[edit, { key: "back", label: "إرجاع إلى «لم يبدأ»", icon: <ArrowCounterClockwise />, onClick: () => move(g, "pending") }]} />
      );
    }
    return (
      <AdActs inRow={inRow} primary={{ label: "تعديل", icon: <PencilSimple />, onClick: () => openEdit(g) }}
        ops={[{ key: "undo", label: "إلغاء التحقّق", icon: <ArrowCounterClockwise />, onClick: () => move(g, "active") }]} />
    );
  };

  const today = clubDayKey(new Date().toISOString());
  const info = (g: VisionGoalRow): AdMeta[] => {
    const late = g.dueOn && g.status !== "done" && daysBetweenKeys(today, g.dueOn) < 0;
    return [
      { icon: <Target />, text: `المستهدف: ${g.target}` },
      { icon: <UserCircle />, text: g.owner },
      g.status === "done" && g.doneAt
        ? { icon: <SealCheck />, text: `تحقّق ${fmtDateOnly(clubDayKey(g.doneAt))}`, tone: "ok" as const }
        : g.dueOn
          ? { icon: <CalendarBlank />, text: `${late ? "فات موعده" : "الموعد"} ${fmtDateOnly(g.dueOn)}`, tone: late ? ("bad" as const) : undefined }
          : { icon: <CalendarBlank />, text: "بلا موعد بعد", tone: "muted" as const },
      ...(g.baseline ? [{ icon: <Flag />, text: `عند البدء: ${g.baseline}`, clip: true }] : []),
      ...(g.updatedBy ? [{ icon: <ClockCounterClockwise />, text: `آخر تحديث: ${g.updatedBy}` }] : []),
    ];
  };
  const badge = (g: VisionGoalRow) => <AdBadge tone={GOAL_STATUS[g.status].tone}>{GOAL_STATUS[g.status].label}</AdBadge>;
  const stubOf = (g: VisionGoalRow) => ({ big: String(g.position), small: g.cluster ?? "الهدف" });

  const group = {
    of: (g: VisionGoalRow) => String(g.trackPosition),
    order: (a: VisionGoalRow[], b: VisionGoalRow[]) => a[0].trackPosition - b[0].trackPosition,
    inner: (a: VisionGoalRow, b: VisionGoalRow) => a.position - b.position,
    head: (items: VisionGoalRow[]) => {
      const g = items[0];
      const k = layerOf.get(g.trackPosition) ?? 0;
      const t = tally.get(g.trackPosition) ?? { n: 0, done: 0 };
      return (
        <AdGroupHead
          title={`المسار ${ORDINAL[k] ?? k + 1}: ${g.trackName}`}
          lead={<VisionMark className="vz-group-mark" counts={counts} on={onByLayer} focus={k} paper />}
          sub={[{ icon: <Hash />, text: arCount(t.n, NOUN) }]}
          figure={{ icon: <SealCheck />, label: "تحقّق", value: `${t.done} من ${t.n}`, of: { now: t.done, max: t.n, full: "مكتمل" } }}
        />
      );
    },
  };

  const total = goals.length;
  const done = goals.filter((g) => g.status === "done").length;
  const active = goals.filter((g) => g.status === "active").length;
  const toEnd = daysBetweenKeys(today, vision.horizonOn);
  const notice = (
    <section className="vz-room-note" aria-label={`هلال ${vision.name}`}>
      <VisionMark className="vz-room-mark" counts={counts} on={onByLayer} paper label={`تحقّق ${done} من ${total}`} />
      <div className="vz-room-tx">
        <strong className="vz-room-name">{vision.name}</strong>
        <span className="vz-room-line">
          من {fmtDateOnly(vision.startsOn)} حتى {vision.horizonLabel}
          {vision.status === "active" && toEnd >= 0 ? `، يبقى ${toEnd} ${arCounted(toEnd, DAY)} تقريبًا` : ""}
        </span>
        <span className="vz-room-line">
          تحقّق {done} من {total}، وقيد العمل {active}. وكل هدف يتحقق تُضاء قطعته في هلال صفحة الرؤية العلنية.
        </span>
      </div>
    </section>
  );

  const set = (k: keyof GoalInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const confirmText = confirm
    ? confirm.to === "done"
      ? `ستُضاء قطعةُ «${confirm.g.title}» في هلال صفحة الرؤية، ويراها الأعضاء متحقّقًا.`
      : `ستُطفأ قطعةُ «${confirm.g.title}» في الهلال، ويعود الهدف «${GOAL_STATUS[confirm.to].label}».`
    : undefined;

  return (
    <>
      <CollectionRoom<VisionGoalRow>
        navPath={VISION_ROOM.navPath}
        title={VISION_ROOM.title}
        extra={{ label: "صفحة الرؤية", icon: <ArrowSquareOut />, href: VISION_PATH }}
        noun={NOUN}
        items={goals}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث في الهدف أو المستهدف أو المسؤول…"
        matchSearch={(g, q) => matchesSearch(q, g.title, g.target, g.owner, g.detail ?? "", g.cluster ?? "")}
        viewKey={VISION_ROOM.viewKey}
        initialView={view}
        idOf={(g) => String(g.id)}
        group={group}
        notice={notice}
        table={{ head: "الهدف", stub: { key: "n", label: "الرقم", icon: <Hash /> }, columns: [] }}
        emptyAll={{ title: "لا أهداف بعد", desc: "تُكتب أهداف الرؤية حين يعتمدها المجلس الإداري." }}
        renderCard={(g) => (
          <AdCard key={g.id} seed={String(g.id)} stub={stubOf(g)} chips={badge(g)} title={g.title} onOpen={() => openEdit(g)} meta={info(g)} foot={acts(g)} />
        )}
        renderRow={(g) => (
          <AdRow
            key={g.id}
            title={g.title}
            onOpen={() => openEdit(g)}
            stub={{ ...stubOf(g), seed: String(g.id) }}
            badge={badge(g)}
            sub={info(g)}
            cells={[]}
            acts={acts(g, true)}
          />
        )}
      />

      <AdConfirm
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        tone={confirm?.to === "done" ? "success" : "warning"}
        icon={confirm?.to === "done" ? <SealCheck /> : <ArrowCounterClockwise />}
        title={confirm?.to === "done" ? "تحقّق الهدف؟" : "إلغاء التحقّق؟"}
        text={confirmText}
        confirmLabel={confirm?.to === "done" ? "نعم، تحقّق" : "إلغاء التحقّق"}
        loading={pending}
        onConfirm={() => {
          if (!confirm) return;
          run(() => setGoalStatus(confirm.g.id, confirm.to), () => setConfirm(null));
        }}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        busy={pending}
        size="md"
        title="تعديل الهدف"
        description={editing ? `المسار ${ORDINAL[(layerOf.get(editing.trackPosition) ?? 0)] ?? ""}: ${editing.trackName}، الهدف ${editing.position}` : undefined}
        footer={
          <>
            <Button variant="primary" size="md" loading={pending} onClick={() => editing && run(() => updateGoal(editing.id, form), () => setEditing(null))}>
              حفظ
            </Button>
            <Button variant="ghost" size="md" onClick={() => setEditing(null)} disabled={pending}>إلغاء</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field className="form-full" label="الهدف" icon={<Target />} innerIcon={<PencilSimple />} placeholder="سد مقعد قائد إدارة الضمان والجودة" value={form.title} onChange={set("title")} maxLength={120} required />
          <Textarea className="form-full" label="تفصيله" icon={<TextAlignRight />} innerIcon={<PencilSimple />} placeholder="ما يوضح الهدف إن احتاج" rows={2} value={form.detail} onChange={set("detail")} maxLength={300} optional />
          <Field label="المستهدف" icon={<Flag />} innerIcon={<PencilSimple />} placeholder="9 من 9" value={form.target} onChange={set("target")} maxLength={120} required />
          <Field label="المسؤول" icon={<UserCircle />} innerIcon={<PencilSimple />} placeholder="إدارة الموارد البشرية" value={form.owner} onChange={set("owner")} maxLength={120} required />
          <Field
            label="الموعد" type="date" icon={<CalendarBlank />} innerIcon={<CalendarBlank />} placeholder="اختر التاريخ"
            helper="يضعه المجلس الإداري لكل هدف." value={form.dueOn} onChange={set("dueOn")} optional
          />
          <Field
            label="الواقع عند البدء" icon={<ClockCounterClockwise />} innerIcon={<PencilSimple />} placeholder="ما كان عليه الحال يوم كُتبت الرؤية"
            helper="للمتابعة والمجلس، ولا يظهر في الصفحة العلنية." value={form.baseline} onChange={set("baseline")} maxLength={200} optional
          />
        </div>
      </Modal>
    </>
  );
}
