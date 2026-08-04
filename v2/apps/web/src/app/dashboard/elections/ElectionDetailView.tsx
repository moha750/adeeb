"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Select, Stat, Textarea } from "@adeeb/design-system";
import {
  ArrowRight, FileArrowDown, Note, PencilSimple, Play, Prohibit,
  Scales, StopCircle, UsersThree, CheckCircle,
} from "@phosphor-icons/react";
import { DataTable, type Column } from "../_components/DataTable";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { Modal } from "../_components/Modal";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import type { CandidateRow, ElectionDetail } from "./data";
import type { ElectionResult } from "./actions";
import { cancelElection, declareWinner, openVoting, reviewCandidate, transitionElection } from "./actions";
import { CANDIDATE_STATUS_META, STATUS_META } from "./vocab";
import { Breadcrumb } from "../_shell/Breadcrumb";

// مدّة التصويت مقاديرُ جاهزة (Select منسَّق) بدل منتقي وقتٍ خام — voting_end = الآن + المدّة
const DURATIONS = [
  { value: "1", label: "يوم واحد" },
  { value: "3", label: "٣ أيّام" },
  { value: "7", label: "أسبوع" },
  { value: "14", label: "أسبوعان" },
];

type Confirm = { title: string; text: string; confirmLabel: string; tone: "warning" | "danger" | "success"; run: () => Promise<ElectionResult> };

export function ElectionDetailView({ election }: { election: ElectionDetail }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [acting, setActing] = useState<string | null>(null);

  const [detail, setDetail] = useState<CandidateRow | null>(null);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [voteOpen, setVoteOpen] = useState(false);
  const [days, setDays] = useState("7");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const run = (key: string, fn: () => Promise<ElectionResult>, onOk?: () => void) => {
    setActing(key);
    startPending(async () => {
      const r = await fn();
      setActing(null);
      if (r.ok) { toast.success(r.message); onOk?.(); router.refresh(); }
      else toast.error(r.message);
    });
  };

  const s = election.status;
  const phase: "candidacy" | "voting" | "done" =
    s === "candidacy_open" || s === "candidacy_closed" ? "candidacy"
      : s === "voting_open" || s === "voting_closed" ? "voting"
        : "done";
  const reviewable = (c: CandidateRow) => phase === "candidacy" && (c.status === "pending" || c.status === "needs_edit");
  const declarable = (c: CandidateRow) => s === "voting_closed" && c.status === "approved";

  const approvedCount = election.candidates.filter((c) => c.status === "approved").length;
  const statusMeta = STATUS_META[s];

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

  // في طور التصويت/الاكتمال تُرتّب بالوزن (لوحة نتائج)؛ في الترشّح بالرقم
  const rows = phase === "candidacy"
    ? election.candidates
    : [...election.candidates].sort((a, b) => b.weight - a.weight || a.number - b.number);

  const closeDetail = () => { if (!pending) { setDetail(null); setNote(""); } };

  const detailFooter = (c: CandidateRow) => {
    if (reviewable(c)) {
      return (
        <>
          <Button variant="ghost" size="md" onClick={closeDetail} disabled={pending}>إغلاق</Button>
          <Button variant="danger" size="md" onClick={() => run("rej", () => reviewCandidate(c.id, "rejected", note), closeDetail)} loading={acting === "rej"} disabled={pending}>رفض</Button>
          <Button variant="warning" size="md" onClick={() => run("edit", () => reviewCandidate(c.id, "needs_edit", note), closeDetail)} loading={acting === "edit"} disabled={pending}>طلب تعديل</Button>
          <Button variant="primary" size="md" onClick={() => run("app", () => reviewCandidate(c.id, "approved"), closeDetail)} loading={acting === "app"} disabled={pending}>اعتماد</Button>
        </>
      );
    }
    if (declarable(c)) {
      return (
        <>
          <Button variant="ghost" size="md" onClick={closeDetail} disabled={pending}>إغلاق</Button>
          <Button variant="primary" size="md" onClick={() => run("win", () => declareWinner(election.id, c.id), closeDetail)} loading={acting === "win"} disabled={pending}>إعلانه فائزًا</Button>
        </>
      );
    }
    return <Button variant="ghost" size="md" onClick={closeDetail}>إغلاق</Button>;
  };

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf={election.roleLabel} />
          <h1>{election.positionLabel}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge tone={statusMeta.tone} variant="soft" dot live={statusMeta.live}>{statusMeta.label}</Badge>
          <Link href="/dashboard/elections" className="abtn abtn-ghost abtn-md"><ArrowRight size={18} />رجوع</Link>
        </div>
      </div>

      {s === "completed" && election.winnerName ? (
        <Alert tone="success" title="اكتمل الانتخاب">الفائز: <b>{election.winnerName}</b> — أُسنِد المنصب تلقائيًّا.</Alert>
      ) : null}
      {s === "cancelled" ? (
        <Alert tone="warning" title="أُلغي هذا الانتخاب">حُفظ المرشّحون والأصوات كما هي.</Alert>
      ) : null}

      <div className="stat-grid" style={{ margin: "16px 0" }}>
        <Stat icon={<UsersThree />} value={election.candidates.length} label="المرشّحون" />
        <Stat icon={<CheckCircle />} value={approvedCount} label="المعتمَدون" tone="success" />
        <Stat icon={<Scales />} value={election.votes} label="الأصوات" />
      </div>

      {/* شريط أفعال الدورة — يعرض ما يصحّ على الحالة فقط؛ القاعدة الحكَم النهائيّ */}
      {phase !== "done" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {s === "candidacy_open" ? (
            <Button variant="primary" size="md" onClick={() => setConfirm({ title: "إغلاق باب الترشّح؟", text: "لن يُقبل مرشّحون جدد. يلزم مرشّحان معتمَدان على الأقلّ لفتح التصويت.", confirmLabel: "إغلاق الترشّح", tone: "warning", run: () => transitionElection(election.id, "candidacy_closed") })} loading={acting === "close_c"} disabled={pending}><StopCircle size={18} />إغلاق الترشّح</Button>
          ) : null}
          {s === "candidacy_closed" ? (
            <>
              <Button variant="primary" size="md" onClick={() => setVoteOpen(true)} disabled={pending}><Play size={18} />فتح التصويت</Button>
              <Button variant="ghost" size="md" onClick={() => run("reopen", () => transitionElection(election.id, "candidacy_open"))} loading={acting === "reopen"} disabled={pending}>إعادة فتح الترشّح</Button>
            </>
          ) : null}
          {s === "voting_open" ? (
            <Button variant="primary" size="md" onClick={() => setConfirm({ title: "إغلاق التصويت؟", text: "سيتوقّف استقبال الأصوات، ثمّ تُعلن الفائز من النتائج.", confirmLabel: "إغلاق التصويت", tone: "warning", run: () => transitionElection(election.id, "voting_closed") })} loading={acting === "close_v"} disabled={pending}><StopCircle size={18} />إغلاق التصويت</Button>
          ) : null}
          {s === "voting_closed" ? (
            <span className="txt" style={{ alignSelf: "center" }}>افتح مرشّحًا معتمَدًا من الجدول لإعلانه فائزًا (القاعدة تفرض الأعلى وزنًا).</span>
          ) : null}
          <Button variant="danger" size="md" onClick={() => setCancelOpen(true)} disabled={pending}><Prohibit size={18} />إلغاء الانتخاب</Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(c) => c.id}
        onRowClick={(c) => { setNote(""); setDetail(c); }}
        rowTone={(c) => (election.winnerCandidateId === c.id ? "success" : undefined)}
        emptyState={<EmptyState variant="soft" icon={<UsersThree />} title="لا مرشّحين بعد" description={phase === "candidacy" ? "حين يترشّح أعضاء النطاق، يظهرون هنا لمراجعتهم." : "لم يترشّح أحد في هذا الانتخاب."} />}
      />

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
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <b>بيان الترشّح</b>
              <p className="txt" style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{detail.statement}</p>
            </div>
            {detail.fileUrl ? (
              <a href={detail.fileUrl} target="_blank" rel="noreferrer" className="abtn abtn-ghost abtn-sm"><FileArrowDown size={16} />{detail.fileName ?? "ملفّ الترشّح"}</a>
            ) : null}
            {phase !== "candidacy" ? (
              <div className="txt">الوزن: <b className="num">{detail.weight}</b> · الأصوات: <b className="num">{detail.votes}</b></div>
            ) : null}
            {detail.reviewNote ? <Alert tone="info" title="ملاحظة المراجعة السابقة">{detail.reviewNote}</Alert> : null}
            {reviewable(detail) ? (
              <Textarea
                label="ملاحظة المراجعة (إلزاميّة للرفض وطلب التعديل)"
                icon={<PencilSimple />}
                innerIcon={<Note />}
                placeholder="سبب الرفض أو ما يُطلب تعديله…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                required
              />
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* فتح التصويت — اختيار المدّة */}
      <Modal
        open={voteOpen}
        onClose={() => { if (!pending) setVoteOpen(false); }}
        title="فتح باب التصويت"
        description="يبدأ التصويت الآن ويُغلق تلقائيًّا بعد المدّة المختارة."
        size="sm"
        busy={pending}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setVoteOpen(false)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" loading={acting === "open_v"} onClick={() => run("open_v", () => openVoting(election.id, new Date(Date.now() + Number(days) * 86400000).toISOString()), () => setVoteOpen(false))}>فتح التصويت</Button>
          </>
        }
      >
        <Select label="مدّة التصويت" icon={<Play />} options={DURATIONS} value={days} onValueChange={setDays} required />
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
            <Button variant="danger" size="md" loading={acting === "cancel"} onClick={() => run("cancel", () => cancelElection(election.id, reason), () => { setCancelOpen(false); setReason(""); })}>تأكيد الإلغاء</Button>
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
