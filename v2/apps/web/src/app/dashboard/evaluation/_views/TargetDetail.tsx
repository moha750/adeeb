"use client";

/**
 * **تفصيلُ مقيَّمٍ وبابُ تصحيحه** — أُعيد من الأساس بعد جولة ملاحظات المحاكي (محمد ٢٠٢٦-١٠-٢٧: «سيّئةٌ جدًّا
 * وقبيحة»). كان يلبس غلافَ نافذة الشخص ولا يتبع نمطَها، ويضع سطحًا مؤطَّرًا في سطح (ق١٢)، وزرَّ «أخرِج» أحمرَ
 * على كلّ اسم. وله الآن وجهان قيد الاختيار يتقاسمان القطعَ نفسَها:
 *
 * - **«ملفّ»**: نمطُ نافذة الشخص في المنصّة بعينه (`pvb-*` غلافٌ وأفتار، ثمّ أقسامٌ بعناوينها `ModalSectionHeading`).
 * - **«تبويبات»**: غلافُ «الملفّ» ورأسُه، ثمّ تبويبٌ لكلّ شأن، **والقرارُ أوّلًا** حين ينتظر منسّقٌ لجنته.
 *
 * وما لا يتغيّر بينهما:
 * - النتيجةُ لمن يملك `view_leader_evaluation_results` وحده (تُنزع من الخادم لغيره أصلًا).
 * - المقيِّمون أسماءٌ وشقّ، **ولا شيءَ عن مشاركتهم** (السرّيّة).
 * - التصحيحُ (م١٠/3) لصاحب `manage_leader_evaluation`: فعلٌ واحدٌ يُختار، ثمّ سببٌ مكتوب، ثمّ زرّ. ولا تظلّم (م١٠/1).
 * - المنسّقُ المستبعَدُ بلا لجنةٍ سابقة: تُختار له لجنةٌ فيُنفَّذ (المسألة ٤).
 */
import { useState } from "react";
import { Alert, Badge, Button, Modal, ModalSectionHeading, OptionList, Segmented, Select, Textarea } from "@adeeb/design-system";
import { ArrowsClockwise } from "@/app/_components/glyphs";
import { ChartBar, NotePencil, UserMinus, UserPlus, UserSwitch, UsersThree } from "@phosphor-icons/react";
import { Avatar } from "../../_components/Avatar";
import { useToast } from "../../_components/ToastProvider";
import type { ElectorRow, TargetRow } from "../data";
import type { EvaluationResult } from "../actions";
import { PART_WEIGHT, VERDICT_LABEL, partName, type EvaluatedRole, type Part, type Verdict } from "../vocab";
import { Of, Pct, frac, pctNumber, quorumLine, seatLine } from "./parts";

export type DetailActions = {
  correctRater: (i: { targetId: number; raterId: string; action: "remove" | "add"; part?: Part; reason: string }) => Promise<EvaluationResult>;
  recompute: (targetId: number, reason: string) => Promise<EvaluationResult>;
  chooseReturn: (targetId: number, committeeId: number) => Promise<EvaluationResult>;
};

export const VERDICT_TONE: Record<Verdict, "success" | "danger" | "neutral"> = { kept: "success", removed: "danger", no_result: "neutral" };

type Committee = { id: number; name: string; department_id?: number | null };
type Props = {
  target: TargetRow;
  layout?: "profile" | "tabs";
  /** `null` ما دام يُجلب. */
  electorate: ElectorRow[] | null;
  people: { id: string; name: string }[];
  committees: Committee[];
  departments?: Record<number, string>;
  canManage: boolean;
  canViewResults?: boolean;
  closed?: boolean;
  actions: DetailActions;
  onClose: () => void;
  /** بعد كلّ فعلٍ نجح: يُعاد جلبُ المقيِّمين والدورة. */
  onDone?: () => void;
};

const fm = (g: TargetRow["gender"], m: string, f: string) => (g === "female" ? f : m);
const firstName = (n: string) => n.split(" ")[0];

/** الشارةُ: الحكمُ، أو «ينتظر لجنة»، أو حالُ الدورة قبل الحكم. */
function StateBadge({ t }: { t: TargetRow }) {
  if (t.awaiting_return) return <Badge tone="warning" variant="soft" dot>ينتظر لجنةً يعود إليها</Badge>;
  if (t.verdict) return <Badge tone={VERDICT_TONE[t.verdict]} variant="soft" dot>{VERDICT_LABEL[t.verdict]}</Badge>;
  if (t.cancelled) return <Badge tone="neutral" variant="soft">أُلغي تقييمُه</Badge>;
  return null;
}

/** كيف حُسبت (م٥): جملةٌ تقول الفرعَ بلسان الناس لا باسمه. */
function BranchLine({ t }: { t: TargetRow }) {
  if (t.branch === "both") {
    return <p className="evx-branch">حُسبت من الشقّين: <span className="font-latin" dir="ltr">70%</span> للأعضاء و<span className="font-latin" dir="ltr">30%</span> للمجلس الإداري.</p>;
  }
  if (t.branch === "members_only") return <p className="evx-branch">لم يقيّمه أحدٌ من المجلس الإداري، فحُسبت من الأعضاء وحدهم.</p>;
  if (t.branch === "council_only") return <p className="evx-branch">لم يشارك نصفُ الأعضاء، فحُسبت من المجلس الإداري وحده.</p>;
  if (t.branch === "none") return <p className="evx-branch">لم يكتمل ما تُحسب به، فلا نتيجة في هذه الدورة.</p>;
  return null;
}

/** النتيجةُ على مسطرةٍ من 0 إلى 100 عليها حدُّ الاستبعاد مسمًّى، ثمّ الشقّان صفّين. */
function ResultView({ t, closed, bare }: { t: TargetRow; closed: boolean; bare?: boolean }) {
  const f = frac(t.final_num, t.final_den);
  const out = t.verdict === "removed";
  return (
    <div className="evx-result">
      {f ? (
        <div className={"evx-scale" + (out ? " out" : "")}>
          {/* في «التبويبات» الرقمُ في الرأس فوق التبويب، فلا يُعاد هنا */}
          {bare ? null : (
            <div className="evx-scale-top">
              <Pct f={f} className="evx-scale-n" />
              <span className="evx-scale-v">{t.verdict ? VERDICT_LABEL[t.verdict] : ""}</span>
            </div>
          )}
          <div className="evx-scale-track" aria-hidden>
            <span className="evx-scale-fill" style={{ inlineSize: `${pctNumber(f)}%` }} />
            <span className="evx-scale-cut"><span>حدّ الاستبعاد <span className="font-latin" dir="ltr">40%</span></span></span>
          </div>
        </div>
      ) : null}
      <Parts t={t} closed={closed} results />
      <BranchLine t={t} />
    </div>
  );
}

/** الشقّان: الوزنُ والنسبةُ (لمن يرى النتائج بعد الحكم) والمشاركةُ وحالُ النصاب. */
function Parts({ t, closed, results }: { t: TargetRow; closed: boolean; results: boolean }) {
  return (
    <div className="evx-parts">
      {(["members", "council"] as const).map((p) => {
        const f = p === "members" ? frac(t.members_num, t.members_den) : frac(t.council_num, t.council_den);
        const n = p === "members" ? t.members_ballots : t.council_ballots;
        const of = p === "members" ? t.members_eligible : t.council_eligible;
        const q = p === "members" ? quorumLine(n, of, closed) : null;
        return (
          <div key={p} className="evx-part">
            <span className="evx-part-k">
              {partName(p, t.role_name)}
              <span className="font-latin" dir="ltr">{PART_WEIGHT[p]}%</span>
            </span>
            <span className="evx-part-tx">
              شارك <Of n={n} of={of} />
              {q ? <span className={"evx-q" + (q.met ? " met" : "")}>، {q.text}</span> : null}
            </span>
            {results ? (f ? <Pct f={f} className="evx-part-n" /> : <span className="evx-part-none">لا يُحتسب</span>) : null}
          </div>
        );
      })}
    </div>
  );
}

/** المقيِّمون عمودين بشقّيهما: أسماءٌ فحسب، وما صحّحته الإدارةُ موسوم. */
function Raters({ electorate, role }: { electorate: ElectorRow[] | null; role: EvaluatedRole }) {
  if (electorate === null) return <p className="evx-hint">يُجلب المقيِّمون…</p>;
  const row = (e: ElectorRow) => (
    <div key={e.rater_id ?? e.full_name} className={"evx-rater" + (e.removed ? " is-out" : "")}>
      <span>{e.full_name ?? "حسابٌ محذوف"}</span>
      {e.removed ? <em>أُخرج</em> : e.added_by_correction ? <em className="add">أُضيف</em> : null}
    </div>
  );
  return (
    <div className="evx-raters">
      {(["members", "council"] as const).map((p) => {
        const list = electorate.filter((e) => e.part === p);
        return (
          <div key={p} className="evx-col">
            <div className="evx-col-h">
              {partName(p, role)}
              <span className="font-latin">{list.filter((e) => !e.removed).length}</span>
            </div>
            {list.filter((e) => !e.supervisor).map(row)}
            {/* المشرفان (م٤/1) يقيّمان مع المجلس وليسا منه: عنوانٌ يقول ذلك جملةً لا وسمًا (محمد ٢٠٢٦-١٠-٢٨) */}
            {list.some((e) => e.supervisor) ? (
              <>
                <div className="evx-sub">ومعهم المشرفون على اللجنة من الإدارتين</div>
                {list.filter((e) => e.supervisor).map(row)}
              </>
            ) : null}
            {list.length === 0 ? <span className="evx-hint">لا أحد.</span> : null}
          </div>
        );
      })}
    </div>
  );
}

type Run = (key: string, fn: () => Promise<EvaluationResult>) => Promise<void>;

/** التصحيح (م١٠/3): فعلٌ واحدٌ يُختار، فحقولُه، فسببُه، فزرُّه. لا أزرارَ حمراءَ على كلّ اسم. */
function Correction({ t, electorate, people, actions, run, busy }: { t: TargetRow; electorate: ElectorRow[] | null; people: Props["people"]; actions: DetailActions; run: Run; busy: string | null }) {
  const decided = t.verdict !== null;
  const [mode, setMode] = useState<"remove" | "add" | "recompute">("remove");
  const [who, setWho] = useState("");
  const [part, setPart] = useState<Part>("members");
  const [reason, setReason] = useState("");
  const live = (electorate ?? []).filter((e) => !e.removed && e.rater_id);
  const liveIds = live.map((e) => e.rater_id);
  const addable = people.filter((p) => !liveIds.includes(p.id) && p.id !== t.user_id);
  const why = reason.trim();
  const ready = why.length >= 3 && (mode === "recompute" || !!who);
  const after = decided ? " ثمّ يُعاد الحساب، فيُعاد إلى منصبه أو يُستبعد إن تغيّر الحكم." : "";
  const hint = {
    remove: `من دخل المقيِّمين بالخطأ: يُبطَل ما كتبه إن كان قيّم.${after}`,
    add: `من سقط من المقيِّمين بالخطأ: يُضاف إليهم${decided ? " ويُحسب في عددهم" : " ويقيّم ما بقيت الدورةُ مفتوحة"}.${after}`,
    recompute: "يُعاد الحسابُ بالأوراق الحاضرة، فيُعاد إلى منصبه أو يُستبعد إن تغيّر الحكم.",
  }[mode];

  const submit = () =>
    run(mode, () =>
      mode === "recompute"
        ? actions.recompute(t.id, why)
        : actions.correctRater({ targetId: t.id, raterId: who, action: mode, part: mode === "add" ? part : undefined, reason: why }),
    )
      .then(() => {
        setWho("");
        setReason("");
      })
      .catch(() => undefined);

  return (
    <div className="evx-form">
      <Segmented
        wide
        items={[
          { value: "remove", label: "أخرِج مقيِّمًا" },
          { value: "add", label: "أدخِل مقيِّمًا" },
          ...(decided ? [{ value: "recompute", label: "أعِد الحساب" }] : []),
        ]}
        value={mode}
        onValueChange={(v) => {
          setMode(v as typeof mode);
          setWho("");
        }}
      />
      <p className="evx-hint">{hint}</p>
      {mode === "remove" ? (
        <Select label="من دخل بالخطأ" icon={<UserMinus />} searchable placeholder="اختر من المقيِّمين" value={who} onValueChange={setWho}
          options={live.map((e) => ({ value: e.rater_id!, label: e.full_name ?? "", hint: partName(e.part, t.role_name) }))} />
      ) : mode === "add" ? (
        <div className="form-grid">
          <Select label="من سقط بالخطأ" icon={<UserPlus />} searchable placeholder="اختر العضو" value={who} onValueChange={setWho}
            options={addable.map((p) => ({ value: p.id, label: p.name }))} />
          <Select label="يقيّم من" icon={<UsersThree />} value={part} onValueChange={(v) => setPart(v as Part)}
            options={(["members", "council"] as const).map((p) => ({ value: p, label: partName(p, t.role_name) }))} />
        </div>
      ) : null}
      <Textarea label="سبب التصحيح" icon={<NotePencil />} innerIcon={<NotePencil />} placeholder="ما الخطأ الذي يُصحَّح؟ يُحفظ في السجلّ." value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="btn-row">
        <Button variant={mode === "remove" ? "danger" : "primary"} disabled={!ready} loading={busy === mode} onClick={submit}>
          {mode === "remove" ? <UserMinus aria-hidden /> : mode === "add" ? <UserPlus aria-hidden /> : <ArrowsClockwise aria-hidden />}
          {mode === "remove" ? "أخرِجه" : mode === "add" ? "أدخِله" : "أعِد الحساب"}
        </Button>
      </div>
    </div>
  );
}

/** اختيارُ لجنة المنسّق المستبعَد (المسألة ٤): قائمةً بأقسامها، ولجانُ قسمه أوّلًا. */
function ReturnChooser({ t, committees, departments, mode, actions, run, busy }: { t: TargetRow; committees: Committee[]; departments: Record<number, string>; mode: "select" | "list"; actions: DetailActions; run: Run; busy: string | null }) {
  const [to, setTo] = useState<string>("");
  const sorted = [...committees].sort((a, b) => Number(b.department_id === t.department_id) - Number(a.department_id === t.department_id) || a.name.localeCompare(b.name, "ar"));
  const hint = (c: Committee) => (c.department_id === t.department_id ? `من ${fm(t.gender, "قسمه", "قسمها")}` : c.department_id ? departments[c.department_id] : undefined);
  const go = () => run("return", () => actions.chooseReturn(t.id, Number(to)));
  const chosen = committees.find((c) => String(c.id) === to);
  return (
    <div className="evx-form">
      <p className="evx-lead">
        {fm(t.gender, "لا لجنةَ سابقةَ له يعود", "لا لجنةَ سابقةَ لها تعود")} إليها، {fm(t.gender, "فيبقى في منصبه", "فتبقى في منصبها")} حتى تختار.
        {" "}{fm(t.gender, "ويعود", "وتعود")} عضوًا في اللجنة التي تختارها، {fm(t.gender, "ويُبلَّغ", "وتُبلَّغ")} بالجرس والبريد.
      </p>
      {mode === "select" ? (
        <Select label="اللجنة" icon={<UsersThree />} placeholder="اختر لجنة" value={to} onValueChange={setTo}
          options={sorted.map((c) => ({ value: String(c.id), label: c.name, hint: hint(c) }))} />
      ) : (
        <OptionList aria-label="اللجان" value={to || null} onValueChange={setTo}
          items={sorted.map((c) => ({ value: String(c.id), label: c.name, hint: hint(c) }))} />
      )}
      <div className="btn-row">
        <Button variant="danger" disabled={!to} loading={busy === "return"} onClick={go}>
          <UserSwitch aria-hidden />
          {chosen ? `نفّذ الاستبعاد إلى ${chosen.name}` : "نفّذ الاستبعاد"}
        </Button>
      </div>
    </div>
  );
}

export function TargetDetail(props: Props) {
  const { target: t, electorate, canManage, actions, onClose, onDone } = props;
  const layout = props.layout ?? "profile";
  const closed = props.closed ?? t.verdict !== null;
  const results = (props.canViewResults ?? true) && t.verdict !== null;
  const departments = props.departments ?? {};
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deciding = t.awaiting_return && canManage;
  const [tab, setTab] = useState<string>(deciding ? "decide" : "result");

  const run: Run = async (key, fn) => {
    setBusy(key);
    setError(null);
    const r = await fn();
    setBusy(null);
    if (!r.ok) {
      setError(r.message);
      throw new Error(r.message);
    }
    toast.success(r.message);
    onDone?.();
  };
  const safeRun: Run = (key, fn) => run(key, fn).catch(() => undefined);

  const seat = seatLine(t.role_name, t.unit_name, t.gender);
  const liveCount = (electorate ?? []).filter((e) => !e.removed).length;
  const close = <Button variant="ghost" onClick={onClose} disabled={busy !== null}>إغلاق</Button>;
  const chooser = (mode: "select" | "list") => (
    <ReturnChooser t={t} committees={props.committees} departments={departments} mode={mode} actions={actions} run={safeRun} busy={busy} />
  );
  const correction = <Correction t={t} electorate={electorate} people={props.people} actions={actions} run={run} busy={busy} />;
  const resultOrParts = (bare: boolean) => (results ? <ResultView t={t} closed={closed} bare={bare} /> : <Parts t={t} closed={closed} results={false} />);

  if (layout === "tabs") {
    const tabs = [
      ...(deciding ? [{ value: "decide", label: "القرار" }] : []),
      { value: "result", label: results ? "النتيجة" : "المشاركة" },
      { value: "raters", label: electorate ? `المقيِّمون ${liveCount}` : "المقيِّمون" },
      ...(canManage ? [{ value: "fix", label: "التصحيح" }] : []),
    ];
    const f = frac(t.final_num, t.final_den);
    return (
      // «تبويباتٌ بغلاف الملفّ» (اقتراحُ Claude، وافق محمد ٢٠٢٦-١٠-٢٨ على عرضه): هويّةُ نافذة الشخص من «الملفّ»
      // (غلافٌ وأفتار، والاسمُ والمنصبُ والحالُ في الوسط)، وترتيبُ العمل من «التبويبات»
      <Modal
        open
        onClose={onClose}
        size="lg"
        className="pvb-modal"
        busy={busy !== null}
        title={t.full_name}
        hero={<Avatar name={t.full_name} gender={t.gender} size="2xl" className="pvb-av" />}
        footer={close}
      >
        <div className="pvb-head">
          <div className="pvb-name">{t.full_name}</div>
          <div className="pvb-role">{seat}</div>
          <div className={"pvb-badges evx-sum" + (t.verdict === "removed" ? " out" : "")}>
            {results && f ? <Pct f={f} className="evx-sum-n" /> : null}
            <StateBadge t={t} />
          </div>
        </div>
        <Segmented wide items={tabs} value={tab} onValueChange={setTab} />
        {tab === "decide" ? (
          <>
            <h3 className="evx-ask">إلى أيّ لجنةٍ {fm(t.gender, "يعود", "تعود")} {firstName(t.full_name)}؟</h3>
            {chooser("list")}
          </>
        ) : tab === "result" ? (
          resultOrParts(true)
        ) : tab === "raters" ? (
          <Raters electorate={electorate} role={t.role_name} />
        ) : (
          correction
        )}
        {error ? <Alert tone="danger" compact>{error}</Alert> : null}
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      className="pvb-modal"
      busy={busy !== null}
      title={t.full_name}
      hero={<Avatar name={t.full_name} gender={t.gender} size="2xl" className="pvb-av" />}
      footer={close}
    >
      <div className="pvb-head">
        <div className="pvb-name">{t.full_name}</div>
        <div className="pvb-role">{seat}</div>
        <div className="pvb-badges"><StateBadge t={t} /></div>
      </div>
      <div className="pva-sections">
        {deciding ? (
          <section className="pva-sec">
            <ModalSectionHeading tone="danger" icon={<UserSwitch />} title={`إلى أيّ لجنةٍ ${fm(t.gender, "يعود", "تعود")}؟`} />
            {chooser("select")}
          </section>
        ) : null}
        <section className="pva-sec">
          <ModalSectionHeading icon={<ChartBar />} title={results ? "النتيجة" : "المشاركة"} />
          {resultOrParts(false)}
        </section>
        <section className="pva-sec">
          <ModalSectionHeading icon={<UsersThree />} title="المقيِّمون" />
          <Raters electorate={electorate} role={t.role_name} />
        </section>
        {canManage ? (
          <section className="pva-sec">
            <ModalSectionHeading icon={<NotePencil />} title="التصحيح" />
            {correction}
          </section>
        ) : null}
      </div>
      {error ? <Alert tone="danger" compact>{error}</Alert> : null}
    </Modal>
  );
}
