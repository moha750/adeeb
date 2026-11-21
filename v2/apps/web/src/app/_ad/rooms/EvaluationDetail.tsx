"use client";

/**
 * **تفصيلُ المقيَّم على الهويّة الجديدة** (اعتمده محمد ٢٠٢٦-١١-٢٠: «ممتاز») — السلوكُ سلوكُ `dashboard/evaluation/_views/TargetDetail.tsx`
 * حرفًا: التبويباتُ نفسُها (القرار، والمشاركة أو النتيجة، والمقيِّمون، والتصحيح)، والأفعالُ نفسُها في التذييل، والسرّيّةُ نفسُها (أسماءٌ
 * وشقّ، ولا شيءَ عن مشاركة أحد).
 *
 * والشكلُ بعد خمس جولات (ألف: سطورٌ «سامجة»؛ باء: كروتُ رقمٍ بلوحٍ ثالث؛ جيم: أرقامٌ سائبةٌ بثلاث لغات؛ دال الأولى: كروتٌ في النافذة —
 * «كونتينر داخل كونتينر»): **النافذةُ هي الوعاء**، والقسمُ هيكلُ قسم «حسابي» بلا حدٍّ ولا أرض، والأقسامُ يفصلها خيطٌ بعرض الورقة؛
 * والنتيجةُ أرقامُ التذكرة بشرائطها وعلى شريطها حدُّ الاستبعاد بالقطع وكلمته، والحكمُ لصقَ رقمه بلونه وجنس صاحبه؛ وكلُّ رمزٍ على المربّع
 * المصبوغ، والكحليُّ للّوح والتبويب المختار وحدهما. والنافذةُ قالبُ النوافذ العاديّ لا نافذةُ الملفّ (غلافُ الصورة أكل نصفَها).
 */
import { useState, type ReactNode } from "react";
import { Alert, Button, Modal, Select, Textarea } from "@adeeb/design-system";
import { ArrowsClockwise, DuotoneZone, Star } from "@/app/_components/glyphs";
import { Briefcase, Compass, Crown, SealCheck, Gauge, NotePencil, Scales, StarHalf, UserCircle, UserMinus, UserPlus, UserSwitch, UsersThree, Wrench } from "@phosphor-icons/react";
import { rankFor } from "@/lib/positionLabel";
import { percentText, type Fraction } from "@/lib/evaluation/score";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { ElectorRow, TargetRow } from "@/app/dashboard/evaluation/data";
import type { EvaluationResult } from "@/app/dashboard/evaluation/actions";
import { partName, verdictWord, type Part } from "@/app/dashboard/evaluation/vocab";
import { frac, quorumLine, seatLine, type DetailActions } from "@/app/dashboard/evaluation/shared";
import { AdFigureRow, AdNote, AdSwitch } from "../primitives";
import { AdLine, AdSection } from "../account";
import { arCount, type ArForms } from "@/lib/arabicCount";

/** «4 من 13 عضوًا»: المجموعُ بمعدوده بعد «من» (مجرورًا: «من عضوين»، «من 7 أعضاء»)، فيُقرأ الرقمُ أوراقًا لا درجة (محمد ٢٠٢٦-١١-٢٠: «غيرُ واضحة») */
export const ofMembers = (n: number, of: number) =>
  of === 1 ? `${n} من عضوٍ واحد` : of === 2 ? `${n} من عضوين` : of <= 10 ? `${n} من ${of} أعضاء` : `${n} من ${of} عضوًا`;

/** النسبةُ بالخطّ اللاتينيّ واتّجاهه (CLAUDE.md §5): بخطّ المتن تنقلب علامتُها إلى أوّلها («%39.4») ولو عُزلت باتّجاهها */
const P = (n: number | string) => <span className="font-latin" dir="ltr">{n}%</span>;

const fm = (g: TargetRow["gender"], m: string, f: string) => (g === "female" ? f : m);

type Committee = { id: number; name: string; department_id?: number | null };
type Props = {
  target: TargetRow;
  electorate: ElectorRow[] | null;
  people: { id: string; name: string }[];
  committees: Committee[];
  departments?: Record<number, string>;
  canManage: boolean;
  canViewResults?: boolean;
  closed?: boolean;
  actions: DetailActions;
  onClose: () => void;
  onDone?: () => void;
};
type Tab = "decide" | "result" | "raters" | "fix";
type Fix = "remove" | "add" | "recompute";

/** كيف حُسبت (م٥): جملةٌ بلسان الناس لا باسم الفرع. */
function branchText(t: TargetRow): ReactNode {
  const m = partName("members", t.role_name);
  if (t.branch === "both") return <>حُسبت من الشقّين: {P(70)} ل{m} و{P(30)} للمجلس الإداري.</>;
  if (t.branch === "members_only") return `لم يقيّمه أحدٌ من المجلس الإداري، فحُسبت من ${m} وحدهم.`;
  if (t.branch === "council_only") return `لم يشارك نصفُ ${m}، فحُسبت من المجلس الإداري وحده.`;
  if (t.branch === "none") return "لم يكتمل ما تُحسب به، فلا نتيجة في تقييم هذا الشهر.";
  return null;
}

/** رمزُ المقعد كرمزه في سطر الغرفة: البوصلةُ للمنسّق، والنجمةُ للقائد ونصفُها للنائب، والشخصُ لمن سواهم */
export const seatIcon = (seat?: string | null): ReactNode => {
  const t = seat ?? "";
  // كرمز الرتبة في تعيين المناصب (`AssignmentsRoom`): تاجٌ للرئيس، وحقيبةٌ للتنفيذيّ، وشعارا الإدارتين، وبوصلةٌ للمنسّق، ونجمةٌ للقائد ونصفُها للنائب
  if (t.startsWith("رئيس أد")) return <Crown />;
  if (t.includes("التنفيذي")) return <Briefcase />;
  if (t.includes("الموارد البشرية")) return <UsersThree />;
  if (t.includes("الضمان")) return <SealCheck />;
  if (t.startsWith("منسّق") || t.startsWith("منسق")) return <Compass />;
  if (t.startsWith("نائب")) return <StarHalf />;
  if (t.startsWith("قائد")) return <Star />;
  return <UserCircle />;
};

/**
 * الشكلُ (دال، ٢٠٢٦-١١-٢٠ بعد «سيّئين… التنفيذ سيّء»): **كلُّ قسمٍ كرتٌ أبيضُ على ورقة النافذة** — قسمُ «حسابي» (`AdSection`) نفسُه الذي
 * اعتُمد للدورة رأسَ الغرفة: رأسٌ برمزه واسمه وحالِه، ثمّ الأرقامُ بشرائطها في جسمه، ثمّ سطرُه. فلا قطعَ سائبة بثلاث لغات، ولا لوحَ
 * مجموعةٍ كحليًّا ينافس التبويب. والنافذةُ قالبُ النوافذ العاديّ (عنوانُها لوح) لا نافذةُ الملفّ: غلافُ الصورة كان يأكل نصفَها ويغطّي
 * الأرقام عند النزول.
 */
const AR_RATER: ArForms = ["مقيِّمٌ واحد", "مقيِّمان", "مقيِّمين", "مقيِّمًا"];
const fracPct = (x: Fraction | null) => (x ? (x.num / x.den) * 100 : 0);

function ResultCard({ t }: { t: TargetRow }) {
  const f = frac(t.final_num, t.final_den);
  const why = branchText(t);
  const part = (p: Part) => (p === "members" ? frac(t.members_num, t.members_den) : frac(t.council_num, t.council_den));
  return (
    <AdSection icon={<Gauge />} title="النتيجة النهائية" foot={why ? <p className="ad-evd-note">{why}</p> : undefined}
      media={
        <div className="ad-evd-figs">
          <div className="ad-evd-final" data-verdict={t.verdict ?? undefined}>
            <AdFigureRow figures={[{
              icon: <Gauge />, label: "النتيجة النهائية", ltr: true, value: f ? `${percentText(f)}%` : "—",
              of: { now: fracPct(f), max: 100, word: t.verdict ? verdictWord(t.verdict, t.gender) : "", mark: { at: 40, label: <>حدّ الاستبعاد {P(40)}</> } },
            }]} />
          </div>
          <AdFigureRow figures={(["members", "council"] as const).map((p) => {
            const pf = part(p);
            return { icon: p === "members" ? <UsersThree /> : <Scales />, label: partName(p, t.role_name), ltr: true, value: pf ? `${percentText(pf)}%` : "—", of: { now: fracPct(pf), max: 100, word: pf ? "" : "لا يُحتسب" } };
          })} />
        </div>
      } />
  );
}

/** والقيمةُ «10 من 13» بلا معدود (محمد ٢٠٢٦-١١-٢٠): التسميةُ فوقها تسمّيه («أوراق أعضاء القسم») — والمعدودُ في عمود الغرفة لأنّ رأسَه بعيد */
function ParticipationCard({ t, closed }: { t: TargetRow; closed: boolean }) {
  const q = quorumLine(t.members_ballots, t.members_eligible, closed);
  const need = Math.max(1, Math.ceil(t.members_eligible / 2));
  return (
    <AdSection icon={<UsersThree />} title="المشاركة" sub={q.text}
      media={
        <AdFigureRow figures={[
          { icon: <UsersThree />, label: `تقييمات ${partName("members", t.role_name)}`, value: `${t.members_ballots} من ${t.members_eligible}`,
            of: { now: t.members_ballots, max: t.members_eligible, word: q.met ? undefined : closed ? "لم يبلغه" : `بقي ${need - t.members_ballots}`, mark: { at: 50, label: "النصف" } } },
          { icon: <Scales />, label: "تقييمات المجلس الإداري", value: `${t.council_ballots} من ${t.council_eligible}`, of: { now: t.council_ballots, max: t.council_eligible } },
        ]} />
      } />
  );
}

function RatersCards({ electorate, t }: { electorate: ElectorRow[] | null; t: TargetRow }) {
  if (electorate === null) return <AdSection icon={<UsersThree />} title="المقيِّمون" sub="يُجلبون…" />;
  const groups = [
    { key: "members", title: partName("members", t.role_name), icon: <UsersThree />, list: electorate.filter((e) => e.part === "members") },
    { key: "council", title: "المجلس الإداري", icon: <Scales />, list: electorate.filter((e) => e.part === "council" && !e.supervisor) },
    { key: "sup", title: "المشرفون على اللجنة", icon: <UserCircle />, list: electorate.filter((e) => e.part === "council" && e.supervisor) },
  ].filter((g) => g.key !== "sup" || g.list.length > 0);
  // **منطقةُ duotone**: النجمةُ هنا رتبةٌ لا «مميّز» (استثناءُ `glyphs.tsx`)، فكانت بوزن الاستثناء الرفيع بين رموزٍ مصمتة (محمد ٢٠٢٦-١١-٢٠:
  // «أحجامها والحدّ فيها يختلف»)
  return (
    <DuotoneZone>
      {groups.map((g) => {
        const n = g.list.filter((e) => !e.removed).length;
        return (
          <div key={g.key} className="ad-evd-raters">
            <AdSection icon={g.icon} title={g.title} sub={n ? arCount(n, AR_RATER) : "لا أحد"}>
              {g.list.length ? g.list.map((e) => (
                <AdLine key={e.rater_id ?? e.full_name} icon={seatIcon(e.seat_title)} v={e.full_name ?? "حسابٌ محذوف"}
                  sub={e.removed ? "أُخرج بالتصحيح" : e.added_by_correction ? "أُضيف بالتصحيح" : e.seat_title ? rankFor(e.seat_title, e.gender) : undefined}
                  tone={e.removed ? "muted" : e.added_by_correction ? "ok" : undefined} toneAt="sub" />
              )) : null}
            </AdSection>
          </div>
        );
      })}
    </DuotoneZone>
  );
}

export function EvaluationDetail(props: Props) {
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
    add: `من سقط من المقيِّمين بالخطأ: يُضاف إليهم${decided ? " ويُحسب في عددهم" : " ويقيّم ما بقي التقييمُ مفتوحًا"}.${after}`,
    recompute: "يُعاد الحسابُ بالتقييمات الحاضرة، فيُعاد إلى منصبه أو يُستبعد إن تغيّر الحكم.",
  };
  const sorted = [...props.committees].sort(
    (a, b) => Number(b.department_id === t.department_id) - Number(a.department_id === t.department_id) || a.name.localeCompare(b.name, "ar"),
  );
  const chosen = props.committees.find((c) => String(c.id) === to);

  const tabs = [
    ...(deciding ? [{ key: "decide", label: "القرار" }] : []),
    { key: "result", label: results ? "النتيجة" : "المشاركة" },
    // بلا عدد: يقصّ الاسمَ على الجوّال («المقيِّمو…»)، والعددُ في عنوان كلّ مجموعةٍ تحته
    { key: "raters", label: "المقيِّمون" },
    ...(canManage ? [{ key: "fix", label: "التصحيح" }] : []),
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
        <Button variant={fix === "remove" ? "danger" : "primary"} size="md" disabled={!fixReady} loading={busy}
          onClick={() => run(
            () => fix === "recompute"
              ? actions.recompute(t.id, why)
              : actions.correctRater({ targetId: t.id, raterId: who, action: fix, part: fix === "add" ? part : undefined, reason: why }),
            () => { setWho(""); setReason(""); },
          )}>
          {fix === "remove" ? <UserMinus aria-hidden /> : fix === "add" ? <UserPlus aria-hidden /> : <ArrowsClockwise aria-hidden />}
          {fix === "remove" ? "أخرِجه" : fix === "add" ? "أدخِله" : "أعِد الحساب"}
        </Button>
        {close}
      </>
    ) : close;

  return (
    <Modal open onClose={onClose} size="md" className="ad-evd" busy={busy} title={t.full_name}
      description={seatLine(t.role_name, t.unit_name, t.gender)} footer={footer}>

      <AdSwitch label="أقسام التقييم" positions={tabs} position={tab} onPosition={(k) => setTab(k as Tab)} />

      {tab === "decide" ? (
        <>
          <AdNote tone="warn" title={`إلى أيّ لجنةٍ ${fm(t.gender, "يعود", "تعود")}؟`}>
            {fm(t.gender, "لا لجنةَ سابقةَ له يعود إليها، فيبقى في منصبه", "لا لجنةَ سابقةَ لها تعود إليها، فتبقى في منصبها")} حتى تختار،
            {" "}{fm(t.gender, "ويعود", "وتعود")} عضوًا في اللجنة التي تختارها{chosen ? `، ${chosen.name}` : ""}، {fm(t.gender, "ويُبلَّغ", "وتُبلَّغ")} بالجرس والبريد.
          </AdNote>
          <Select label="اللجنة" icon={<UsersThree />} placeholder="اختر لجنة" value={to} onValueChange={setTo}
            options={sorted.map((c) => ({
              value: String(c.id), label: c.name,
              hint: c.department_id === t.department_id ? `من ${fm(t.gender, "قسمه", "قسمها")}` : c.department_id ? departments[c.department_id] : undefined,
            }))} />
        </>
      ) : tab === "result" ? (
        <>
          {results ? <ResultCard t={t} /> : null}
          <ParticipationCard t={t} closed={closed} />
        </>
      ) : tab === "raters" ? (
        <RatersCards electorate={electorate} t={t} />
      ) : (
        <div className="form-grid">
          <div className="form-full">
            <Select label="ماذا تصحّح؟" icon={<Wrench />} value={fix} helper={fixHint[fix]}
              onValueChange={(v) => { setFix(v as Fix); setWho(""); }}
              options={[
                { value: "remove", label: "أخرِج مقيِّمًا دخل بالخطأ" },
                { value: "add", label: "أدخِل مقيِّمًا سقط بالخطأ" },
                ...(decided ? [{ value: "recompute", label: "أعِد الحساب" }] : []),
              ]} />
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
