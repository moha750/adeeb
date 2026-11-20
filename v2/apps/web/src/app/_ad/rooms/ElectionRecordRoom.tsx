"use client";

/**
 * **صفحةُ الانتخاب للمدير على قالب «التذكرة المفتوحة»** (الجولة الأولى، ٢٠٢٦-١١-١٧؛ المواصفة `claude/elections-screens-spec.md` م٣).
 * الرأسُ تذكرةُ الانتخاب في غرفته مفتوحة: المقعد، وشارةُ الطور، والفعلُ الأساسيّ بحسب الطور وما سواه في «المزيد»، والحقائقُ والأرقام.
 * ثمّ التنبيهُ حين يكون ما يُفعل، ثمّ المرشّحون قائمةً بمواضع حالاتهم، ثمّ الأصواتُ (للمديرين الثلاثة وحدهم) والسجلّ.
 *
 * **الشكلُ وحده في هذه الجولة**: الأفعالُ تُمرَّر من صاحب الصفحة (`on`)، ولا يُكتب شيءٌ من هنا. والقراءاتُ الجديدة (الإعادة، والتعادل،
 * والتجميد، وسببُ التعثّر) تصل من محادثة الانتخابات، فتُضاف صفوفُها إلى `phaseOf` حين تصل.
 */
import type { ReactNode } from "react";
import { matchesSearch } from "@adeeb/design-system";
import {
  CalendarBlank, CalendarCheck, ChatText, Clock, ClockCounterClockwise, Scales, Door, DoorOpen, Hourglass, ListChecks, LockKey,
  ShareNetwork, Timer, Trophy, UserCirclePlus, UserCircle, UserSwitch, UsersThree,
} from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowLeft, Checks, Info, Prohibit, Warning } from "@/app/_components/glyphs";
import type { CandidateRow, ElectionDetail, VoteDetailRow } from "@/app/dashboard/elections/data";
import { CANDIDATE_STATUS_META, STATUS_META, byGender } from "@/app/dashboard/elections/vocab";
import { firstAndLastOf } from "@/lib/personName";
import { ENDED_SHORT, STALL } from "@/lib/notifications/catalog";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdActs, AdBadge, AdButton, AdGroupTitle, AdList, AdNote, AdRow, type AdFigure, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { CollectionRoom, type Position, type TableSpec } from "../collection";
import { RecordTicket } from "../record";
import { dayParts, fmtClock, fmtDayFull, fmtNum } from "../format";

const CANDIDATE: ArForms = ["مرشّحٌ واحد", "مرشّحان", "مرشّحين", "مرشّحًا"];
const VOTE: ArForms = ["صوتٌ واحد", "صوتان", "أصوات", "صوتًا"];

const TONE: Record<(typeof STATUS_META)[keyof typeof STATUS_META]["tone"], AdTone> = {
  success: "ok", warning: "warn", danger: "bad", neutral: "neutral", info: "info",
};

/** **حالُ المرشّح بلغة المواصفة** (§٦): «اعتُذر عنه» لا «مرفوض»، والفاعلُ «بقرار فلان» لا «بواسطة». */
// **الكلمةُ من مصدرها الواحد** (`CANDIDATE_STATUS_META`، «مصطلحات الانتخابات» ٢٠٢٦-١١-١٧): كانت هنا قائمةٌ ثانية تخالف شاشات العضو
const L = (k: CandidateRow["status"]) => CANDIDATE_STATUS_META[k].label;
export const CAND: Record<CandidateRow["status"], { label: string; tone: AdTone; verb?: string }> = {
  pending:    { label: L("pending"), tone: "warn" },
  approved:   { label: L("approved"), tone: "ok", verb: "اعتُمد" },
  needs_edit: { label: L("needs_edit"), tone: "warn", verb: "طُلب تعديله" },
  rejected:   { label: L("rejected"), tone: "bad", verb: "اعتُذر عنه" },
  withdrawn:  { label: L("withdrawn"), tone: "neutral" },
  frozen:     { label: L("frozen"), tone: "warn" },
  ended:      { label: L("ended"), tone: "neutral" },
};

/** أسبابُ الاعتذار لمن يدير الانتخاب (الخطابُ لصاحبه في `REJECT` من دليل الإشعارات) */
const REJECT_SHORT: Record<string, string> = {
  ineligible: "لا تنطبق عليه شروط الترشّح",
  statement_violation: "بيانه يخالف ضوابط الترشّح",
  unrelated: "بيانه لا يتّصل بالمقعد",
};

/** مواضعُ المرشّحين بحالاتهم — والخاليةُ لا تُرسم (القالب يُسقطها إلى «المزيد»). */
const POSITIONS: Position<CandidateRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا مرشّحين بعد." },
  { key: "pending", label: "قيد المراجعة", match: (c) => c.status === "pending", empty: "لا ترشّح قيد المراجعة." },
  { key: "approved", label: "المعتمَدون", match: (c) => c.status === "approved", empty: "لم يُعتمد أحدٌ بعد." },
  { key: "needs_edit", label: "مطلوبٌ تعديلهم", match: (c) => c.status === "needs_edit", empty: "لا تعديل مطلوب." },
  { key: "frozen", label: "قيد الاستبعاد", match: (c) => c.status === "frozen", empty: "لا أحد قيد الاستبعاد.", rare: true },
  { key: "rejected", label: "اعتُذر عنهم", match: (c) => c.status === "rejected", empty: "لم يُعتذر عن أحد.", rare: true },
  { key: "withdrawn", label: "انسحبوا", match: (c) => c.status === "withdrawn", empty: "لم ينسحب أحد.", rare: true },
  { key: "ended", label: "انتهى ترشّحهم", match: (c) => c.status === "ended", empty: "لم ينتهِ ترشّحُ أحد.", rare: true },
];

/** ما يمكن أن يُفعل في الصفحة — يمرّره صاحبُها، فالغرفةُ شكلٌ لا يكتب. */
/** **سطرُ حال المرشّح**: ما قُرّر فيه وبقرار من، أو ما ينتظره. يقرؤه سطرُه في الغرفة وصفحةُ ترشّحه */
const whenOf = (iso: string | null | undefined) => (iso ? `${fmtDayFull(iso)} ${fmtClock(iso)}` : null);
export function candidateLine(c: CandidateRow): string {
  const m = CAND[c.status];
  const when = whenOf;
  if (c.status === "needs_edit" && c.editDueRaw) return `${m.verb}${c.decidedBy ? ` بقرار ${c.decidedBy}` : ""}، حتى ${when(c.editDueRaw)}`;
  if (c.status === "rejected" && c.rejectReason) return `${m.verb}${c.decidedBy ? ` بقرار ${c.decidedBy}` : ""}: ${REJECT_SHORT[c.rejectReason] ?? ""}`;
  if (c.status === "frozen" && c.freeze) return c.freeze.status === "answered" ? `أجاب، وينتظر القرار قبل ${when(c.freeze.decideDueRaw)}` : `مُمهَل ليُجيب قبل ${when(c.freeze.answerDueRaw)}، وإلّا استُبعد`;
  if (c.status === "ended") return (c.endReason ? ENDED_SHORT[c.endReason] : null) ?? m.label;
  if (m.verb) return c.decidedBy ? `${m.verb} بقرار ${c.decidedBy}` : m.verb;
  if (c.status === "pending") return `تقدّم في ${c.submitted}`;
  if (c.status === "withdrawn") return "انسحب بنفسه، ولا تُرجعه إلّا إدارة الموارد البشرية بطلبه";
  return m.label;
}

/** **شارةُ المرشّح**: حالُه، إلّا المُمهَلَ إذا أجاب فشارتُه ما ينتظره (حالُ القاعدة واحدةٌ للخطوتين) */
export const candBadge = (c: CandidateRow) =>
  c.status === "frozen" && c.freeze?.status === "answered" ? { label: "أجاب، وينتظر القرار", tone: "warn" as AdTone } : CAND[c.status];

export type ElectionOps = {
  review?: (c: CandidateRow) => void;
  restore?: (c: CandidateRow) => void;
  closeCandidacy?: () => void;
  reopenCandidacy?: () => void;
  setDeadline?: () => void;
  openVoting?: () => void;
  openRevote?: () => void;
  closeVoting?: () => void;
  appoint?: () => void;
  acting?: () => void;
  cancel?: () => void;
  share?: () => void;
  /** رابطُ ورقة التصويت يُنسخ أو يُشارَك، والتصويتُ مفتوح */
  shareBallot?: () => void;
  /** اختيارُ عضو المجلس الإداريّ في التعادل (المادة ٢٦) */
  chooseInTie?: () => void;
};

export function ElectionRecordRoom({ election: e, readOnly = false, canAppoint = false, liveTotals = false, hrLeader = false, on = {}, logView, votesView }: {
  election: ElectionDetail;
  /** مطّلعٌ لا يدير (أعضاءُ الموارد): يرى ولا يفعل */
  readOnly?: boolean;
  /** المديرون الثلاثة وحدهم: التعيينُ والتكليف على المتعثّر */
  canAppoint?: boolean;
  /** المجاميعُ قبل الإغلاق: للمديرين الثلاثة وحدهم (المادة ٥) */
  liveTotals?: boolean;
  /** قائدُ الموارد البشرية (من مقعده): يرى في الرأس طلبَ الاستبعاد الذي ينتظره وزرًّا إليه */
  hrLeader?: boolean;
  on?: ElectionOps;
  /** السجلُّ والأصواتُ قطعتان قائمتان (`ElectionLog`، جدولُ الأصوات) يرسمهما صاحبُ الصفحة تحت المرشّحين */
  /** أو دالّةٌ تأخذ قاعَ السجلّ («إلغاء الانتخاب») فتضعه تحته */
  logView?: ReactNode | ((foot: ReactNode) => ReactNode);
  votesView?: ReactNode;
}) {
  const status = STATUS_META[e.status];
  const live = e.candidates.filter((c) => c.status === "pending" || c.status === "approved" || c.status === "needs_edit");
  const pending = e.candidates.filter((c) => c.status === "pending");
  const approved = e.candidates.filter((c) => c.status === "approved");
  const votingStarted = e.status === "voting_open" || e.status === "voting_closed" || e.status === "completed";
  // الأرقامُ لمن يحقّ له: المديرون في كلّ طور، والمطّلِعُ بعد إغلاق التصويت (المادة ٥)
  const showTotals = liveTotals || e.status === "voting_closed" || e.status === "completed";
  const winner = e.candidates.find((c) => c.id === e.winnerCandidateId) ?? null;
  // القراءاتُ الجديدة قد لا تصل من عالمٍ قديم (المحاكي قبل أن يُحدَّث): تُقرأ بحذرٍ فلا تُسقط الصفحة
  const stallText = e.stalled ? (e.stallReason ? STALL[e.stallReason] : null) ?? (live.length ? "تعثّر المقعد" : STALL.no_candidates) : null;
  const revote = e.revotePending ?? null;
  const tie = e.tie && e.tie.status === "open" ? e.tie : null;
  const linked = (e.linkedSeats ?? []).find((x) => x.status === "voting_open" || x.status === "candidacy_open" || x.status === "candidacy_closed") ?? null;
  const when = (iso: string | null | undefined) => (iso ? `${fmtDayFull(iso)} ${fmtClock(iso)}` : null);
  // **المواضعُ الخاليةُ لا تُرسم** إلّا «الكلّ» و«ينتظرون المراجعة» والبابُ مفتوح (ما ينتظر يدَك يبقى ظاهرًا ولو صفرًا)
  const positions = POSITIONS.filter((p) => p.key === "all" || (p.key === "pending" && e.status === "candidacy_open") || e.candidates.some(p.match));

  /* ── الفعلُ الأساسيّ وما في «المزيد» بحسب الطور (جدولُ م٣) ── */
  const cancelOp: AdOp | null = on.cancel ? { key: "cancel", label: "إلغاء الانتخاب", icon: <Prohibit />, danger: true, onClick: on.cancel } : null;
  const appointOps: AdOp[] = canAppoint
    ? [
        ...(on.appoint ? [{ key: "appoint", label: "تعيين في المقعد", icon: <UserCirclePlus />, onClick: on.appoint }] : []),
        ...(on.acting ? [{ key: "acting", label: "تكليف بالمقعد", icon: <UserSwitch />, onClick: on.acting }] : []),
      ]
    : [];
  const deadlineOp: AdOp | null = on.setDeadline ? { key: "deadline", label: "تعديل الموعد", icon: <CalendarBlank />, onClick: on.setDeadline } : null;
  const reopenOp: AdOp | null = on.reopenCandidacy ? { key: "reopen", label: "إعادة فتح باب الترشّح", icon: <DoorOpen />, onClick: on.reopenCandidacy } : null;
  const ops = (...xs: (AdOp | null)[]) => xs.filter((x): x is AdOp => !!x);

  const plan = ((): { primary: { label: string; icon: ReactNode; onClick?: () => void } | null; more: AdOp[] } => {
    switch (e.status) {
      case "candidacy_open":
        return e.stalled
          ? { primary: { label: "إعادة فتح باب الترشّح", icon: <DoorOpen />, onClick: on.reopenCandidacy }, more: ops(...appointOps, cancelOp) }
          : { primary: { label: "إغلاق باب الترشّح", icon: <Door />, onClick: on.closeCandidacy }, more: ops(deadlineOp, cancelOp) };
      case "candidacy_closed":
        return { primary: { label: "فتح التصويت", icon: <ListChecks />, onClick: on.openVoting }, more: ops(reopenOp, cancelOp) };
      case "voting_open":
        return { primary: { label: "إغلاق التصويت", icon: <LockKey />, onClick: on.closeVoting }, more: ops(deadlineOp) };
      case "voting_closed":
        if (revote) return { primary: { label: "فتح إعادة التصويت", icon: <ArrowCounterClockwise />, onClick: on.openRevote }, more: ops(cancelOp) };
        return e.stalled
          ? { primary: { label: "إعادة فتح باب الترشّح", icon: <DoorOpen />, onClick: on.reopenCandidacy }, more: ops(...appointOps, cancelOp) }
          : { primary: null, more: ops(cancelOp) };
      case "completed":
        return { primary: on.share ? { label: "مشاركة النتيجة", icon: <ShareNetwork />, onClick: on.share } : null, more: [] };
      case "cancelled":
        return { primary: null, more: [] };
    }
  })();

  /*
   * **في الرأس العودةُ والأساسيُّ وحدهما** (محمد ٢٠٢٦-١١-٢٠: «ألا ترى أن أصبحت الأزرار الآن مزدحمة؟»، وحلُّها حلُّ «صفحة ترشّحي»: «٣ أزرار
   * مرّة كثير»). وما كان في «المزيد» يقف حيث يعمل: «تعديل الموعد» بجانب سطر الموعد، و«إعادة فتح الباب» في تنبيه «أُغلق الباب»،
   * والتعيينُ والتكليف في تنبيه التعثّر، و«إلغاء الانتخاب» في قاع السجلّ كالانسحاب في قاع «رحلة ترشّحك». والمطّلِعُ لا يفعل، إلّا المشاركة
   */
  const opOf = (key: string) => (readOnly ? undefined : plan.more.find((o) => o.key === key));
  const acts = (() => {
    const p = plan.primary;
    if (readOnly) return e.status === "completed" && p?.onClick ? <AdButton variant="fill" size="sm" icon={p.icon} onClick={p.onClick}>{p.label}</AdButton> : null;
    return p ? <AdButton variant="fill" size="sm" icon={p.icon} onClick={p.onClick ?? (() => {})}>{p.label}</AdButton> : null;
  })();
  const deadlineAct = opOf("deadline") ? { label: "تعديل الموعد", onClick: opOf("deadline")!.onClick } : undefined;
  const reopenAct = opOf("reopen");
  const appointActs = plan.more.filter((o) => !readOnly && (o.key === "appoint" || o.key === "acting"));
  const cancel = opOf("cancel");
  const foot = cancel ? <AdButton variant="danger" size="sm" icon={cancel.icon} onClick={cancel.onClick ?? (() => {})}>{cancel.label}</AdButton> : null;

  /* ── الكعب: موعدُ الطور القائم، أو يومُ الإعلان أو الإلغاء ── */
  // الكعبُ أهمُّ معلومةٍ في السجلّ: موعدُ الطور القائم، أو يومُ انتهى (الباب أو التصويت)، أو يومُ الإعلان أو الإلغاء
  const stubIso = e.status === "candidacy_open" || e.status === "candidacy_closed" ? e.candidacyEndRaw
    : e.status === "voting_open" || e.status === "voting_closed" ? e.votingEndRaw
    : e.status === "completed" ? e.winnerDeclaredAtRaw
    : e.status === "cancelled" ? e.cancel?.atRaw ?? null
    : null;
  const stub = e.stalled ? { big: "", small: "متعثّر", icon: <Warning /> }
    : stubIso ? (() => { const d = dayParts(stubIso); return { big: d.day, small: d.month }; })()
    // بلا تاريخ: رمزُ الحال نفسِه لا ساعةٌ رمليّة (الرمليّةُ «ينتظر»، والمكتملُ لا ينتظر شيئًا)
    : { big: "", small: "", icon: e.status === "completed" ? (e.completedBy === "appointment" ? <UserCirclePlus /> : <Trophy />)
        : e.status === "cancelled" ? <Prohibit /> : e.status === "voting_closed" ? <LockKey /> : <Hourglass /> };

  /* ── الحقائق ── */
  const info: AdMeta[] = [
    ...(e.scopeLabel ? [{ icon: <UsersThree />, text: e.scopeLabel }] : []),
    ...(e.status === "candidacy_open" && !e.stalled
      ? [e.candidacyEnd ? { icon: <Timer />, text: `يُغلق باب الترشّح ${e.candidacyEnd}`, act: deadlineAct } : { icon: <Hourglass />, text: "بلا موعد: تُغلقه إدارة الموارد البشرية", tone: "warn" as const, act: deadlineAct }] : []),
    ...(e.status === "voting_open" && e.votingEnd ? [{ icon: <Timer />, text: `يُغلق التصويت ${e.votingEnd}، أو حين يصوّت الجميع`, act: deadlineAct }] : []),
    // **ما يحسم الفوز سطرًا واحدًا** («مصطلحات الانتخابات» ٢٠٢٦-١١-١٧، البند ١): الرقمان بجانب كلّ مرشّح لا يُفهمان بلا قاعدتهما (المادتان ١٩ و٢٦)
    ...(showTotals && votingStarted && e.status !== "cancelled"
      ? [{ icon: <Scales />, text: e.confidence ? "يُوزن كلّ صوتٍ بمنصب صاحبه، ويفوز إن زاد وزن التأييد على الاعتراض" : "يُوزن كلّ صوتٍ بمنصب صاحبه، ويفوز الأعلى وزنًا" }] : []),
    ...(e.status === "completed" && e.completedBy === "appointment" && e.appointedName
      ? [{ icon: <UserCirclePlus />, text: `اكتمل بالتعيين: ${firstAndLastOf(e.appointedName)}`, tone: "ok" as const }] : []),
    ...(e.status === "cancelled" && e.cancel
      ? [{ icon: <Prohibit />, text: `أُلغي في ${fmtDayFull(e.cancel.atRaw)}${e.cancel.by ? ` بقرار ${e.cancel.by}` : ""}`, tone: "bad" as const }] : []),
    ...(e.status === "completed" && e.completedBy !== "appointment" && e.winnerName
      ? [{ icon: <Trophy />, text: `${byGender(winner?.gender, "فاز", "فازت")} ${firstAndLastOf(e.winnerName)}`, tone: "ok" as const },
         ...(e.winnerDeclaredAtRaw ? [{ icon: <CalendarCheck />, text: `أُعلن في ${fmtDayFull(e.winnerDeclaredAtRaw)}` }] : [])]
      : []),
  ];

  /* ── الأرقام: رحلةُ الانتخاب ── */
  const figures: AdFigure[] = [
    { icon: <UsersThree />, value: fmtNum(e.candidates.length), label: "تقدّموا" },
    { icon: <Checks />, value: fmtNum(approved.length), label: "المعتمَدون" },
    // أربعةٌ تصير صفّين بجانب الحقائق: قبل التصويت ما ينتظر يدَك، وبعده الأصوات
    ...(votingStarted
      ? [{ icon: <Trophy />, value: showTotals ? fmtNum(e.candidates.reduce((n, c) => n + c.weight, 0)) : "—", label: "الوزن" }, { icon: <UsersThree />, value: fmtNum(e.votes), label: "المصوّتون" }]
      : [{ icon: <Hourglass />, value: fmtNum(pending.length), label: "قيد المراجعة" }, { icon: <ChatText />, value: fmtNum(e.candidates.filter((c) => c.status === "needs_edit").length), label: "مطلوبٌ تعديلهم" }]),
  ];

  const head = (
    <RecordTicket
      path="/dashboard/elections"
      title={e.positionLabel}
      seed={e.id}
      stub={stub}
      chips={
        <>
          <AdBadge tone={e.stalled ? "warn" : TONE[status.tone]}>{e.stalled ? "متعثّر" : status.label}</AdBadge>
          {e.confidence && votingStarted ? <AdBadge>تصويت الثقة</AdBadge> : null}
        </>
      }
      acts={acts}
      info={info}
      // لا أرقامَ أصفارًا لمقعدٍ لم يتقدّم إليه أحد: الفراغُ تحته يقولها
      figures={e.candidates.length ? figures : undefined}
    />
  );

  /* ── التنبيه حين يكون ما يُفعل (جدولُ م٣) ── */
  const notice = (() => {
    if (e.status === "cancelled") return <AdNote tone="bad" label="انتخابٌ ملغى" title={e.cancel?.reason ? `السبب: ${e.cancel.reason}` : "حُفظ المرشّحون والأصوات كما هي"}>{e.cancel?.reason ? "وحُفظ المرشّحون والأصوات كما هي." : null}</AdNote>;
    // **ما ينتظر القائدةَ في الاستبعاد** (محمد ٢٠٢٦-١١-١٩): القرارُ في صفحة المرشّح لأنّه يحتاج البيانَ والسببَ والإجابةَ أمامه، والطريقُ
    // إليه هنا. الطلبُ قبل الإجابة، والأقدمُ أوّلًا
    const asked = hrLeader ? e.candidates.filter((c) => c.freeze?.status === "requested") : [];
    const answered = hrLeader ? e.candidates.filter((c) => c.status === "frozen" && c.freeze?.status === "answered") : [];
    const waiting = asked[0] ?? answered[0];
    if (waiting) {
      const n = asked.length + answered.length;
      return (
        <AdNote tone="warn" label="طلب استبعاد"
          title={asked.length ? `طلبُ استبعاد ${firstAndLastOf(waiting.name)} ينتظر موافقتك` : `${byGender(waiting.gender, "أجاب", "أجابت")} ${firstAndLastOf(waiting.name)}، وينتظر قرارك`}
          action={on.review ? <AdButton size="sm" icon={<ArrowLeft />} onClick={() => on.review!(waiting)}>افتح الطلب</AdButton> : undefined}>
          {n > 1 ? "وينتظرك في المقعد غيرُه." : undefined}
        </AdNote>
      );
    }
    if (e.stalled) return <AdNote tone="warn" label="تعثّر المقعد" title={stallText}
      action={appointActs.length ? <>{appointActs.map((o) => <AdButton key={o.key} size="sm" icon={o.icon} onClick={o.onClick ?? (() => {})}>{o.label}</AdButton>)}</> : undefined}>{canAppoint ? "أعِد فتح الباب بموعدٍ جديد، أو عيّن في المقعد، أو ألغِ الانتخاب." : "أعِد فتح الباب بموعدٍ جديد، أو ألغِ الانتخاب."}</AdNote>;
    if (revote === "partial") return <AdNote tone="warn" label="أُغلق التصويت" title="انتهى ترشّحٌ بعد الإغلاق، فبطلت أصوات من صوّتوا له">افتح إعادة التصويت لهم وحدهم بموعدٍ وسبب.</AdNote>;
    if (revote === "full") return <AdNote tone="warn" label="أُغلق التصويت" title="لم يبقَ إلّا مرشّحٌ واحد، فيُعاد التصويت تصويتَ ثقة">افتح إعادة التصويت للجميع بموعدٍ وسبب.</AdNote>;
    if (tie) {
      // **اختيارُ العضو من التنبيه نفسه** (المواصفة: «التعادل للمجلس الإداريّ»): من لم يختر بعدُ يرى زرّه، ومن اختار يرى اختياره.
      // والعددُ بلا أسماء: «اختار 2 من 3»، ولا يُعرف من اختار ماذا إلّا صاحبُه
      const mine = tie.choices?.find((x) => x.isMe) ?? null;
      const mineName = mine ? (mine.candidateId ? e.candidates.find((x) => x.id === mine.candidateId)?.name : null) : null;
      const count = tie.choices ? `اختار ${fmtNum(tie.choices.length)} من ${fmtNum(tie.councilSize ?? 0)}.` : null;
      return (
        <AdNote tone="warn" label="تعادل" title={`ينتظر قرار المجلس الإداريّ حتى ${when(tie.dueAtRaw)}`}
          action={on.chooseInTie && tie.isMember && !mine && !tie.paused ? <AdButton size="sm" icon={<Scales />} onClick={on.chooseInTie}>اختيارك في التعادل</AdButton> : undefined}>
          {tie.paused ? "الأجلُ موقوفٌ حتى يُحسم استبعادٌ في أحد المتعادلين."
            : mine ? `${count} واخترت ${mineName ? firstAndLastOf(mineName) : "ترك الأمر للأسبق ترشّحًا"}.` : count}
        </AdNote>
      );
    }
    if (linked) return <AdNote tone="info" label="أُغلق التصويت" title={`ينتظر إغلاق مقعد ${linked.positionLabel} في القسم`} action={<AdButton size="sm" icon={<ArrowLeft />} href={`/dashboard/elections/${linked.id}`}>فتح المقعد</AdButton>} />;
    if (e.status === "candidacy_open" && pending.length && !readOnly) return <AdNote tone="info" label="الترشّح مفتوح" title={`${arCount(pending.length, CANDIDATE)} ${pending.length === 1 ? "ينتظر" : "ينتظرون"} مراجعتك`} />;
    if (e.status === "candidacy_closed") {
      const stuck = e.candidates.filter((c) => c.status === "pending" || c.status === "needs_edit" || c.status === "frozen");
      return stuck.length
        ? <AdNote tone="warn" label="أُغلق الباب" title="لا يُفتح التصويت قبل أن يُحسم كلُّ ترشّح"
            action={reopenAct ? <AdButton size="sm" icon={reopenAct.icon} onClick={reopenAct.onClick ?? (() => {})}>{reopenAct.label}</AdButton> : undefined}>{stuck.map((c) => `${firstAndLastOf(c.name)}: ${candBadge(c).label}`).join("، ")}.</AdNote>
        : <AdNote tone="info" label="أُغلق الباب" title="التصويتُ ينتظر أن تفتحه"
            action={reopenAct ? <AdButton size="sm" icon={reopenAct.icon} onClick={reopenAct.onClick ?? (() => {})}>{reopenAct.label}</AdButton> : undefined}>{`في البطاقة ${arCount(approved.length, CANDIDATE)}${approved.length === 1 ? "، فالتصويتُ تصويتُ ثقة" : ""}.`}</AdNote>;
    }
    if (e.status === "voting_open" && e.revoteOnly) return <AdNote tone="info" label="إعادة تصويت" title="لمن بطل صوته وحده">يُغلق آليًّا حين يصوّتون جميعًا.</AdNote>;
    if (e.status === "voting_open") return (
      <AdNote tone="ok" label="التصويت مفتوح" title={`${arCount(e.votes, VOTE)} حتى الآن`}
        action={on.shareBallot && !readOnly ? <AdButton size="sm" icon={<ShareNetwork />} onClick={on.shareBallot}>رابط ورقة التصويت</AdButton> : undefined}>
        يُغلق آليًّا حين يصوّت الجميع.
      </AdNote>
    );
    if (e.status === "voting_closed" && e.jointBlocking) return <AdNote tone="info" label="أُغلق التصويت" title="ينتظر إغلاقَ مقعدٍ آخر في القسم يشاركه مرشّحًا" />;
    if (e.status === "voting_closed") return <AdNote tone="info" label="أُغلق التصويت" title="تُعلن المنصّةُ الفائز" />;
    return null;
  })();

  /* ── سطرُ المرشّح ── */
  const subOf = (c: CandidateRow): AdMeta[] => [
    { icon: <ChatText />, text: candidateLine(c), tone: c.status === "rejected" ? "bad" : c.status === "needs_edit" ? "warn" : undefined },
    ...(c.id === e.winnerCandidateId ? [{ icon: <Trophy />, text: byGender(c.gender, "الفائز", "الفائزة"), tone: "ok" as const }] : []),
  ];
  const cellsOf = (c: CandidateRow) => showTotals && votingStarted
    ? [{ label: "الوزن", value: fmtNum(c.weight) }, { label: "المصوّتون", value: fmtNum(c.votes) }]
    : [];
  const actsOf = (c: CandidateRow) => {
    if (readOnly) return <AdActs inRow primary={{ label: "التفاصيل", icon: <Info />, onClick: () => on.review?.(c) }} ops={[]} />;
    if (c.status === "pending") return <AdActs inRow primary={{ label: "مراجعة", icon: <ListChecks />, onClick: () => on.review?.(c) }} ops={[]} />;
    const back = (c.status === "withdrawn" || c.status === "rejected") && !votingStarted && on.restore
      ? [{ key: "restore", label: "إرجاع الترشّح", icon: <ArrowCounterClockwise />, onClick: () => on.restore!(c) }] : [];
    return <AdActs inRow primary={{ label: "التفاصيل", icon: <Info />, onClick: () => on.review?.(c) }} ops={back} />;
  };
  const row = (c: CandidateRow) => (
    <AdRow
      key={c.id}
      face={{ name: c.name, gender: c.gender, src: c.avatar }}
      title={c.name}
      badge={<AdBadge tone={candBadge(c).tone}>{candBadge(c).label}</AdBadge>}
      sub={subOf(c)}
      cells={cellsOf(c)}
      acts={actsOf(c)}
    />
  );
  const table = (): TableSpec<CandidateRow> => ({
    head: "المرشّح",
    stub: { key: "face", label: "", icon: <UserCircle /> },
    columns: showTotals && votingStarted
      ? [{ key: "weight", label: "الوزن", icon: <Trophy /> }, { key: "votes", label: "المصوّتون", icon: <UsersThree /> }]
      : [],
  });

  return (
    <CollectionRoom<CandidateRow>
      navPath="/dashboard/elections"
      title={e.positionLabel}
      head={head}
      listOnly
      pageSize={Infinity}
      noun={CANDIDATE}
      items={e.candidates}
      positions={positions}
      defaultPosition={pending.length && !readOnly ? "pending" : "all"}
      searchPlaceholder="ابحث باسم المرشّح…"
      matchSearch={(c, q) => matchesSearch(q, c.name)}
      emptyAll={{ title: "لا مرشّحين بعد", desc: e.status === "candidacy_open" ? "سيظهر هنا كلُّ من يتقدّم، وتراجعه من سطره." : "لم يتقدّم أحدٌ لهذا المقعد." }}
      idOf={(c) => c.id}
      notice={notice}
      table={table}
      renderCard={row}
      renderRow={row}
      after={<>{votesView}{typeof logView === "function" ? logView(foot) : <>{logView}{foot ? <section className="ad-sec"><div className="ad-sec-foot ad-elw-pg-acts">{foot}</div></section> : null}</>}</>}
    />
  );
}

/** اسمُ ما يُعرض فوق السجلّ (للصفحة التي ترسمه) */
export const ELECTION_LOG_TITLE = { icon: <ClockCounterClockwise />, title: "سجلّ الانتخاب" };

const VOID_REASON: Record<string, string> = {
  candidacy_ended: "بطل: انتهى ترشّح من صوّت له",
  single_left: "بطل: لم يبقَ إلّا مرشّحٌ واحد",
  reopened: "بطل: أُعيد فتح الباب",
};

/**
 * **تفصيلُ الأصوات** — للمديرين الثلاثة وحدهم بعد أوّل صوت (المادة ٢١؛ `get_election_vote_detail` ترفض غيرهم أصلًا). ثمّ
 * الأوراقُ سطورًا: الناخبُ برتبته ساعةَ صوّت، ولمن صوّت (أو «اعتراض» في التزكية)، والوزن، والوقت. والباطلُ يبقى مُعلَّمًا بسببه ولا يُحسب.
 */
export function ElectionVotes({ votes }: { votes: VoteDetailRow[] }) {
  if (!votes.length) return null;
  return (
    <section className="ad-elw-votes" aria-label="تفصيل الأصوات">
      <AdGroupTitle icon={<Scales />}>تفصيل الأصوات</AdGroupTitle>
      {/* كان فوقها تنبيهُ «أمانةٌ في يدك»، وحذفه محمد ٢٠٢٦-١١-١٩: «لا أحد سيسرّب موضوعًا مثل هذا» */}
      <AdList label="تفصيل الأصوات" head="المصوّت" stub={{ key: "face", label: "", icon: <UserCircle /> }}
        columns={[{ key: "for", label: "لمن", icon: <ListChecks />, text: true }, { key: "w", label: "الوزن", icon: <Trophy /> }, { key: "at", label: "متى", icon: <Clock />, text: true }]}>
        {votes.map((v, i) => (
          <AdRow key={`${v.voter}-${v.at}-${i}`}
            face={{ name: v.voter, src: v.voterAvatar, gender: v.voterGender }}
            title={v.voter}
            badge={v.voided ? <AdBadge tone="neutral">باطل</AdBadge> : undefined}
            sub={[...(v.voterRole ? [{ icon: <UserCircle />, text: v.voterRole }] : []), ...(v.voided && v.voidReason ? [{ icon: <Info />, text: VOID_REASON[v.voidReason] ?? "بطل", tone: "warn" as const }] : [])]}
            cells={[
              { label: "لمن", value: v.choice === "reject" ? "اعتراض" : v.candidate ?? "—", text: true, tone: v.choice === "reject" ? "bad" : undefined },
              // **الوزنُ مقابلَ اسمه** (محمد ٢٠٢٦-١١-٢٠ في الجوّال: «لماذا الوزن الرقم ليس مقابلًا له؟»): رقمٌ وحيدٌ بين خليّتين نصّيّتين
              // كان يُرسم في الضيّق حصّةَ أرقام (اسمُه فوق قيمته). فيُعلَّم نصًّا: اسمُه في أوّل السطر وقيمتُه في طرفه كجارَيه، والجدولُ كما هو
              { label: "الوزن", value: fmtNum(v.weight), text: true },
              { label: "متى", value: v.at, text: true },
            ]}
            acts={null}
          />
        ))}
      </AdList>
    </section>
  );
}
