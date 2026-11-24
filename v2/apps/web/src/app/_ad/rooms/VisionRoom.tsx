"use client";

/**
 * **غرفةُ «متابعة الرؤية»** (٢٠٢٦-١١-٠٣؛ بُنيت مع الصفحة العلنيّة حين قال محمد: «نفّذ مقترحك») — على قالب «قائمة السجلّات».
 * **فريقُ الرؤية ينفّذ ويؤكّد** (٢٠٢٦-١١-٢٢، سقط «خطُّ المتابعة»): قائدُ المسار يرى مسارَه ويغيّر حالَ أهدافه حتى «أُنجز» بدليله،
 * والمشرفُ العامّ وقائدُ الرؤية يريان كلَّ شيء ويؤكّدان «تحقّق» — فتُضاء القطعةُ في هلال `/vision` — أو يُرجعان بسبب، ويصحّحان
 * النصَّ والموعد. **ولا يؤكّد أحدٌ ما رفعه** (قيدٌ في القاعدة)، وكلُّ فعلٍ في «سجلّ الرؤية».
 * **مساحةُ عمل الفريق وحدها** (محمد ٢٠٢٦-١١-٢٣): تسميةُ الفريق وإغلاقُ الرؤية وإعدادُ القادمة في «الرؤى» (`VisionPlanRoom`)، لا هنا.
 *
 * الأهدافُ تحت مساراتها: رأسُ المسار طبقتُه من الهلال وما تحقّق منها. والفعلُ الظاهرُ في كلّ سطرٍ خطوتُه التالية لصاحب المقعد
 * («بدأ العمل» ثمّ «أُنجز» ثمّ «تحقّق»)، و«تحقّق» بتأكيدٍ لأنّه يُعلَن للأعضاء في الصفحة العلنيّة.
 * ولا إضافةَ ولا حذفَ: عددُ الأهداف عددُ قطع الشعار المنشور (`dashboard/vision/actions.ts`).
 */
import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarBlank, ClockCounterClockwise, Flag, Hash, NotePencil, Play, SealCheck, Target, TextAlignRight, UserCircle } from "@phosphor-icons/react";
import { Button, Field, Modal, Textarea, matchesSearch } from "@adeeb/design-system";
import { ArrowCounterClockwise, ArrowSquareOut, ArrowUUpLeft, Checks, PencilSimple } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { VisionMark } from "@/app/vision/_parts/VisionMark";
import type { VisionGoalRow, VisionLogRow, VisionRoomData } from "@/app/dashboard/vision/data";
import { goalAct, updateGoal, type GoalInput, type VisionResult } from "@/app/dashboard/vision/actions";
import { arCount, arCounted, type ArForms } from "@/lib/arabicCount";
import { clubDayKey, daysBetweenKeys, fmtDateOnly } from "@/lib/dates";
import { GOAL_STATUS, VISION_PATH, type GoalAct } from "@/lib/vision/vocab";
import type { RoomView } from "../view";
import { AdActs, AdBadge, AdCard, AdConfirm, AdGroupHead, AdRow, type AdAction, type AdMeta, type AdOp } from "../primitives";
import { AdLog } from "../log";
import { AR_LOG, visionLogEvent, visionLogSame } from "./visionLog";
import { markConstruct } from "@/lib/vision/mark";
import { visionSpan } from "@/lib/vision/span";
import { CollectionRoom, type Position } from "../collection";
import { VISION_ROOM } from "./vision.meta";

const NOUN: ArForms = ["هدفٌ واحد", "هدفان", "أهداف", "هدفًا"];
const DAY: ArForms = ["يوم", "يومان", "أيام", "يومًا"];
const ORDINAL = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن"];

const POSITIONS: Position<VisionGoalRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا أهداف في الرؤية." },
  { key: "pending", label: "لم يبدأ", match: (g) => g.status === "pending", empty: "كلُّ الأهداف بدأ العمل عليها." },
  { key: "active", label: "قيد العمل", match: (g) => g.status === "active", empty: "لا هدف قيد العمل الآن." },
  { key: "reported", label: "أُنجز", match: (g) => g.status === "reported", empty: "لا هدف بانتظار التأكيد." },
  { key: "done", label: "تحقّق", match: (g) => g.status === "done", empty: "لم يتحقّق هدفٌ بعد." },
];

const EMPTY_FORM: GoalInput = { title: "", detail: "", target: "", owner: "", baseline: "", dueOn: "" };


export function VisionRoom({ data, view, now }: { data: VisionRoomData; view?: RoomView; now: number }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  /** تأكيدُ «تحقّق» وإلغاؤه: كلاهما يُعلَن أو يُطفأ في الصفحة العلنيّة */
  const [confirm, setConfirm] = useState<{ g: VisionGoalRow; act: "confirm" | "unconfirm" } | null>(null);
  /** «أُنجز» بدليله، والإرجاعُ بسببه */
  const [noting, setNoting] = useState<{ g: VisionGoalRow; act: "report" | "return" } | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<VisionGoalRow | null>(null);
  const [form, setForm] = useState<GoalInput>(EMPTY_FORM);
  const { vision, counts, goals, access } = data;
  /** المشرفُ العامّ وقائدُ الرؤية: يؤكّدان ويُرجعان ويصحّحان، ويرفعان «أُنجز» عن أيّ مسار */
  const confirmer = access.supervisor || access.leader;
  const live = vision.status === "active";
  const noun = vision.markNoun;
  const trackSide = (g: VisionGoalRow) => confirmer || access.tracks.includes(g.trackId);


  // طبقةُ المسار بترتيبه بين المسارات كلّها (لا بين ما يراه قائدُ مسارٍ وحده)، والمضاءُ من الخادم للهلال كلّه
  const layerOf = useMemo(() => new Map(data.tracks.map((t, i) => [t.position, i])), [data.tracks]);
  const onByLayer = data.lit;
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

  const go = (g: VisionGoalRow, a: GoalAct, n?: string, after?: () => void) =>
    run(() => goalAct(g.id, a, n), after);

  const act = (g: VisionGoalRow, a: GoalAct) => {
    // «تحقّق» يُعلَن للأعضاء، وإلغاؤه يُطفئ قطعةً رآها الناس — كلاهما بتأكيد؛ و«أُنجز» والإرجاعُ بنافذة ملاحظتهما
    if (a === "confirm" || a === "unconfirm") setConfirm({ g, act: a });
    else if (a === "report" || a === "return") { setNote(""); setNoting({ g, act: a }); }
    else go(g, a);
  };
  const openEdit = (g: VisionGoalRow) => {
    setForm({ title: g.title, detail: g.detail ?? "", target: g.target, owner: g.owner, baseline: g.baseline ?? "", dueOn: g.dueOn ?? "" });
    setEditing(g);
  };

  /**
   * **الفعلُ الظاهر خطوةُ الهدف التالية لصاحب المقعد**، والباقي في «المزيد». ومن لا فعلَ له في الهدف (الرئيسُ بلا مقعد) لا يرى
   * زرًّا: الحالُ في الشارة تكفيه. و«أُنجز» المرفوعُ ينتظر: من رفعه أو قائدُ مساره يسحبه، والمؤكِّدُ يؤكّده أو يُرجعه بسبب.
   */
  const acts = (g: VisionGoalRow, inRow?: boolean) => {
    // المنتهيةُ تجمّدت أهدافُها: تُقرأ ولا يُفعل فيها شيء
    if (!live) return null;
    const edit: AdOp[] = [{ key: "edit", label: "تعديل الهدف", icon: <PencilSimple />, onClick: () => openEdit(g) }];
    const side = trackSide(g);
    const mine = g.reportedById === access.userId;
    let primary: AdAction | null = null;
    const ops: AdOp[] = [];
    if (g.status === "pending" && side) {
      primary = { label: "بدأ العمل", icon: <Play />, onClick: () => act(g, "start") };
      ops.push({ key: "report", label: "أُنجز", icon: <Checks />, onClick: () => act(g, "report") });
    } else if (g.status === "active" && side) {
      primary = { label: "أُنجز", icon: <Checks />, onClick: () => act(g, "report") };
      ops.push({ key: "back", label: "إرجاع إلى «لم يبدأ»", icon: <ArrowCounterClockwise />, onClick: () => act(g, "unstart") });
    } else if (g.status === "reported") {
      // من رفعه لا يؤكّده، ولو كان المشرفَ العامّ (القاعدة تمنعه، والزرُّ لا يُعرض عليه)
      if (confirmer && !mine) {
        primary = { label: "تحقّق", icon: <SealCheck />, onClick: () => act(g, "confirm") };
        ops.push({ key: "return", label: "إرجاع بسبب", icon: <ArrowUUpLeft />, onClick: () => act(g, "return") });
      }
      // السحبُ لمن رفعه أو لقائد مساره؛ والمؤكِّدُ يُرجع بسببٍ يصل صاحبَه لا يسحب بصمت (قيدٌ في القاعدة أيضًا)
      if (mine || access.tracks.includes(g.trackId)) ops.push({ key: "withdraw", label: "سحب «أُنجز»", icon: <ArrowCounterClockwise />, onClick: () => act(g, "withdraw") });
    } else if (g.status === "done" && confirmer) {
      ops.push({ key: "undo", label: "إلغاء التحقّق", icon: <ArrowCounterClockwise />, onClick: () => act(g, "unconfirm") });
    }
    // ومن يصحّح ولا خطوةَ له في الهدف فتعديلُه هو الظاهر، وإلّا فالتعديلُ في «المزيد»
    const editOp = confirmer ? edit : [];
    if (!primary && editOp.length) primary = { label: "تعديل", icon: <PencilSimple />, onClick: () => openEdit(g) };
    else ops.push(...editOp);
    if (!primary) {
      // فعلٌ واحدٌ في «المزيد» وحده لا يُخبّأ: يصير هو الظاهر
      const first = ops.shift();
      if (!first?.onClick) return null;
      primary = { label: first.label, icon: first.icon, onClick: first.onClick };
    }
    return <AdActs inRow={inRow} primary={primary} ops={ops} />;
  };

  const today = clubDayKey(new Date().toISOString());
  const info = (g: VisionGoalRow): AdMeta[] => {
    const late = g.dueOn && g.status !== "done" && daysBetweenKeys(today, g.dueOn) < 0;
    return [
      { icon: <Target />, text: `المستهدف: ${g.target}` },
      { icon: <UserCircle />, text: g.owner },
      g.status === "done" && g.doneAt
        ? { icon: <SealCheck />, text: `تحقّق ${fmtDateOnly(clubDayKey(g.doneAt))}${g.confirmedBy ? `، أكّده ${g.confirmedBy}` : ""}`, tone: "ok" as const }
        : g.status === "reported"
          ? { icon: <Checks />, text: `أُنجز${g.reportedBy ? ` برفع ${g.reportedBy}` : ""}، بانتظار التأكيد`, tone: "warn" as const }
        : g.dueOn
          ? { icon: <CalendarBlank />, text: `${late ? "فات موعده" : "الموعد"} ${fmtDateOnly(g.dueOn)}`, tone: late ? ("bad" as const) : undefined }
          : { icon: <CalendarBlank />, text: "بلا موعد بعد", tone: "muted" as const },
      ...(g.status === "reported" && g.reportNote ? [{ icon: <NotePencil />, text: `الدليل: ${g.reportNote}`, clip: true }] : []),
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
          lead={<VisionMark className="vz-group-mark" mark={vision.mark} counts={counts} on={onByLayer} focus={k} paper />}
          sub={[{ icon: <Hash />, text: arCount(t.n, NOUN) }]}
          figure={{ icon: <SealCheck />, label: "تحقّق", value: `${t.done} من ${t.n}`, of: { now: t.done, max: t.n, full: "مكتمل" } }}
        />
      );
    },
  };

  const total = goals.length;
  const done = goals.filter((g) => g.status === "done").length;
  const active = goals.filter((g) => g.status === "active").length;
  const waiting = goals.filter((g) => g.status === "reported").length;
  const seesAll = access.president || access.drafter || confirmer;
  const litAll = onByLayer.flat().filter(Boolean).length;
  const totalAll = counts.reduce((a, b) => a + b, 0);
  const mineNames = data.tracks.filter((t) => access.tracks.includes(t.id)).map((t) => `مسار ${t.name}`).join(" و");
  const toEnd = daysBetweenKeys(today, vision.horizonOn);
  const notice = (
    <section className="vz-room-note" aria-label={`${markConstruct(noun)} ${vision.name}`}>
      <VisionMark className="vz-room-mark" mark={vision.mark} counts={counts} on={onByLayer} paper label={`تحقّق ${litAll} من ${totalAll}`} />
      <div className="vz-room-tx">
        <strong className="vz-room-name">{vision.name}</strong>
        <span className="vz-room-line">
          {visionSpan(vision.startsOn, vision.startsLabel, vision.horizonOn, vision.horizonLabel)}
          {vision.status === "active" && toEnd >= 0 ? `، يبقى ${toEnd} ${arCounted(toEnd, DAY)} تقريبًا` : ""}
        </span>
        <span className="vz-room-line">
          {/* قائدُ المسار يرى مسارَه وحده: أرقامُه أرقامُ مساره، والهلالُ بجانبها هلالُ الرؤية كلّها */}
          {seesAll ? "" : `في ${mineNames}: `}تحقّق {done} من {total}{live ? `، وقيد العمل ${active}${waiting ? `، وبانتظار التأكيد ${waiting}` : ""}. وكل هدف يتحقق تُضاء قطعته في ${markConstruct(noun)} صفحة الرؤية العلنية.` : ". انتهت الرؤية، وتجمّدت أهدافها كما هي."}
        </span>
      </div>
    </section>
  );

  const set = (k: keyof GoalInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const confirmText = confirm
    ? confirm.act === "confirm"
      ? `ستُضاء قطعةُ «${confirm.g.title}» في ${markConstruct(noun)} صفحة الرؤية، ويراها الأعضاء متحقّقًا، ويُشعَر من رفعه.`
      : `ستُطفأ قطعةُ «${confirm.g.title}» في ${noun}، ويعود الهدف «${GOAL_STATUS.active.label}».`
    : undefined;
  return (
    <>
      <CollectionRoom<VisionGoalRow>
        navPath={VISION_ROOM.navPath}
        title={VISION_ROOM.title}
        // الإدارةُ (الفريق، والإغلاق، والرؤى القادمة) في «الرؤى»؛ وهنا صفحةُ الرؤية العلنيّة لكلّ من في الفريق
        extra={{ label: "صفحة الرؤية", icon: <ArrowSquareOut />, href: VISION_PATH }}
        // **سجلُّ الرؤية في آخر التبويب** (محمد ٢٠٢٦-١١-٢٢: «توقّعتُ أن يكون في نهاية التبويب قسمًا»): كلُّ فعلٍ بفاعله ووقته
        after={
          <AdLog<VisionLogRow>
            title="سجلّ الرؤية"
            icon={<ClockCounterClockwise />}
            items={data.log}
            at={(l) => l.at}
            idOf={(l) => String(l.id)}
            event={(l) => visionLogEvent(l, data.tracks)}
            same={visionLogSame}
            noun={AR_LOG}
            now={now}
            empty={{ title: "لا شيء في السجلّ بعد", text: "كل تغيير في حال هدف أو نصه أو في فريق الرؤية يُقيَّد هنا بفاعله ووقته." }}
          />
        }
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
          <AdCard key={g.id} seed={String(g.id)} stub={stubOf(g)} chips={badge(g)} title={g.title} onOpen={confirmer && live ? () => openEdit(g) : undefined} meta={info(g)} foot={acts(g)} />
        )}
        renderRow={(g) => (
          <AdRow
            key={g.id}
            title={g.title}
            onOpen={confirmer && live ? () => openEdit(g) : undefined}
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
        tone={confirm?.act === "confirm" ? "success" : "warning"}
        icon={confirm?.act === "confirm" ? <SealCheck /> : <ArrowCounterClockwise />}
        title={confirm?.act === "confirm" ? "تحقّق الهدف؟" : "إلغاء التحقّق؟"}
        text={confirmText}
        confirmLabel={confirm?.act === "confirm" ? "نعم، تحقّق" : "إلغاء التحقّق"}
        loading={pending}
        onConfirm={() => {
          if (!confirm) return;
          go(confirm.g, confirm.act, undefined, () => setConfirm(null));
        }}
      />


      {/* «أُنجز» بدليله (اختياريّ يعين على التأكيد)، والإرجاعُ بسببه (مطلوب: يصل قائدَ المسار) */}
      <Modal
        open={noting !== null}
        onClose={() => setNoting(null)}
        busy={pending}
        size="md"
        title={noting?.act === "return" ? "إرجاع الهدف" : "أُنجز الهدف"}
        description={noting
          ? noting.act === "return"
            ? `يعود «${noting.g.title}» إلى «قيد العمل»، ويصل السبب إلى من رفعه.`
            : `يصل المشرف العام وقائد الرؤية ليؤكّدا «${noting.g.title}»، ولا تُضاء قطعته حتى يُؤكَّد.`
          : undefined}
        footer={
          <>
            <Button variant="primary" size="md" loading={pending}
              onClick={() => noting && go(noting.g, noting.act, note, () => setNoting(null))}>
              {noting?.act === "return" ? "إرجاع" : "أُنجز"}
            </Button>
            <Button variant="ghost" size="md" onClick={() => setNoting(null)} disabled={pending}>إلغاء</Button>
          </>
        }
      >
        {noting?.act === "return" ? (
          <Textarea className="form-full" label="سبب الإرجاع" icon={<ArrowUUpLeft />} innerIcon={<PencilSimple />} placeholder="ما الذي ينقص الهدف ليتحقّق؟"
            rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} required />
        ) : (
          <Textarea className="form-full" label="الدليل" icon={<NotePencil />} innerIcon={<PencilSimple />} placeholder="رابط الخبر أو الصور، أو ما يثبت الإنجاز"
            helper="يعين من يؤكّد الهدف." rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} optional />
        )}
      </Modal>


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
