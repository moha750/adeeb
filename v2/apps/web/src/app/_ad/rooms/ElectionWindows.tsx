"use client";

/**
 * **نوافذُ صفحة الانتخاب** (المواصفة م٣، «نوافذ صفحة الانتخاب»؛ ٢٠٢٦-١١-١٧). كلُّ نافذةٍ بحقولها والفعلِ الذي تستدعيه، على قالب النوافذ المعتمد
 * (`Modal` بجلده في `ad.css`) وحقولِ الهويّة. والأفعالُ تمرّ بطبقة `useElectionApi` وحدها، فتعمل في الصفحة الحقيقيّة وفي المحاكي بلا مساسٍ
 * بالقاعدة.
 *
 * يُرجع `on` (أفعال الغرفة، `ElectionOps`) و`windows` (النوافذ تُرسم بجانبها).
 */
import { useState, useTransition, type ReactNode } from "react";
import { Button, Field, Modal, Textarea } from "@adeeb/design-system";
import { CalendarBlank, ChatText, Clock, Hourglass, Note, UserCircle } from "@phosphor-icons/react";
import { Prohibit } from "@/app/_components/glyphs";
import type { CandidateRow, ElectionDetail } from "@/app/dashboard/elections/data";
import type { ElectionResult, RestoreBasis } from "@/app/dashboard/elections/actions";
import { useElectionApi } from "@/app/dashboard/elections/actions-context";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { ActingModal } from "@/app/dashboard/members/assignments/ActingModal";
import { ShareResultModal } from "@/app/dashboard/elections/ShareResultModal";
import type { ResultCard } from "@/lib/elections/resultCard";
import { fromClubInput, toClubInput } from "@/lib/dates";
import { FormChoice } from "../form";
import { AdLine } from "../account";
import type { ElectionOps } from "./ElectionRecordRoom";

/** كلُّ سببٍ يكتبه المدير عشرةُ أحرفٍ فأكثر، ويُبلَّغ به من يعنيه (المواصفة §٦) */
export const MIN_REASON = 10;
export const okReason = (s: string) => s.trim().length >= MIN_REASON;
export const reasonHelper = "عشرة أحرف فأكثر، ويُبلَّغ به من يعنيه.";

type Win =
  | { kind: "restore"; c: CandidateRow }
  | { kind: "deadline" } | { kind: "closeEarly" } | { kind: "openVoting" } | { kind: "reopen" } | { kind: "revote" }
  | { kind: "appoint" } | { kind: "acting" } | { kind: "cancel" } | { kind: "tie" };

const RESTORE_BASES: { value: RestoreBasis; label: string }[] = [
  { value: "candidate_request", label: "بطلب صاحبه" },
  { value: "withdrawal_error", label: "خطأ في الانسحاب" },
  { value: "review_error", label: "خطأ في المراجعة" },
];
const DAY = 86_400_000;

export function useElectionWindows(e: ElectionDetail, { readOnly = false, canAppoint = false, reviewHref }: { readOnly?: boolean; canAppoint?: boolean;
  /** مسارُ صفحة الترشّح (المختبرُ يبدّله بعنوانه)؛ والافتراضُ صفحتُه الحقيقيّة تحت الانتخاب */ reviewHref?: (c: CandidateRow) => string } = {}) {
  const api = useElectionApi();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [win, setWin] = useState<Win | null>(null);
  // ساعةُ فتح النافذة (لا `Date.now` في الرسم): بها يُقاس «قبل موعده» و«في المستقبل»
  const [openedAt, setOpenedAt] = useState(0);
  const [reason, setReason] = useState("");
  const [when, setWhen] = useState("");
  const [basis, setBasis] = useState<string>("candidate_request");
  const [cancelBasis, setCancelBasis] = useState<string>("defect");
  const [share, setShare] = useState<ResultCard | null>(null);
  const [appointees, setAppointees] = useState<{ id: string; label: string; avatar?: string | null; gender?: "male" | "female" | null; held?: string | null }[] | null>(null);

  const open = (w: Win, preset?: { when?: string }) => {
    setReason(""); setWhen(preset?.when ?? ""); setBasis("candidate_request");
    setCancelBasis(e.stalled ? "stalled" : "defect");
    setOpenedAt(Date.now());
    setWin(w);
  };
  const close = () => { if (!busy) setWin(null); };
  const run = (fn: () => Promise<ElectionResult>) => start(async () => {
    const r = await fn();
    if (r.ok) { toast.success(r.message); setWin(null); api.refresh(); }
    else toast.error(r.message);
  });
  const iso = () => fromClubInput(when) ?? "";
  const soon = (days: number) => toClubInput(new Date(Date.now() + days * DAY).toISOString());
  const timedRaw = e.status === "candidacy_open" ? e.candidacyEndRaw : e.status === "voting_open" ? e.votingEndRaw : null;
  const beforeDeadline = !!timedRaw && new Date(timedRaw).getTime() > openedAt;

  const manage = !readOnly;
  const on: ElectionOps = {
    // **المراجعةُ صفحةٌ لا نافذة** (محمد ٢٠٢٦-١١-١٧: «نختار باء»): لكلّ ترشّحٍ عنوانُه، تفتحه الغرفةُ والإشعار
    review: (c) => api.nav(reviewHref ? reviewHref(c) : `/dashboard/elections/${e.id}/candidates/${c.id}`),
    restore: manage ? (c) => open({ kind: "restore", c }) : undefined,
    closeCandidacy: manage ? () => open({ kind: "closeEarly" }) : undefined,
    closeVoting: manage ? () => open({ kind: "closeEarly" }) : undefined,
    reopenCandidacy: manage ? () => open({ kind: "reopen" }, { when: soon(3) }) : undefined,
    setDeadline: manage ? () => open({ kind: "deadline" }, { when: toClubInput(timedRaw) }) : undefined,
    openVoting: manage ? () => open({ kind: "openVoting" }, { when: soon(3) }) : undefined,
    openRevote: manage ? () => open({ kind: "revote" }, { when: soon(2) }) : undefined,
    appoint: manage && canAppoint ? () => {
      setAppointees(null); open({ kind: "appoint" });
      api.loadAppointOptions(e.id).then((r) => setAppointees(r.members));
    } : undefined,
    acting: manage && canAppoint ? () => {
      setAppointees(null); open({ kind: "acting" });
      api.loadAppointOptions(e.id).then((r) => setAppointees(r.members));
    } : undefined,
    cancel: manage ? () => open({ kind: "cancel" }) : undefined,
    // التعادلُ لعضو المجلس الإداريّ ولو لم يكن ممّن يديرون الانتخاب (المادة ٢٦)، والقاعدةُ تحرسه
    chooseInTie: e.tie?.status === "open" && e.tie.isMember ? () => { open({ kind: "tie" }); setBasis(""); } : undefined,
    share: e.status === "completed" && e.winnerName ? () => {
      const w = e.candidates.find((c) => c.id === e.winnerCandidateId);
      setShare({
        position: e.positionLabel, roleName: e.targetRoleName, winner: e.winnerName!,
        gender: w?.gender === "male" || w?.gender === "female" ? w.gender : null,
        votes: w?.votes ?? 0, turnout: e.votes, confidence: e.confidence, opposeVotes: e.opposeVotes, declaredAt: e.winnerDeclaredAtRaw,
      });
    } : undefined,
  };

  /* ── قطعٌ مشتركة ── */
  const reasonField = (label: string, placeholder: string, required = true) => (
    <Textarea label={label} icon={<ChatText />} innerIcon={<Note />} placeholder={placeholder} rows={3} value={reason}
      onChange={(ev) => setReason(ev.target.value)} required={required} optional={!required} helper={reasonHelper} />
  );
  const whenField = (label: string) => (
    <Field label={label} type="datetime-local" icon={<CalendarBlank />} innerIcon={<Clock />} placeholder="" dir="ltr" value={when} onChange={(ev) => setWhen(ev.target.value)} required />
  );
  const foot = (label: string, act: () => void, ready: boolean, danger = false) => (
    <>
      <Button variant={danger ? "danger" : "primary"} size="md" loading={busy} disabled={!ready} onClick={act}>{label}</Button>
      <Button variant="ghost" size="md" onClick={close} disabled={busy}>تراجع</Button>
    </>
  );
  const futureOk = () => { const t = new Date(iso()).getTime(); return !Number.isNaN(t) && t > openedAt; };

  let body: ReactNode = null;
  if (win) {
    switch (win.kind) {
      case "restore":
        body = (
          <Modal open onClose={close} busy={busy} size="sm" title="إرجاع الترشّح" description={win.c.name}
            footer={foot("إرجاع الترشّح", () => run(() => api.restoreCandidacy((win as { c: CandidateRow }).c.id, basis as RestoreBasis, reason)), okReason(reason))}>
            <FormChoice label="أساسُ الإرجاع" items={RESTORE_BASES} value={basis} onChange={setBasis} disabled={busy} />
            {reasonField("السبب", "لماذا يُرجَع هذا الترشّح؟…")}
          </Modal>
        );
        break;
      case "deadline":
        body = (
          <Modal open onClose={close} busy={busy} size="sm" title="تعديل الموعد" description={e.status === "voting_open" ? "موعد إغلاق التصويت" : "موعد إغلاق باب الترشّح"}
            footer={foot("حفظ الموعد", () => run(() => api.setDeadline(e.id, iso(), reason)), futureOk() && okReason(reason))}>
            {whenField("الموعد الجديد")}
            {reasonField("السبب", "يُبلَّغ به المصوّتون…")}
          </Modal>
        );
        break;
      case "closeEarly": {
        const voting = e.status === "voting_open";
        body = (
          <Modal open onClose={close} busy={busy} size="sm" title={voting ? "إغلاق التصويت" : "إغلاق باب الترشّح"}
            description={beforeDeadline ? "قبل موعده، فاكتب سببه." : undefined}
            footer={foot(voting ? "إغلاق التصويت" : "إغلاق باب الترشّح", () => run(() => api.transitionElection(e.id, voting ? "voting_closed" : "candidacy_closed", { reason })), !beforeDeadline || okReason(reason))}>
            {beforeDeadline ? reasonField("السبب", "لماذا يُغلق قبل موعده؟…") : <p className="ad-elw-note">{voting ? "تُعلن المنصّةُ الفائز لحظةَ الإغلاق." : "لا يُغلق الباب إلّا وفيه ترشّح."}</p>}
          </Modal>
        );
        break;
      }
      case "openVoting":
        body = (
          <Modal open onClose={close} busy={busy} size="sm" title="فتح التصويت" description={e.positionLabel}
            footer={foot("فتح التصويت", () => run(() => api.openVoting(e.id, iso())), futureOk())}>
            {whenField("يُغلق التصويت في")}
            <p className="ad-elw-note">ويُغلق قبله آليًّا حين يصوّت الجميع.</p>
          </Modal>
        );
        break;
      case "reopen":
        body = (
          <Modal open onClose={close} busy={busy} size="sm" title="إعادة فتح باب الترشّح" description={e.positionLabel}
            footer={foot("إعادة فتح باب الترشّح", () => run(() => api.transitionElection(e.id, "candidacy_open", { reason, candidacyEndIso: iso() })), futureOk() && okReason(reason))}>
            {whenField("يُغلق الباب في")}
            {reasonField("السبب", "يُبلَّغ به أعضاءُ النطاق…")}
            {e.status === "voting_closed" ? <p className="ad-elw-note">تبطل الأصواتُ كلُّها، وينتهي ترشّحُ من سقط في تصويت الثقة.</p> : null}
          </Modal>
        );
        break;
      case "revote":
        body = (
          <Modal open onClose={close} busy={busy} size="sm" title="فتح إعادة التصويت"
            description={e.revotePending === "full" ? "تصويتُ ثقةٍ للجميع من جديد" : "لمن بطل صوته وحده"}
            footer={foot("فتح الإعادة", () => run(() => api.openRevote(e.id, iso(), reason)), futureOk() && okReason(reason))}>
            {whenField("تُغلق الإعادة في")}
            {reasonField("السبب", "يُبلَّغ به من يعنيه…")}
          </Modal>
        );
        break;
      case "appoint":
        body = (
          <Modal open onClose={close} busy={busy} size="sm" title="تعيين في المقعد" description={e.positionLabel}
            footer={foot("تعيين", () => run(() => api.appointSeatHolder(e.id, basis, reason)), !!appointees?.some((m) => m.id === basis) && okReason(reason))}>
            {appointees === null ? <p className="ad-elw-note">يُحمَّل أعضاءُ النطاق…</p>
              : <FormChoice label="العضو" items={appointees.map((m) => ({ value: m.id, label: m.label }))} value={basis} onChange={setBasis} disabled={busy} />}
            {reasonField("السبب", "لماذا يُعيَّن في هذا المقعد؟…")}
          </Modal>
        );
        break;
      case "acting":
        body = (
          <ActingModal
            seat={{ roleAr: e.roleLabel, scope: e.scopeLabel ?? e.positionLabel, owner: null }}
            members={appointees?.map((m) => ({ id: m.id, name: m.label, avatar: m.avatar ?? null, gender: m.gender ?? null, held: m.held ?? null })) ?? null}
            busy={busy}
            onClose={close}
            onSubmit={(v) => run(() => api.appointToSeat(e.id, v.userId, v.reason, v.until, v.freeze))}
            title="تكليف بالمقعد"
            description={`«${e.positionLabel}»، والانتخاب قائم`}
            minReason={MIN_REASON}
          />
        );
        break;
      case "tie": {
        const t = e.tie!;
        const tied = e.candidates.filter((c) => t.candidateIds.includes(c.id));
        const earliest = "earliest";
        body = (
          <Modal open onClose={close} busy={busy} size="sm" title="اختيارك في التعادل" description={`${e.positionLabel}، ولا يُعدَّل بعد إرساله`}
            footer={foot("إرسال اختياري", () => run(() => api.chooseInTie(t.id, basis === earliest ? null : basis, reason)), !!basis && okReason(reason))}>
            {/* المتعادلون سطورٌ مختارة بأسمائهم كاملة (كأسباب الاعتذار)، وآخرُها تركُ الأمر للأسبق ترشّحًا */}
            <ul className="ad-lines ad-elw-why" role="radiogroup" aria-label="المتعادلون">
              {tied.map((c) => <AdLine key={c.id} icon={<UserCircle />} v={c.name} sub={`تقدّم في ${c.submitted}`} current={basis === c.id} disabled={busy} onClick={() => setBasis(c.id)} />)}
              <AdLine icon={<Hourglass />} v="أترك الأمر للأسبق ترشّحًا" current={basis === earliest} disabled={busy} onClick={() => setBasis(earliest)} />
            </ul>
            {reasonField("سبب اختيارك", "يُقيَّد في سجلّ الانتخاب…")}
          </Modal>
        );
        break;
      }
      case "cancel": {
        const afterVoting = e.status === "voting_open" || e.status === "voting_closed";
        body = (
          <Modal open onClose={close} busy={busy} size="sm" className="mdl-tone-danger" title="إلغاء الانتخاب" description="يُحفظ المرشّحون والأصوات، ويُوقَف الانتخاب."
            footer={foot("تأكيد الإلغاء", () => run(() => api.cancelElection(e.id, reason, afterVoting ? (cancelBasis as "stalled" | "defect") : undefined)), okReason(reason), true)}>
            {afterVoting ? <FormChoice label="أساسُ الإلغاء" items={[...(e.stalled ? [{ value: "stalled", label: "تعثّر" }] : []), { value: "defect", label: "خللٌ يمسّ صحّته" }]} value={cancelBasis} onChange={setCancelBasis} disabled={busy} /> : null}
            <Textarea label="سبب الإلغاء" icon={<Prohibit />} innerIcon={<Note />} placeholder="لماذا يُلغى هذا الانتخاب؟…" rows={3} value={reason}
              onChange={(ev) => setReason(ev.target.value)} required helper={reasonHelper} />
          </Modal>
        );
        break;
      }
    }
  }

  const windows = (
    <>
      {body}
      <ShareResultModal card={share} open={share !== null} onClose={() => setShare(null)} />
    </>
  );
  return { on, windows };
}
