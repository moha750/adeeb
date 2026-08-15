"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, FileButton, ModalSectionHeading, Radio, Select, Stat, Textarea, Modal } from "@adeeb/design-system";
import { CalendarBlank, ClockCounterClockwise, Clock, FileArrowDown, FileDashed, HandTap, Megaphone, Note, Paperclip, Play, Quotes, Scales, StopCircle, UserPlus, UsersThree } from "@phosphor-icons/react";
import { ArrowUUpLeft } from "@/app/_components/glyphs";
import { ArrowRight } from "@/app/_components/glyphs";
import { PencilSimple, Prohibit, CheckCircle } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar } from "../_components/Toolbar";
import { usePersistentView } from "../_components/usePersistentView";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import { BallotLinkShare } from "./BallotLinkShare";
import { CandidateCard } from "./CandidateCard";
import { ElectionLog } from "./ElectionLog";
import type { AppointOption, CandidateRow, ElectionDetail, ElectionLogEvent, VoteDetailRow } from "./data";
import type { ElectionResult } from "./actions";
import { useElectionApi } from "./actions-context";
import { byGender, CANDIDATE_CARD_TONE, CANDIDATE_STATUS_META, decisionLine } from "./vocab";
import { StatusBadge } from "./StatusBadge";
import { Breadcrumb } from "../_shell/Breadcrumb";
import { fromClubInput, toClubInput } from "@/lib/dates";

// مدّة التصويت مقاديرُ جاهزة (Select منسَّق) للحالة الغالبة — voting_end = الآن + المدّة.
// و«موعد مخصّص» يكشف حقلَ تاريخٍ وساعةٍ بساعة النادي، فتبقى الدقّة متاحةً من أوّل خطوة.
const CUSTOM = "custom";
const DURATIONS = [
  { value: "1", label: "يوم واحد" },
  { value: "3", label: "٣ أيّام" },
  { value: CUSTOM, label: "موعد مخصّص" },
];

/**
 * أحكامُ المراجعة الثلاثة بطاقاتٍ في متن النافذة (أقرّه المالك من معاينة `/ui/candidate-review`):
 * كلُّ حكمٍ يشرح أثرَه **قبل وقوعه**، و`needsNote` يقول أيُّها يوجب سببًا مكتوبًا — وهو حكمُ القاعدة
 * نفسِها لا زينةَ واجهة (`reviewCandidate` تردّ الرفضَ وطلبَ التعديل بلا سبب).
 */
const VERDICTS: { value: "approved" | "needs_edit" | "rejected"; label: string; description: string; icon: ReactNode; needsNote: boolean }[] = [
  { value: "approved", label: "اعتماد", description: "يدخل الصندوق ويُعرَض على الناخبين.", icon: <CheckCircle />, needsNote: false },
  { value: "needs_edit", label: "طلب تعديل", description: "يعود إليه بيانُه ليصلحه ثمّ يُعيد التقديم.", icon: <PencilSimple />, needsNote: true },
  { value: "rejected", label: "رفض", description: "لا يدخل الصندوق، ويُبلَّغ بالسبب.", icon: <Prohibit />, needsNote: true },
];

type Confirm = { title: string; text: string; confirmLabel: string; tone: "warning" | "danger" | "success"; run: () => Promise<ElectionResult> };

// الحقلُ يقرأ ويكتب بساعة النادي (الرياض) لا بساعة جهاز المشرف — المصدر `lib/dates`.

/**
 * `log` سجلُّ الانتخاب كما تقرؤه القاعدة (بفاعليه) — يُجلَب مع الصفحة مرّةً ويقرؤه سطحان:
 * قسمُ السجلّ في ذيل الصفحة، ونافذةُ المرشّح تنخل منه أحداثَه وحدَه.
 */
export function ElectionDetailView({ election, log, logError = null, votes = [], votesError = null, readOnly = false }: { election: ElectionDetail; log: ElectionLogEvent[]; logError?: string | null; votes?: VoteDetailRow[]; votesError?: string | null; readOnly?: boolean }) {
  const toast = useToast();
  const api = useElectionApi();
  const [pending, startPending] = useTransition();
  const [acting, setActing] = useState<string | null>(null);

  const [detail, setDetail] = useState<CandidateRow | null>(null);
  const [note, setNote] = useState("");
  const [verdict, setVerdict] = useState<"" | "approved" | "needs_edit" | "rejected">("");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [voteOpen, setVoteOpen] = useState(false);
  const [days, setDays] = useState("3");
  const [voteEnd, setVoteEnd] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [deadline, setDeadlineValue] = useState("");
  // بابُ التكليف على مقعدٍ تعثّر: الأعضاء يُحمَّلون عند فتح النافذة (كبطاقة الاقتراع)
  const [appointOpen, setAppointOpen] = useState(false);
  const [appointees, setAppointees] = useState<AppointOption[] | null>(null);
  const [appointee, setAppointee] = useState("");
  const [appointReason, setAppointReason] = useState("");
  const [view, changeView] = usePersistentView("election-candidates-view");

  const run = (key: string, fn: () => Promise<ElectionResult>, onOk?: () => void) => {
    setActing(key);
    startPending(async () => {
      const r = await fn();
      setActing(null);
      if (r.ok) { toast.success(r.message); onOk?.(); api.refresh(); }
      else toast.error(r.message);
    });
  };

  // ملفُّ المرشّح يُفتَح برابطٍ موقَّعٍ مؤقّت (منفذُ `openFile` — مصدرٌ واحدٌ يقاسمه الناخب).
  const showCandidateFile = async (path: string) => {
    if (!(await api.openFile(path))) toast.error("تعذّر فتح الملفّ، أعِد المحاولة.");
  };

  const s = election.status;
  const phase: "candidacy" | "voting" | "done" =
    s === "candidacy_open" || s === "candidacy_closed" ? "candidacy"
      : s === "voting_open" || s === "voting_closed" ? "voting"
        : "done";
  const reviewable = (c: CandidateRow) => phase === "candidacy" && (c.status === "pending" || c.status === "needs_edit");
  /**
   * الرجعةُ عن الانسحاب — مَن سحب ترشّحه خطأً يُعاد ما دام البابُ في طور الترشّح: القانونُ في
   * القاعدة يشترط الشرطين نفسَيهما (مشرفٌ وطورُ ترشّح)، وهذا وجهُهما في الشاشة لا حكمٌ ثانٍ.
   */
  const restorable = (c: CandidateRow) => phase === "candidacy" && c.status === "withdrawn";
  // الإعلانُ المنفرد لا يصحّ ما دام في القسم مقعدٌ يشارك هذا المقعد مرشّحًا: القاعدة ترفضه،
  // والمخرجُ حسمُ مقاعد القسم معًا (فالمفضَّل لا يُعرف إلّا بها).
  const jointOnly = election.jointPending > 0 || election.jointBlocking > 0;
  const declarable = (c: CandidateRow) => s === "voting_closed" && c.status === "approved" && !jointOnly;

  const approvedCount = election.candidates.filter((c) => c.status === "approved").length;

  // الطور الموقوت — بابٌ مفتوح وحده يقبل موعدًا، وهو الذي يقول أيّ عمودٍ يُضبط
  const timedPhase: "candidacy" | "voting" | null =
    s === "candidacy_open" ? "candidacy" : s === "voting_open" ? "voting" : null;
  const deadlineRaw = timedPhase === "candidacy" ? election.candidacyEndRaw : timedPhase === "voting" ? election.votingEndRaw : null;
  const deadlineLabel = timedPhase === "candidacy" ? "يُغلق باب الترشّح في" : "يُغلق التصويت في";
  const openDeadline = () => { setDeadlineValue(toClubInput(deadlineRaw)); setDeadlineOpen(true); };

  // موعدُ إغلاق التصويت: مدّةٌ تُضاف إلى الآن، أو موعدٌ مكتوبٌ بساعة النادي حين يُختار المخصّص.
  const custom = days === CUSTOM;
  const votingEndIso = () => (custom ? fromClubInput(voteEnd) ?? "" : new Date(Date.now() + Number(days) * 86400000).toISOString());
  // فتحُ النافذة يقترح ثلاثةَ أيّامٍ في الحقل المخصّص، فلا يبدأ المشرف من فراغ
  const openVote = () => { setVoteEnd(toClubInput(new Date(Date.now() + 3 * 86400000).toISOString())); setVoteOpen(true); };

  // مقعدٌ تعثّر: انقضت مهلتُه ولا مرشّح. الأبوابُ الثلاثة تحلّ محلّ شريط الدورة
  // (فالإغلاق لا يصحّ على صندوقٍ فارغ)، والقرارُ للمشرف لا للآلة.
  const stalled = election.stalled && s === "candidacy_open";
  const openAppoint = () => {
    setAppointee(""); setAppointReason(""); setAppointees(null); setAppointOpen(true);
    api.loadAppointOptions(election.id).then((r) => setAppointees(r.members));
  };

  // جنسُ الفائز من صفّه في المرشّحين (هو أحدُهم)، فلا يُطلَب من القاعدة مرّةً ثانية
  const winnerGender = election.candidates.find((c) => c.id === election.winnerCandidateId)?.gender ?? null;

  // وزنُ التأييد في التزكية = وزنُ المرشّح الوحيد المعتمَد (الاعتراضُ محسوبٌ للانتخاب نفسه)
  const soleApproved = election.confidence ? election.candidates.find((c) => c.status === "approved") ?? null : null;

  const columns: Column<CandidateRow>[] = [
    { key: "number", header: "#", width: "56px", align: "center", render: (c) => <span className="txt num">{c.number}</span> },
    { key: "name", header: "المرشّح", width: "minmax(180px, 2fr)", render: (c) => <span className="txt"><b>{c.name}</b></span> },
    { key: "status", header: "الحالة", width: "1.1fr", render: (c) => { const m = CANDIDATE_STATUS_META[c.status]; return <Badge tone={m.tone} variant="soft" dot>{m.label}</Badge>; } },
    ...(phase === "candidacy"
      ? [{ key: "submitted", header: "قُدّم", width: "1fr", render: (c: CandidateRow) => <span className="txt">{c.submitted}</span> }]
      : [
        { key: "weight", header: "الوزن", width: "0.8fr", align: "center" as const, render: (c: CandidateRow) => <span className="txt num">{c.weight}</span> },
        { key: "votes", header: "الأصوات", width: "0.8fr", align: "center" as const, render: (c: CandidateRow) => <span className="txt num">{c.votes}</span> },
      ]),
  ];

  /** أعمدةُ تفصيل الأصوات — الناخبُ ورتبتُه ساعتَها، ثمّ لمن ذهب صوتُه وبأيّ وزن. */
  const voteColumns: Column<VoteDetailRow>[] = [
    { key: "voter", header: "الناخب", width: "minmax(150px, 1.6fr)", render: (v) => <span className="txt"><b>{v.voter}</b></span> },
    { key: "role", header: "رتبتُه حينها", width: "1.2fr", render: (v) => <span className="txt">{v.voterRole ?? "—"}</span> },
    {
      key: "candidate", header: "صوّت لـ", width: "minmax(150px, 1.6fr)",
      // الاعتراضُ رأيٌ في التزكية لا صوتٌ لأحد، فيُقال بذاته. و«مرشّحٌ محذوف» لحالته الحقّة
      // وحدَها: صوتٌ قائمٌ لمرشّحٍ مُحي ملفُّه (والورقةُ الفارغة لم تعد ممكنة).
      render: (v) => (
        <span className="txt">
          {v.choice === "reject"
            ? <Badge tone="danger" variant="soft" dot>اعتراض على التزكية</Badge>
            : <><b>{v.candidate ?? "مرشّحٌ محذوف"}</b>{v.candidateNumber != null ? <span className="num"> #{v.candidateNumber}</span> : null}</>}
        </span>
      ),
    },
    { key: "weight", header: "الوزن", width: "0.7fr", align: "center", render: (v) => <span className="txt num">{v.weight}</span> },
    { key: "at", header: "وقتُه", width: "1.2fr", render: (v) => <span className="txt">{v.at}</span> },
  ];

  // في طور التصويت/الاكتمال تُرتّب بالوزن (لوحة نتائج)؛ في الترشّح بالرقم
  const rows = phase === "candidacy"
    ? election.candidates
    : [...election.candidates].sort((a, b) => b.weight - a.weight || a.number - b.number);

  /**
   * مَن وقع عليه الفعلُ في سطر السجلّ — اسمُه ورقمُه من صفوف الصفحة نفسِها: القاعدةُ تكتب
   * المعرّفَ وحدَه، والاسمُ حاضرٌ هنا فلا يُسأل عنه نداءٌ ثانٍ. والفاصلُ فاصلةٌ عربيّة.
   *
   * وصيغةُ المالك (٢٠٢٦-٠٨-١٤): «المرشّحة فلانة، رقمها الانتخابي ١» — تُسمّى صفتُه قبل اسمه،
   * ويُنسَب الرقمُ إليه لا يُقال مجرَّدًا. واللفظُ يتبع جنسَ صاحبه عبر `byGender` (والمجهولُ
   * يُذكَّر)، فلا يُقال للرجل «رقمها».
   */
  const subjectOf = (candidateId: string) => {
    const c = election.candidates.find((x) => x.id === candidateId);
    if (!c) return null;
    return `${byGender(c.gender, "المرشّح", "المرشّحة")} ${c.name}، ${byGender(c.gender, "رقمه", "رقمها")} الانتخابي ${c.number}`;
  };
  /** أحداثُ مرشّحٍ بعينه — تُنخل من سجلّ الصفحة، فلا نداءَ ثانٍ لِما هو محمولٌ سلفًا. */
  const eventsOf = (candidateId: string) => log.filter((e) => e.candidateId === candidateId);

  // فراغُ الصندوق يُقال مرّةً واحدة، فيقرؤه الجدولُ والكروت معًا (لا نسختان تفترقان)
  const emptyState = (
    <EmptyState
      variant="soft"
      icon={<UsersThree />}
      title="لا مرشّحين بعد"
      description={phase === "candidacy" ? "حين يترشّح أعضاء النطاق، يظهرون هنا لمراجعتهم." : "لم يترشّح أحد في هذا الانتخاب."}
    />
  );

  // فتحُ مرشّحٍ يبدأ من بياض: لا حكمَ مختارٌ ولا سببٌ محمولٌ عن مرشّحٍ قبله
  const openDetail = (c: CandidateRow) => { setNote(""); setVerdict(""); setDetail(c); };
  const closeDetail = () => { if (!pending) { setDetail(null); setNote(""); setVerdict(""); } };

  // الحكمُ الذي يوجب سببًا، والسببُ الناقص — يقرؤهما المتنُ (أيُظهِر الحقل؟) والتذييلُ (أيُقفِل الزرّ؟)
  const noteVerdict = VERDICTS.find((v) => v.value === verdict && v.needsNote) ?? null;
  const noteMissing = !!noteVerdict && note.trim().length === 0;

  /**
   * التذييلُ فعلٌ واحدٌ لا أحكامٌ متجاورة (أقرّه المالك من معاينة `/ui/candidate-review`): الحكمُ
   * بطاقةٌ تُختار في المتن تشرح أثرَها قبل وقوعه، والتذييلُ يحفظ ما اختير. فلا يثقل التذييلُ مهما
   * كثرت الأحكام، ولا يبقى حقلُ السبب مفتوحًا لا يقول متى يلزم.
   *
   * و«إغلاق» عاد إليه بعد أن خفّ (قرار المالك): أُسقِط يومَ كان يزاحم ثلاثةَ أحكامٍ في سطرٍ واحد،
   * فلمّا صار التذييلُ فعلًا واحدًا لم تبقَ علّةُ إسقاطه — وهو أصرحُ المخارج، فيُردّ إلى موضعه
   * ويُعطَّل أثناء التنفيذ فلا يَعِد بإيقاف ما انطلق (ق٧).
   */
  const detailFooter = (c: CandidateRow) => {
    const close = <Button variant="ghost" size="md" onClick={closeDetail} disabled={pending}>إغلاق</Button>;
    // المطّلِع (عضو الموارد) يرى البيان والملفّ والأوزان — بلا زرِّ مراجعةٍ أو إعلان
    if (readOnly) return close;
    if (reviewable(c)) {
      return (
        <>
          {close}
          <Button
            variant="primary"
            size="md"
            onClick={() => { if (verdict) run("save", () => api.reviewCandidate(c.id, verdict, note), closeDetail); }}
            loading={acting === "save"}
            disabled={pending || !verdict || noteMissing}
          >
            حفظ القرار
          </Button>
        </>
      );
    }
    if (declarable(c)) {
      return (
        <>
          {close}
          <Button variant="primary" size="md" onClick={() => run("win", () => api.declareWinner(election.id, c.id), closeDetail)} loading={acting === "win"} disabled={pending}>{byGender(c.gender, "إعلانه فائزًا", "إعلانها فائزةً")}</Button>
        </>
      );
    }
    /* الرجعةُ عن الانسحاب — بلا نافذةِ تأكيدٍ فوق نافذة: الأثرُ مكتوبٌ في متن هذه النافذة
       (تنبيهُ «ترشّحٌ مسحوب») فيُقرأ قبل الضغط، والتأكيدُ الثاني تكرارٌ لا حماية. */
    if (restorable(c)) {
      return (
        <>
          {close}
          <Button
            variant="primary"
            size="md"
            onClick={() => run("restore", () => api.restoreCandidacy(c.id), closeDetail)}
            loading={acting === "restore"}
            disabled={pending}
          >
            <ArrowUUpLeft size={18} />إعادة الترشّح
          </Button>
        </>
      );
    }
    return close;
  };

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf={election.roleLabel} />
          <h1>{election.positionLabel}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge status={s} stalled={stalled} />
          <Link href="/dashboard/elections" className="abtn abtn-ghost abtn-md"><ArrowRight size={18} />رجوع</Link>
        </div>
      </div>

      {s === "completed" && election.winnerName ? (
        <Alert tone="success" title="اكتمل الانتخاب">
          {election.confidence
            ? <>{byGender(winnerGender, "نال", "نالت")} <b>{election.winnerName}</b> ثقة الناخبين تزكيةً، وأُسنِد المنصب تلقائيًّا.</>
            : <>{byGender(winnerGender, "الفائز", "الفائزة")}: <b>{election.winnerName}</b>، أُسنِد المنصب تلقائيًّا.</>}
        </Alert>
      ) : null}
      {s === "cancelled" ? (
        <Alert tone="warning" title="أُلغي هذا الانتخاب">حُفظ المرشّحون والأصوات كما هي.</Alert>
      ) : null}

      {/* مقعدٌ تعثّر: الآلةُ لا تمدّد ولا تُلغي؛ تقف وتنادي صاحب القرار */}
      {stalled ? (
        <Alert tone="warning" title="هذا المقعد ينتظر قرارك">
          انقضت مهلةُ الترشّح ولم يتقدّم أحد. البابُ ما زال مفتوحًا لمن أراد، والقرارُ لك: مدِّد المهلة، أو كلِّف شاغلًا، أو ألغِ الانتخاب بسببٍ مكتوب.
        </Alert>
      ) : null}

      {/* الموعد المضروب على الطور الجاري — كنّاسة القاعدة تُنفّذه كلّ دقيقة، ولا تلمس ما لا موعد له */}
      {s === "candidacy_open" && !stalled && election.candidacyEnd ? (
        <Alert tone="info" title="باب الترشّح موقوت">
          يُغلق تلقائيًّا في <b>{election.candidacyEnd}</b>. ومرشّحٌ واحدٌ يكفي فيُعرَض على الناخبين تزكيةً، فإن خلا الصندوق وقف الانتخاب بانتظار قرارك.
        </Alert>
      ) : null}
      {/* بابٌ مفتوحٌ لا يُعرَف طريقُه لا يُطرَق : ما دام التصويت جاريًا يُعرَض رابطُ البطاقة
          ليسوق المسؤولُ ناخبي المقعد إليها. ويُعرَض للمطّلِع أيضًا، فالنشرُ ليس تصريفًا. */}
      {s === "voting_open" ? (
        <BallotLinkShare electionId={election.id} position={election.positionLabel} votingEnd={election.votingEnd} />
      ) : null}

      {s === "voting_open" && election.votingEnd ? (
        <Alert tone="info" title={election.confidence ? "تزكيةٌ موقوتة" : "التصويت موقوت"}>
          {election.confidence
            ? <>مرشّحٌ واحدٌ يُزكّى: يُغلق التصويت تلقائيًّا في <b>{election.votingEnd}</b>، وإن لم يغلب التأييدُ الاعتراضَ سقطت التزكية وأُلغي الانتخاب.</>
            : <>يُغلق تلقائيًّا في <b>{election.votingEnd}</b>، ثمّ تُعلن الفائز.</>}
        </Alert>
      ) : null}

      <div className="stat-grid" style={{ margin: "16px 0" }}>
        <Stat icon={<UsersThree />} value={election.candidates.length} label="المرشّحون" />
        <Stat icon={<CheckCircle />} value={approvedCount} label="المعتمَدون" tone="success" />
        {election.confidence && phase !== "candidacy" ? (
          <>
            <Stat icon={<HandTap />} value={soleApproved?.weight ?? 0} label="وزن التأييد" tone="success" />
            <Stat icon={<Prohibit />} value={election.opposeWeight} label="وزن الاعتراض" tone="danger" />
          </>
        ) : (
          <Stat icon={<Scales />} value={election.votes} label="الأصوات" />
        )}
      </div>

      {/* شريط أفعال الدورة — يعرض ما يصحّ على الحالة فقط؛ القاعدة الحكَم النهائيّ.
          يُحجب عن المطّلِع (readOnly): غرفةُ الموارد للقراءة لا للتصريف. */}
      {phase !== "done" && !readOnly ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {s === "candidacy_open" ? (
            stalled ? (
              <>
                <Button variant="primary" size="md" onClick={openDeadline} disabled={pending}><CalendarBlank size={18} />تمديد المهلة</Button>
                <Button variant="ghost" size="md" onClick={openAppoint} disabled={pending}><UserPlus size={18} />تكليف شاغل</Button>
              </>
            ) : (
              <Button variant="primary" size="md" onClick={() => setConfirm({ title: "إغلاق باب الترشّح؟", text: "لن يُقبل مرشّحون جدد. ويكفي مرشّحٌ واحدٌ معتمَد: يُعرَض على الناخبين تزكيةً يؤيّدونها أو يعترضون عليها.", confirmLabel: "إغلاق الترشّح", tone: "warning", run: () => api.transitionElection(election.id, "candidacy_closed") })} loading={acting === "close_c"} disabled={pending}><StopCircle size={18} />إغلاق الترشّح</Button>
            )
          ) : null}
          {s === "candidacy_closed" ? (
            <>
              <Button variant="primary" size="md" onClick={openVote} disabled={pending}><Play size={18} />فتح التصويت</Button>
              <Button variant="ghost" size="md" onClick={() => run("reopen", () => api.transitionElection(election.id, "candidacy_open"))} loading={acting === "reopen"} disabled={pending}>إعادة فتح الترشّح</Button>
            </>
          ) : null}
          {s === "voting_open" ? (
            <Button variant="primary" size="md" onClick={() => setConfirm({ title: "إغلاق التصويت؟", text: "سيتوقّف استقبال الأصوات، ثمّ تُعلن الفائز من النتائج.", confirmLabel: "إغلاق التصويت", tone: "warning", run: () => api.transitionElection(election.id, "voting_closed") })} loading={acting === "close_v"} disabled={pending}><StopCircle size={18} />إغلاق التصويت</Button>
          ) : null}
          {s === "voting_closed" ? (
            election.jointBlocking > 0 ? (
              <span className="txt" style={{ alignSelf: "center" }}>في هذا القسم مقعدٌ آخر يخوضه أحدُ مرشّحيك ولم يُغلق تصويتُه؛ أغلِقه ثمّ تُحسَم مقاعد القسم معًا.</span>
            ) : election.jointPending > 0 && election.departmentId != null ? (
              <Button variant="primary" size="md" onClick={() => setConfirm({ title: "إعلان فائزي القسم معًا؟", text: "تُحسَم مقاعد القسم الجاهزة معًا: من تصدّر أكثر من مقعد أخذ مفضَّله، وذهب الباقي للتالي في الأصوات. تُسنَد المناصب تلقائيًّا.", confirmLabel: "إعلان فائزي القسم", tone: "success", run: () => api.resolveDepartmentWinners(election.departmentId!) })} loading={acting === "confirm"} disabled={pending}><CheckCircle size={18} />إعلان فائزي القسم معًا</Button>
            ) : (
              <span className="txt" style={{ alignSelf: "center" }}>
                {election.confidence
                  ? "غلب التأييدُ الاعتراضَ فقامت التزكية: افتح المرشّح من القائمة لإعلانه فائزًا."
                  : "افتح مرشّحًا معتمَدًا من القائمة لإعلانه فائزًا (القاعدة تفرض الأعلى وزنًا)."}
              </span>
            )
          ) : null}
          {timedPhase && !stalled ? (
            <Button variant="ghost" size="md" onClick={openDeadline} disabled={pending}><CalendarBlank size={18} />{deadlineRaw ? "تعديل موعد الإغلاق" : "ضبط موعد الإغلاق"}</Button>
          ) : null}
          <Button variant="danger" size="md" onClick={() => setCancelOpen(true)} disabled={pending}><Prohibit size={18} />إلغاء الانتخاب</Button>
        </div>
      ) : null}

      {/* شريطٌ لا يحمل إلّا مبدّل العرض: القائمةُ قصيرةٌ بطبعها فلا بحثَ فيها ولا مرشِّح */}
      <Toolbar view={view} onViewChange={changeView} />

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(c) => c.id}
          onRowClick={openDetail}
          rowTone={(c) => (election.winnerCandidateId === c.id ? "success" : undefined)}
          emptyState={emptyState}
        />
      ) : rows.length === 0 ? (
        <div className="card-empty">{emptyState}</div>
      ) : (
        /* عمودان (ق٦): البيانُ مقياسُ المفاضلة، وانسيابُ الشبكة لثلاثةٍ يضيّق الكرت فلا يُقرأ منه شيء */
        <div className="card-grid card-grid-2col">
          {rows.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              phase={phase}
              tone={election.winnerCandidateId === c.id ? "success" : CANDIDATE_CARD_TONE[c.status]}
              reviewable={!readOnly && reviewable(c)}
              onOpen={() => openDetail(c)}
            />
          ))}
        </div>
      )}

      {/* سجلُّ الانتخاب — ذيلُ الصفحة: القرارُ يُسأل عنه أحد، فما جرى منسوبٌ إلى فاعله بلحظته.
          كرتٌ برأسٍ منسّم والسجلُّ متنُه (ق١٢: السطحُ المؤطَّر لا يحمل مؤطَّرًا). */}
      <Card className="mt-4">
        <CardHeader variant="soft" icon={<ClockCounterClockwise />} title="سجلّ الانتخاب" subtitle="من فعل ماذا، الأقدم أولًا" />
        <CardBody>
          {logError
            ? <Alert tone="warning" title="تعذّر جلب السجلّ">{logError}</Alert>
            : <ElectionLog events={log} subjectOf={subjectOf} initial={6} />}
        </CardBody>
      </Card>

      {/* **تفصيلُ الأصوات** — مَن صوّت ولمن، بقرار المالك ٢٠٢٦-٠٨-١٥ وبعد تنبيهه إلى ثمنه.
          لا يظهر إلّا لإدارة الانتخابات (القاعدةُ ترفض غيرَها، والصفحةُ لا تطلبه للمطّلِع)،
          ولا يظهر قبل أن يقع صوتٌ واحد. والتنبيهُ فوقه ليس زينةً: من يفتح هذا الجدول يقرأ
          أوراقًا وُعِد أصحابُها بأنّها لا تُعرَض لعضو. */}
      {!readOnly && (votes.length > 0 || votesError) ? (
        <Card className="mt-4" tone="warning">
          <CardHeader variant="soft" icon={<Scales />} title="تفصيل الأصوات" subtitle="من صوّت ولمن، الأقدم أوّلًا" />
          <CardBody>
            {votesError ? (
              <Alert tone="warning" title="تعذّر جلب تفصيل الأصوات">{votesError}</Alert>
            ) : (
              <>
                <Alert tone="warning" title="أمانةٌ في يدك">
                  هذه أوراقُ ناخبين بأسمائهم. الصوتُ رأيٌ في مرشّحٍ لا موقفٌ من شخص، ولا يخرج ما تقرؤه هنا من هذه الغرفة.
                </Alert>
                <DataTable columns={voteColumns} rows={votes} getRowId={(v) => `${v.voter}-${v.at}`} />
              </>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* نافذة المرشّح — كلّ التفاعل هنا: البيان والملفّ والمراجعة/الإعلان */}
      <Modal
        open={!!detail}
        onClose={closeDetail}
        title={detail ? `المرشّح رقم ${detail.number}` : ""}
        description={detail?.name}
        size="md"
        busy={pending}
        footer={detail ? detailFooter(detail) : null}
      >
        {detail ? (
          <>
            {/* البيانُ حقلٌ يُقرأ ولا يُكتَب (`readOnly` لا `disabled`): هيئةُ الحقل كاملةً وأسطرُ
                الكاتب كما كتبها ونصٌّ يُنسَخ، بلا ثوبِ «غير متاح» الرماديّ (ق٧). وبه سقط تنسيقٌ
                شاردٌ كان مضمَّنًا في السطر (ق١). */}
            <Textarea
              label="بيان الترشّح"
              icon={<Megaphone />}
              innerIcon={<Quotes />}
              placeholder="لا بيان"
              value={detail.statement}
              rows={8}
              readOnly
            />
            {detail.fileUrl ? (
              <FileButton
                state="ready"
                icon={<Paperclip />}
                label={detail.fileName ?? "ملفّ الترشّح"}
                hint="اضغط لفتح ملفّ المرشّح"
                trailing={<FileArrowDown />}
                onClick={() => showCandidateFile(detail.fileUrl!)}
              />
            ) : (
              /* الفراغُ يُقال ولا يُسكت عنه: غيابُ الزرّ يُقرأ عطلًا، والخبرُ الساكن يُقرأ خبرًا */
              <FileButton state="empty" icon={<FileDashed />} label="لا ملف انتخابي مرفوق" hint="اكتفى المرشّح ببيانه" />
            )}
            {phase !== "candidacy" ? (
              <div className="txt">الوزن: <b className="num">{detail.weight}</b>، الأصوات: <b className="num">{detail.votes}</b></div>
            ) : null}
            {/* **الحكمُ باسم صاحبه**: عنوانُ التنبيه يقول ما الحكمُ ومَن أصدره ومتى، ومتنُه
                ملاحظتُه. وكان يُعرَض بلا ناسبٍ فيُقرأ حكمًا بلا صاحب. */}
            {detail.decidedBy || detail.reviewNote ? (
              <Alert tone={CANDIDATE_STATUS_META[detail.status].tone} title={decisionLine(detail.status, detail.decidedBy)}>
                {detail.reviewNote ?? "بلا ملاحظة مكتوبة."}
                {detail.decidedAt ? <div className="txt mt-1">{detail.decidedAt}</div> : null}
              </Alert>
            ) : null}
            {/* سجلُّ هذه الورقة وحدَها — منخولٌ من سجلّ الصفحة: مَن راجعها ومتى وبأيّ حكم،
                وما جرى عليها قبل ذلك. يقع قبل قسم القرار فيُقرأ الماضي قبل أن يُحكَم. */}
            {eventsOf(detail.id).length ? (
              <>
                <ModalSectionHeading icon={<ClockCounterClockwise />} title="سجلّ هذا الترشّح" />
                <ElectionLog events={eventsOf(detail.id)} />
              </>
            ) : null}
            {/* المسحوبُ في طور الترشّح: الأثرُ يُقال قبل الضغط، فزرُّ الذيل يقع على علمٍ لا على ظنّ. */}
            {restorable(detail) && !readOnly ? (
              <Alert tone="warning" title="هل تريد إرجاع المترشح المنسحب؟">
                إرجاع المُرشح يعيده لحالة «قيد المراجعة»، ثمّ تُقرّر فيه من جديد.
              </Alert>
            ) : null}
            {reviewable(detail) && !readOnly ? (
              <>
                <ModalSectionHeading icon={<Scales />} title="قرارك في هذا المرشّح" />
                {VERDICTS.map((v) => (
                  <Radio
                    key={v.value}
                    card
                    name="verdict"
                    icon={v.icon}
                    checked={verdict === v.value}
                    onChange={() => { setVerdict(v.value); setNote(""); }}
                    label={v.label}
                    description={v.description}
                    disabled={pending}
                  />
                ))}
                {/* السببُ لا يُعرَض إلّا حين يوجبه الحكم، ويأخذ المؤشّرَ فور اختياره: الحكمُ يقع
                    فوق الحقل، فلولا الذهابُ إليه لبقي الطلبُ خبرًا يُقرأ لا مكانًا يُكتَب فيه.
                    و`key` يعيد تركيبه عند تبديل الحكم فيتجدّد `autoFocus` (السببُ يُكتب من جديد
                    لحكمٍ جديد، ونصُّه مُصفًّى عند التبديل أصلًا). */}
                {noteVerdict ? (
                  <Textarea
                    key={noteVerdict.value}
                    label={noteVerdict.value === "rejected" ? "سبب الرفض" : "ما يُطلب تعديله"}
                    icon={<PencilSimple />}
                    innerIcon={<Note />}
                    placeholder={noteVerdict.value === "rejected" ? "لماذا لا يدخل الصندوق؟…" : "ما الذي يصلحه في بيانه؟…"}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    required
                    autoFocus
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </Modal>

      {/* فتح التصويت — مدّةٌ جاهزة أو موعدٌ مخصّص */}
      <Modal
        open={voteOpen}
        onClose={() => { if (!pending) setVoteOpen(false); }}
        title="فتح باب التصويت"
        description={custom ? "يبدأ التصويت الآن ويُغلق تلقائيًّا عند الموعد الذي تختاره." : "يبدأ التصويت الآن ويُغلق تلقائيًّا بعد المدّة المختارة."}
        size="sm"
        busy={pending}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setVoteOpen(false)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" loading={acting === "open_v"} disabled={pending || (custom && !voteEnd)} onClick={() => run("open_v", () => api.openVoting(election.id, votingEndIso()), () => setVoteOpen(false))}>فتح التصويت</Button>
          </>
        }
      >
        <Select label="مدّة التصويت" icon={<Play />} options={DURATIONS} value={days} onValueChange={setDays} required />
        {custom ? (
          <Field
            label="يُغلق التصويت في"
            type="datetime-local"
            icon={<CalendarBlank />}
            innerIcon={<Clock />}
            placeholder="اختر تاريخًا وساعة"
            value={voteEnd}
            onChange={(e) => setVoteEnd(e.target.value)}
            required
          />
        ) : null}
      </Modal>

      {/* ضبط موعد الإغلاق — بابٌ واحد للطورين، والحالة تقول أيّهما يُضبط. القاعدة تُنفّذ الموعد كلّ دقيقة. */}
      <Modal
        open={deadlineOpen}
        onClose={() => { if (!pending) setDeadlineOpen(false); }}
        title="ضبط موعد الإغلاق"
        description="عند الموعد يُغلق الباب من نفسه. اتركه فارغًا ليبقى الإغلاق بيدك."
        size="sm"
        busy={pending}
        footer={
          <>
            {deadlineRaw ? (
              <Button variant="danger" size="md" onClick={() => run("dl_clear", () => api.setDeadline(election.id, null), () => setDeadlineOpen(false))} loading={acting === "dl_clear"} disabled={pending}>إزالة الموعد</Button>
            ) : null}
            <Button variant="ghost" size="md" onClick={() => setDeadlineOpen(false)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={() => run("dl_save", () => api.setDeadline(election.id, fromClubInput(deadline)), () => setDeadlineOpen(false))} loading={acting === "dl_save"} disabled={pending || !deadline}>حفظ</Button>
          </>
        }
      >
        <Field
          label={deadlineLabel}
          type="datetime-local"
          icon={<CalendarBlank />}
          innerIcon={<Clock />}
          placeholder="اختر تاريخًا وساعة"
          value={deadline}
          onChange={(e) => setDeadlineValue(e.target.value)}
          required
        />
        {stalled ? (
          <Alert tone="info" title="بهذا الموعد يعود المقعد إلى مساره">
            يسقط وسمُ الانتظار، ويُغلق البابُ عند الموعد الجديد إن تقدّم مرشّحٌ فأكثر، وإلّا وقف الانتخاب ثانيةً بانتظار قرارك.
          </Alert>
        ) : null}
      </Modal>

      {/* بابُ التكليف — إسنادٌ عاديّ بلا مدّة، ثمّ يُوقَف الانتخاب بسببٍ مسجّل */}
      <Modal
        open={appointOpen}
        onClose={() => { if (!pending) setAppointOpen(false); }}
        title="تكليف شاغل للمقعد"
        description="يُسنَد المنصب كأيّ منصبٍ آخر، ويُوقَف هذا الانتخاب بسببٍ يُحفظ في سجلّه."
        size="sm"
        busy={pending}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAppointOpen(false)} disabled={pending}>تراجع</Button>
            <Button variant="primary" size="md" loading={acting === "appoint"} disabled={pending || !appointee || appointReason.trim().length < 10}
              onClick={() => run("appoint", () => api.appointToSeat(election.id, appointee, appointReason), () => setAppointOpen(false))}>
              تكليف وإسناد المنصب
            </Button>
          </>
        }
      >
        {appointees === null ? (
          <p className="txt">جارٍ تحميل أعضاء النطاق…</p>
        ) : appointees.length === 0 ? (
          <Alert tone="warning" title="لا أعضاء في نطاق هذا المقعد">لا يصلح للتكليف إلّا عضوٌ سارٍ في اللجنة أو القسم المستهدَف.</Alert>
        ) : (
          <Select
            label="العضو المكلَّف"
            icon={<UserPlus />}
            options={appointees.map((m) => ({ value: m.id, label: m.label }))}
            value={appointee}
            onValueChange={setAppointee}
            searchable
            required
          />
        )}
        <Textarea
          label="سبب التكليف"
          icon={<PencilSimple />}
          innerIcon={<Note />}
          placeholder="لماذا يُكلَّف هذا العضو بدل الانتخاب؟…"
          value={appointReason}
          onChange={(e) => setAppointReason(e.target.value)}
          rows={3}
          required
        />
      </Modal>

      {/* إلغاء الانتخاب — بسبب */}
      <Modal
        open={cancelOpen}
        onClose={() => { if (!pending) setCancelOpen(false); }}
        title="إلغاء الانتخاب"
        description="يُحفظ المرشّحون والأصوات؛ يُوقَف الانتخاب فقط."
        size="sm"
        busy={pending}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setCancelOpen(false)} disabled={pending}>تراجع</Button>
            <Button variant="danger" size="md" loading={acting === "cancel"} onClick={() => run("cancel", () => api.cancelElection(election.id, reason), () => { setCancelOpen(false); setReason(""); })}>تأكيد الإلغاء</Button>
          </>
        }
      >
        <Textarea label="سبب الإلغاء" icon={<Prohibit />} innerIcon={<Note />} placeholder="لماذا يُلغى هذا الانتخاب؟…" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required />
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        tone={confirm?.tone ?? "warning"}
        icon={<StopCircle />}
        title={confirm?.title ?? ""}
        text={confirm?.text}
        confirmLabel={confirm?.confirmLabel ?? "تأكيد"}
        loading={pending}
        onConfirm={() => { if (confirm) run("confirm", confirm.run, () => setConfirm(null)); }}
      />
    </>
  );
}
