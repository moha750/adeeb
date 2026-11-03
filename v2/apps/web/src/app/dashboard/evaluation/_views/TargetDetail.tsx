"use client";

/**
 * **تفصيلُ مقيَّمٍ وبابُ تصحيحه** — هيكلُه «تبويباتٌ بغلاف الملفّ» (محمد ٢٠٢٦-١٠-٢٨: «كهيكلٍ وفكرة جميل»)،
 * ولباسُه لغةُ نوافذ المنصّة نفسُها لا لغةٌ مخترعة (وقال: «كتصميمٍ سيّئ… ولا تشطح عن الهويّة»):
 *
 * - **الرأسُ رأسُ نافذة الشخص** (`pvb-*`): غلافٌ منقوشٌ وأفتار، والاسمُ والمنصبُ والحالُ في الوسط.
 * - **التبويباتُ في الوسط** كالنافذة المبوّبة في `/ui/modal`، لا شريطًا ممدودًا.
 * - **المتنُ أقسامٌ بعناوينها وخلايا** (`ModalSectionHeading` و`pva-cell`) كنافذة الملفّ، والنتيجةُ خليّةٌ
 *   عريضةٌ عليها مسطرةُ الحدّ.
 * - **الأفعالُ في التذييل** كنافذة النموذج: زرُّ الفعل وزرُّ الإغلاق نصفين، لا أزرارَ في المتن.
 *
 * وما لا يتغيّر:
 * - النتيجةُ لمن يملك `view_leader_evaluation_results` وحده (تُنزع من الخادم لغيره أصلًا).
 * - المقيِّمون أسماءٌ وشقّ، **ولا شيءَ عن مشاركتهم** (السرّيّة).
 * - التصحيحُ (م١٠/3) لصاحب `manage_leader_evaluation`: فعلٌ يُختار، فسببٌ مكتوب. ولا تظلّم (م١٠/1).
 * - المنسّقُ المستبعَدُ بلا لجنةٍ سابقة: تُختار له لجنةٌ فيُنفَّذ (المسألة ٤)، **والقرارُ أوّلُ ما يُفتح**.
 * - الاختيارُ منسدلٌ لا قائمةٌ مبسوطة (أمرُ محمد ٢٠٢٦-٠٩-٢٤ في نافذة الحملات).
 */
import { useState } from "react";
import { Alert, Badge, Button, Modal, ModalSectionHeading, Segmented, Select, Textarea } from "@adeeb/design-system";
import { ArrowsClockwise } from "@/app/_components/glyphs";
import { ChartBar, Gauge, MathOperations, NotePencil, UserMinus, UserPlus, UserSwitch, UsersThree, Wrench } from "@phosphor-icons/react";
import { rankFor } from "@/lib/positionLabel";
import { Avatar } from "../../_components/Avatar";
import { Cell } from "../../_components/Cell";
import { useToast } from "../../_components/ToastProvider";
import type { ElectorRow, TargetRow } from "../data";
import type { EvaluationResult } from "../actions";
import { PART_WEIGHT, VERDICT_LABEL, partName, type EvaluatedRole, type Part, type Verdict } from "../vocab";
import { Pct, frac, pctNumber, quorumLine, seatLine } from "./parts";

export type DetailActions = {
  correctRater: (i: { targetId: number; raterId: string; action: "remove" | "add"; part?: Part; reason: string }) => Promise<EvaluationResult>;
  recompute: (targetId: number, reason: string) => Promise<EvaluationResult>;
  chooseReturn: (targetId: number, committeeId: number) => Promise<EvaluationResult>;
};

export const VERDICT_TONE: Record<Verdict, "success" | "danger" | "neutral"> = { kept: "success", removed: "danger", no_result: "neutral" };

type Committee = { id: number; name: string; department_id?: number | null };
type Props = {
  target: TargetRow;
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

type Tab = "decide" | "result" | "raters" | "fix";
type Fix = "remove" | "add" | "recompute";

const fm = (g: TargetRow["gender"], m: string, f: string) => (g === "female" ? f : m);
/** النسبةُ بالخطّ اللاتينيّ واتّجاهِه (CLAUDE.md §5): في خطّ المتن تنقلب «70%» إلى «%70». */
const P = ({ v }: { v: number | string }) => <span className="font-latin" dir="ltr">{v}%</span>;

/** الشارةُ: الحكمُ، أو «ينتظر لجنة»، أو حالُ الدورة قبل الحكم. */
function StateBadge({ t }: { t: TargetRow }) {
  if (t.awaiting_return) return <Badge tone="warning" variant="soft" dot>ينتظر لجنةً يعود إليها</Badge>;
  if (t.verdict) return <Badge tone={VERDICT_TONE[t.verdict]} variant="soft" dot>{VERDICT_LABEL[t.verdict]}</Badge>;
  if (t.cancelled) return <Badge tone="neutral" variant="soft">أُلغي تقييمُه</Badge>;
  return null;
}

/** كيف حُسبت (م٥): جملةٌ بلسان الناس لا باسم الفرع. */
function branchText(t: TargetRow): React.ReactNode {
  const m = partName("members", t.role_name);
  if (t.branch === "both") return <>حُسبت من الشقّين: <P v={70} /> ل{m} و<P v={30} /> للمجلس الإداري.</>;
  if (t.branch === "members_only") return `لم يقيّمه أحدٌ من المجلس الإداري، فحُسبت من ${m} وحدهم.`;
  if (t.branch === "council_only") return `لم يشارك نصفُ ${m}، فحُسبت من المجلس الإداري وحده.`;
  if (t.branch === "none") return "لم يكتمل ما تُحسب به، فلا نتيجة في هذه الدورة.";
  return null;
}

/** خليّةٌ بلغة `Cell` نفسِها (`pva-cell`) ومتنُها عنصرٌ لا نصّ: نسبةٌ تُعزل، أو جملةٌ فيها نسب. */
function RichCell({ icon, label, children, full }: { icon: React.ReactNode; label: React.ReactNode; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={"pva-cell" + (full ? " full wrap" : "")}>
      <div className="pva-lbl"><span className="pva-lic">{icon}</span>{label}</div>
      <div className="pva-val">{children}</div>
    </div>
  );
}

/** المشاركةُ في كلّ شقّ: كم من كم، وللأعضاء حالُ النصف (م٥/1). */
function Participation({ t, closed }: { t: TargetRow; closed: boolean }) {
  const q = quorumLine(t.members_ballots, t.members_eligible, closed);
  return (
    <section className="pva-sec">
      <ModalSectionHeading icon={<UsersThree />} title="المشاركة" />
      <div className="pva-grid">
        <Cell noCopy label={partName("members", t.role_name)} icon={<UsersThree />} value={`${t.members_ballots} من ${t.members_eligible}، ${q.text}`} />
        <Cell noCopy label="المجلس الإداري" icon={<UsersThree />} value={`${t.council_ballots} من ${t.council_eligible}`} />
      </div>
    </section>
  );
}

/** النتيجة: خليّةٌ عريضةٌ بالنسبة ومسطرةِ الحدّ، ثمّ الشقّان، ثمّ طريقةُ الحساب جملة. */
function Result({ t }: { t: TargetRow }) {
  const f = frac(t.final_num, t.final_den);
  const out = t.verdict === "removed";
  const why = branchText(t);
  return (
    <section className="pva-sec">
      <ModalSectionHeading icon={<ChartBar />} title="النتيجة" />
      <div className="pva-grid">
        {f ? (
          <div className={"pva-cell full evx-final" + (out ? " out" : "")}>
            <div className="pva-lbl"><span className="pva-lic"><Gauge /></span>النتيجة النهائية</div>
            <div className="evx-final-row">
              <Pct f={f} className="evx-final-n" />
              {t.verdict ? <span className="evx-final-v">{VERDICT_LABEL[t.verdict]}</span> : null}
            </div>
            <div className="evx-scale" aria-hidden>
              <span className="evx-scale-fill" style={{ inlineSize: `${pctNumber(f)}%` }} />
              <span className="evx-scale-cut" />
            </div>
            <div className="evx-scale-l" aria-hidden>
              <span>حدّ الاستبعاد <span className="font-latin" dir="ltr">40%</span></span>
            </div>
          </div>
        ) : null}
        {(["members", "council"] as const).map((p) => {
          const pf = p === "members" ? frac(t.members_num, t.members_den) : frac(t.council_num, t.council_den);
          return (
            <RichCell key={p} icon={<UsersThree />} label={<>{partName(p, t.role_name)} <P v={PART_WEIGHT[p]} /></>}>
              {pf ? <Pct f={pf} /> : "لا يُحتسب"}
            </RichCell>
          );
        })}
        {why ? <RichCell full icon={<MathOperations />} label="طريقة الحساب">{why}</RichCell> : null}
      </div>
    </section>
  );
}

/** المقيِّمون بشقّيهما: أفتارٌ واسم، والمشرفان (م٤/1) بعنوانٍ يقول لماذا هم مع المجلس. */
function Raters({ electorate, role }: { electorate: ElectorRow[] | null; role: EvaluatedRole }) {
  if (electorate === null) return <p className="mdl-muted">يُجلب المقيِّمون…</p>;
  const person = (e: ElectorRow) => (
    <div key={e.rater_id ?? e.full_name} className={"evx-person" + (e.removed ? " is-out" : "")}>
      <Avatar name={e.full_name ?? ""} gender={e.gender ?? undefined} size="sm" />
      {/* المنصبُ تحت الاسم (محمد ٢٠٢٦-١٠-٢٩): يقول لماذا هو هنا، لا من قيّم ولا بماذا */}
      <span className="evx-person-tx">
        <span className="evx-person-n">{e.full_name ?? "حسابٌ محذوف"}</span>
        {e.seat_title ? <span className="evx-person-s">{rankFor(e.seat_title, e.gender)}</span> : null}
      </span>
      {e.removed ? <Badge tone="neutral" variant="soft" size="sm">أُخرج</Badge> : e.added_by_correction ? <Badge tone="info" variant="soft" size="sm">أُضيف</Badge> : null}
    </div>
  );
  // ثلاثةُ أقسامٍ بلغةٍ واحدة (محمد ٢٠٢٦-١٠-٢٩): الأعضاء، والمجلسُ الإداريّ، والمشرفون على اللجنة من الإدارتين.
  // والمشرفون في شقّ المجلس حسابًا (م٤/1)، لكنّهم ليسوا منه، فلهم قسمُهم وعددُهم.
  const groups = [
    { key: "members", title: partName("members", role), list: electorate.filter((e) => e.part === "members") },
    { key: "council", title: "المجلس الإداري", list: electorate.filter((e) => e.part === "council" && !e.supervisor) },
    { key: "sup", title: "المشرفون على اللجنة من الإدارتين", list: electorate.filter((e) => e.part === "council" && e.supervisor) },
  ].filter((g) => g.key !== "sup" || g.list.length > 0);
  return (
    <div className="pva-sections">
      {groups.map((g) => (
        <section key={g.key} className="pva-sec">
          <ModalSectionHeading icon={<UsersThree />} title={`${g.title} (${g.list.filter((e) => !e.removed).length})`} />
          {g.list.length ? <div className="evx-people">{g.list.map(person)}</div> : <p className="mdl-muted">لا أحد.</p>}
        </section>
      ))}
    </div>
  );
}

export function TargetDetail(props: Props) {
  const { target: t, electorate, canManage, actions, onClose, onDone } = props;
  const closed = props.closed ?? t.verdict !== null;
  const results = (props.canViewResults ?? true) && t.verdict !== null;
  const departments = props.departments ?? {};
  const decided = t.verdict !== null;
  const deciding = t.awaiting_return && canManage;
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(deciding ? "decide" : "result");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // الاختيارُ والتصحيحُ مرفوعان إلى هنا: زرُّهما في التذييل
  const [to, setTo] = useState("");
  const [fix, setFix] = useState<Fix>("remove");
  const [who, setWho] = useState("");
  const [part, setPart] = useState<Part>("members");
  const [reason, setReason] = useState("");

  const run = async (fn: () => Promise<EvaluationResult>, after?: () => void) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setError(r.message);
    toast.success(r.message);
    after?.();
    onDone?.();
  };

  const live = (electorate ?? []).filter((e) => !e.removed && e.rater_id);
  const liveIds = live.map((e) => e.rater_id);
  const addable = props.people.filter((p) => !liveIds.includes(p.id) && p.id !== t.user_id);
  const why = reason.trim();
  const fixReady = why.length >= 3 && (fix === "recompute" || !!who);
  const membersName = partName("members", t.role_name);
  const after = decided ? " ثمّ يُعاد الحساب، فيُعاد إلى منصبه أو يُستبعد إن تغيّر الحكم." : "";
  const fixHint: Record<Fix, string> = {
    remove: `من دخل المقيِّمين بالخطأ: يُبطَل ما كتبه إن كان قيّم.${after}`,
    add: `من سقط من المقيِّمين بالخطأ: يُضاف إليهم${decided ? " ويُحسب في عددهم" : " ويقيّم ما بقيت الدورةُ مفتوحة"}.${after}`,
    recompute: "يُعاد الحسابُ بالأوراق الحاضرة، فيُعاد إلى منصبه أو يُستبعد إن تغيّر الحكم.",
  };
  const sorted = [...props.committees].sort(
    (a, b) => Number(b.department_id === t.department_id) - Number(a.department_id === t.department_id) || a.name.localeCompare(b.name, "ar"),
  );
  const chosen = props.committees.find((c) => String(c.id) === to);

  const tabs: { value: Tab; label: string }[] = [
    ...(deciding ? [{ value: "decide" as const, label: "القرار" }] : []),
    { value: "result", label: results ? "النتيجة" : "المشاركة" },
    { value: "raters", label: "المقيِّمون" },
    ...(canManage ? [{ value: "fix" as const, label: "التصحيح" }] : []),
  ];

  const close = <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>إغلاق</Button>;
  const footer =
    tab === "decide" ? (
      <>
        <Button variant="danger" size="md" disabled={!to} loading={busy} onClick={() => run(() => actions.chooseReturn(t.id, Number(to)))}>
          <UserSwitch aria-hidden />
          نفّذ الاستبعاد
        </Button>
        {close}
      </>
    ) : tab === "fix" ? (
      <>
        <Button
          variant={fix === "remove" ? "danger" : "primary"}
          size="md"
          disabled={!fixReady}
          loading={busy}
          onClick={() =>
            run(
              () =>
                fix === "recompute"
                  ? actions.recompute(t.id, why)
                  : actions.correctRater({ targetId: t.id, raterId: who, action: fix, part: fix === "add" ? part : undefined, reason: why }),
              () => {
                setWho("");
                setReason("");
              },
            )
          }
        >
          {fix === "remove" ? <UserMinus aria-hidden /> : fix === "add" ? <UserPlus aria-hidden /> : <ArrowsClockwise aria-hidden />}
          {fix === "remove" ? "أخرِجه" : fix === "add" ? "أدخِله" : "أعِد الحساب"}
        </Button>
        {close}
      </>
    ) : (
      close
    );

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      className="pvb-modal"
      busy={busy}
      title={t.full_name}
      hero={<Avatar name={t.full_name} gender={t.gender} size="2xl" className="pvb-av" />}
      footer={footer}
    >
      <div className="pvb-head">
        <div className="pvb-name">{t.full_name}</div>
        <div className="pvb-role">{seatLine(t.role_name, t.unit_name, t.gender)}</div>
        <div className="pvb-badges"><StateBadge t={t} /></div>
      </div>

      <div className="evx-tabs">
        <Segmented aria-label="أقسام التقييم" items={tabs} value={tab} onValueChange={(v) => setTab(v as Tab)} />
      </div>

      {tab === "decide" ? (
        <div className="pva-sections">
          <section className="pva-sec">
            <ModalSectionHeading tone="danger" icon={<UserSwitch />} title={`إلى أيّ لجنةٍ ${fm(t.gender, "يعود", "تعود")}؟`} />
            <p className="evx-lead">
              {fm(t.gender, "لا لجنةَ سابقةَ له يعود إليها، فيبقى في منصبه", "لا لجنةَ سابقةَ لها تعود إليها، فتبقى في منصبها")} حتى تختار.
              {" "}{fm(t.gender, "ويعود", "وتعود")} عضوًا في اللجنة التي تختارها{chosen ? `، ${chosen.name}` : ""}، {fm(t.gender, "ويُبلَّغ", "وتُبلَّغ")} بالجرس والبريد.
            </p>
            <Select
              label="اللجنة"
              icon={<UsersThree />}
              placeholder="اختر لجنة"
              value={to}
              onValueChange={setTo}
              options={sorted.map((c) => ({
                value: String(c.id),
                label: c.name,
                hint: c.department_id === t.department_id ? `من ${fm(t.gender, "قسمه", "قسمها")}` : c.department_id ? departments[c.department_id] : undefined,
              }))}
            />
          </section>
        </div>
      ) : tab === "result" ? (
        <div className="pva-sections">
          {results ? <Result t={t} /> : null}
          <Participation t={t} closed={closed} />
        </div>
      ) : tab === "raters" ? (
        <Raters electorate={electorate} role={t.role_name} />
      ) : (
        <div className="form-grid">
          {/* «ماذا تصحّح؟» حقلٌ منسدلٌ لا مبدّل: مبدّلٌ تحت مبدّل التبويبات يُقرأ تبويبًا ثانيًا (محمد ٢٠٢٦-١٠-٢٨) */}
          <div className="form-full">
            <Select
              label="ماذا تصحّح؟"
              icon={<Wrench />}
              value={fix}
              onValueChange={(v) => {
                setFix(v as Fix);
                setWho("");
              }}
              options={[
                { value: "remove", label: "أخرِج مقيِّمًا دخل بالخطأ" },
                { value: "add", label: "أدخِل مقيِّمًا سقط بالخطأ" },
                ...(decided ? [{ value: "recompute", label: "أعِد الحساب" }] : []),
              ]}
            />
            <p className="evx-hint">{fixHint[fix]}</p>
          </div>
          {fix === "remove" ? (
            <div className="form-full">
              <Select required label="من دخل بالخطأ" icon={<UserMinus />} searchable placeholder="اختر من المقيِّمين" value={who} onValueChange={setWho}
                options={live.map((e) => ({ value: e.rater_id!, label: e.full_name ?? "", hint: partName(e.part, t.role_name) }))} />
            </div>
          ) : fix === "add" ? (
            <>
              <Select required label="من سقط بالخطأ" icon={<UserPlus />} searchable placeholder="اختر العضو" value={who} onValueChange={setWho}
                options={addable.map((p) => ({ value: p.id, label: p.name }))} />
              <Select label="يقيّم مع" icon={<UsersThree />} value={part} onValueChange={(v) => setPart(v as Part)}
                options={[{ value: "members", label: membersName }, { value: "council", label: "المجلس الإداري" }]} />
            </>
          ) : null}
          <Textarea className="form-full" required label="سبب التصحيح" icon={<NotePencil />} innerIcon={<NotePencil />} placeholder="ما الخطأ الذي يُصحَّح؟ يُحفظ في السجلّ." value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}

      {error ? <Alert tone="danger" compact>{error}</Alert> : null}
    </Modal>
  );
}
