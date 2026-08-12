"use client";

// ★ مؤقّت — خمسةُ مقترحاتٍ لم يُقَرّ منها شيء: «سِجلّ ترشُّحي» حين تكثر المناصب.
// البياناتُ واحدةٌ في الجميع (سبعةُ ترشّحاتٍ في ثلاث دورات، فيها منصبٌ واحدٌ تُرشِّح له مرّتين)،
// والمبدّلُ يعرضها ستَّ مرّات: الحال اليوم ثمّ المقترحات.
//   ١) عمودان: سِجلٌّ يمينًا وتفصيلٌ يسارًا (`OptionList` + الرحلة كما هي).
//   ٢) طيٌّ في مكانه: رأسٌ مضغوط ينفتح إلى الرحلة الكاملة في موضعه.
//   ٣) الهيرو يخفّ: الهيرو المتدرّج للجاري وحده، وما انقضى برأسٍ هادئ ورحلةٍ كاملةٍ تحته.
//   ٤) مسيرة واحدة: خطٌّ زمنيٌّ واحدٌ للعضو، والترشّحاتُ محطّاتُه.
//   ٥) شبكةُ كروت: كرتٌ مقتضبٌ لكلّ ترشّح، والرحلةُ في نافذة.
// كلُّ عنصرٍ من المكتبة، والتخطيطُ بأدوات الشبكة والفراغ فقط — والمقرَّرُ منها تُكتب أصنافُه في المكتبة.
// تُحذف الصفحةُ بعد قرار المالك.

import { useState } from "react";
import { Badge, Button, Modal, ModalSectionHeading, OptionList, Segmented } from "@adeeb/design-system";
import { Archive, CaretDown, CaretUp, Clock, FlagCheckered, PencilSimple, Prohibit, Scales, Trophy, XCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { ToastProvider, useToast } from "../../../dashboard/_components/ToastProvider";
import { CandidacyJourney } from "../../../dashboard/elections/_member/CandidacyJourney";
import { JourneyBody } from "../../../dashboard/elections/_member/JourneyBody";
import { OpportunityCard } from "../../../dashboard/elections/_member/OpportunityCard";
import type { CandidacyJourney as CJ } from "../../../dashboard/elections/member-data";

/* ═══ بياناتُ المعاينة — سبعةُ ترشّحاتٍ في ثلاث دورات ═══ */

type Row = CJ & { cycle: string; cycleKey: string; submitted: string; live: boolean };

const STMT =
  "أسعى إلى بناء تغطيةٍ إعلاميّةٍ أسبوعيّةٍ منتظمة تُبرز أنشطة النادي وتصل إلى كلّ الأعضاء عبر قنواتٍ متجدّدة. لديّ خبرةُ عامين في إدارة المحتوى، وأخطّط لفريقٍ صغيرٍ يغطّي الفعاليّات ويُصدر نشرةً شهريّة.";

const ITEMS: Row[] = [
  {
    candidateId: "c1", electionId: "e1", cycleKey: "y26b", cycle: "دورة أغسطس ٢٠٢٦", submitted: "٢ أغسطس ٢٠٢٦", live: true,
    position: "قائد لجنة الإعلام", number: 3, status: "needs_edit",
    statusLabel: "يحتاج تعديلًا", statusTone: "info", future: "تصويت",
    next: "راجِع ملاحظة إدارة الموارد البشرية وعدّل بيانك أو ملفّك، ثمّ أعِد الإرسال.",
    statement: STMT, fileUrl: null, fileName: "خطة-الإعلام.pdf",
    trail: [
      { kind: "submit", label: "قُدّم الترشّح", date: "٢ أغسطس ٢٠٢٦، ١٤:٢٠" },
      { kind: "edit", label: "طُلب تعديل", date: "٣ أغسطس ٢٠٢٦، ٠٩:١٠", note: "وضّح خطّتك للتغطية الأسبوعيّة، وأضِف جدولًا زمنيًّا." },
    ],
    canEdit: true, canWithdraw: true,
  },
  {
    candidateId: "c2", electionId: "e2", cycleKey: "y26b", cycle: "دورة أغسطس ٢٠٢٦", submitted: "٤ أغسطس ٢٠٢٦", live: true,
    position: "نائب قائد لجنة البرمجة", number: 2, status: "approved",
    statusLabel: "معتمَد", statusTone: "success", future: "النتيجة",
    next: "التصويت جارٍ الآن على ترشّحك.",
    statement: STMT, fileUrl: null, fileName: null,
    trail: [
      { kind: "submit", label: "قُدّم الترشّح", date: "٤ أغسطس ٢٠٢٦، ١٠:٠٠" },
      { kind: "approve", label: "اعتُمد الترشّح", date: "٥ أغسطس ٢٠٢٦، ١٦:٤٥" },
      { kind: "open", label: "فُتح التصويت", date: "٨ أغسطس ٢٠٢٦" },
    ],
    canEdit: false, canWithdraw: false,
  },
  {
    candidateId: "c3", electionId: "e3", cycleKey: "y26a", cycle: "دورة فبراير ٢٠٢٦", submitted: "٣ فبراير ٢٠٢٦", live: false,
    position: "قائد لجنة التصميم", number: 1, status: "approved",
    statusLabel: "فائز", statusTone: "success", future: null,
    next: "مُبارَك لك! فزتَ بالمنصب يا قائد لجنة التصميم",
    statement: STMT, fileUrl: null, fileName: "رؤية-التصميم.pdf",
    trail: [
      { kind: "submit", label: "قُدّم الترشّح", date: "٣ فبراير ٢٠٢٦" },
      { kind: "approve", label: "اعتُمد الترشّح", date: "٤ فبراير ٢٠٢٦" },
      { kind: "open", label: "فُتح التصويت", date: "٩ فبراير ٢٠٢٦" },
      { kind: "win", label: "فاز بالمنصب", date: "١٢ فبراير ٢٠٢٦" },
    ],
    canEdit: false, canWithdraw: false,
  },
  {
    candidateId: "c4", electionId: "e4", cycleKey: "y26a", cycle: "دورة فبراير ٢٠٢٦", submitted: "٣ فبراير ٢٠٢٦", live: false,
    position: "قائد لجنة الإعلام", number: 4, status: "approved",
    statusLabel: "لم يُوفَّق", statusTone: "info", future: null,
    next: "انتهى التصويت؛ لم يُوفَّق ترشّحك هذه المرّة، شكرًا لِمُشاركتك.",
    statement: STMT, fileUrl: null, fileName: null,
    trail: [
      { kind: "submit", label: "قُدّم الترشّح", date: "٣ فبراير ٢٠٢٦" },
      { kind: "approve", label: "اعتُمد الترشّح", date: "٤ فبراير ٢٠٢٦" },
      { kind: "open", label: "فُتح التصويت", date: "٩ فبراير ٢٠٢٦" },
      { kind: "end", label: "انتهى التصويت", date: "١٢ فبراير ٢٠٢٦" },
    ],
    canEdit: false, canWithdraw: false,
  },
  {
    candidateId: "c5", electionId: "e5", cycleKey: "y26a", cycle: "دورة فبراير ٢٠٢٦", submitted: "٣ فبراير ٢٠٢٦", live: false,
    position: "نائب قائد لجنة العلاقات", number: 2, status: "withdrawn",
    statusLabel: "منسحب", statusTone: "neutral", future: null,
    next: "سحبتَ ترشّحك من هذا الانتخاب.",
    statement: STMT, fileUrl: null, fileName: null,
    trail: [
      { kind: "submit", label: "قُدّم الترشّح", date: "٣ فبراير ٢٠٢٦" },
      { kind: "withdraw", label: "سُحب الترشّح", date: "٥ فبراير ٢٠٢٦" },
    ],
    canEdit: false, canWithdraw: false,
  },
  {
    candidateId: "c6", electionId: "e6", cycleKey: "y25", cycle: "دورة أغسطس ٢٠٢٥", submitted: "١ أغسطس ٢٠٢٥", live: false,
    position: "قائد لجنة الإعلام", number: 5, status: "approved",
    statusLabel: "لم يُوفَّق", statusTone: "info", future: null,
    next: "انتهى التصويت؛ لم يُوفَّق ترشّحك هذه المرّة، شكرًا لِمُشاركتك.",
    statement: STMT, fileUrl: null, fileName: null,
    trail: [
      { kind: "submit", label: "قُدّم الترشّح", date: "١ أغسطس ٢٠٢٥" },
      { kind: "approve", label: "اعتُمد الترشّح", date: "٢ أغسطس ٢٠٢٥" },
      { kind: "open", label: "فُتح التصويت", date: "٧ أغسطس ٢٠٢٥" },
      { kind: "end", label: "انتهى التصويت", date: "١٠ أغسطس ٢٠٢٥" },
    ],
    canEdit: false, canWithdraw: false,
  },
  {
    candidateId: "c7", electionId: "e7", cycleKey: "y25", cycle: "دورة أغسطس ٢٠٢٥", submitted: "١ أغسطس ٢٠٢٥", live: false,
    position: "مشرف قسم الإعلام", number: 1, status: "rejected",
    statusLabel: "مرفوض", statusTone: "danger", future: null,
    next: "تعتذر إدارة الموارد البشرية عن قبول ترشّحك في هذا الانتخاب، يُمكنك رؤية سبب الرفض.",
    statement: STMT, fileUrl: null, fileName: null,
    trail: [
      { kind: "submit", label: "قُدّم الترشّح", date: "١ أغسطس ٢٠٢٥" },
      { kind: "reject", label: "رُفض الترشّح", date: "٢ أغسطس ٢٠٢٥", note: "شكرًا لتقدّمك؛ رأت الإدارة ترشّحًا أنسبَ للنطاق." },
    ],
    canEdit: false, canWithdraw: false,
  },
];

/** أيقونةُ المآل — الرسمُ يقول ما تقوله الشارة، فيُفهم قبل القراءة. */
const iconOf = (r: Row): ReactNode =>
  r.statusLabel === "فائز" ? <Trophy /> :
  r.statusLabel === "مرفوض" ? <XCircle /> :
  r.statusLabel === "منسحب" ? <Prohibit /> :
  r.statusLabel === "لم يُوفَّق" ? <FlagCheckered /> :
  r.statusLabel === "يحتاج تعديلًا" ? <PencilSimple /> :
  r.statusLabel === "معتمَد" ? <Scales /> : <Clock />;

/* ═══ ٠ — الحال اليوم ═══ */

function TodayView() {
  const toast = useToast();
  return (
    <div className="mpage">
      {ITEMS.map((c) => (
        <CandidacyJourney key={c.candidateId} c={c} onEdit={() => toast.success("محاكاة")} onWithdraw={() => toast.success("محاكاة")} />
      ))}
    </div>
  );
}

/* ═══ ١ — عمودان: سِجلٌّ وتفصيل ═══ */

function TwoColumnView() {
  const toast = useToast();
  const [sel, setSel] = useState(ITEMS[0].candidateId);
  const cur = ITEMS.find((r) => r.candidateId === sel) ?? ITEMS[0];
  return (
    <div className="grid items-start gap-4 md:grid-cols-[290px_minmax(0,1fr)]">
      {/* السِّجلُّ قسمان صريحان: ما هو قائمٌ الآن، وما انقضى وأُرشِف */}
      <div className="mpage">
        <OptionList
          aria-label="ترشّحاتك القائمة"
          heading="القائم الآن"
          value={sel}
          onValueChange={setSel}
          items={ITEMS.filter((r) => r.live).map((r) => ({ value: r.candidateId, label: r.position, hint: `${r.cycle}، ${r.statusLabel}`, count: `#${r.number}` }))}
        />
        <OptionList
          aria-label="ترشّحاتك المؤرشفة"
          heading="المؤرشف"
          value={sel}
          onValueChange={setSel}
          items={ITEMS.filter((r) => !r.live).map((r) => ({ value: r.candidateId, label: r.position, hint: `${r.cycle}، ${r.statusLabel}`, count: `#${r.number}` }))}
        />
      </div>
      <CandidacyJourney c={cur} cycle={cur.cycle} onEdit={() => toast.success("محاكاة")} onWithdraw={() => toast.success("محاكاة")} />
    </div>
  );
}

/* ═══ ٢ — طيٌّ في مكانه ═══ */

function InlineFoldView() {
  const toast = useToast();
  // أكثرُ من واحدٍ يُفتح: المقبضُ باقٍ فلا تضيع الصفحةُ تحت اليد. والقائمُ الأعجلُ مفتوحٌ ابتداءً.
  const [open, setOpen] = useState<Set<string>>(new Set([ITEMS[0].candidateId]));
  const toggle = (id: string) =>
    setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const row = (r: Row) => (
    <CandidacyJourney
      key={r.candidateId}
      c={r}
      cycle={r.cycle}
      foldable
      open={open.has(r.candidateId)}
      onToggle={() => toggle(r.candidateId)}
      onEdit={() => toast.success("محاكاة")}
      onWithdraw={() => toast.success("محاكاة")}
    />
  );

  return (
    <div className="mpage">
      <ModalSectionHeading icon={<Scales />} title="القائم الآن" />
      {ITEMS.filter((r) => r.live).map(row)}
      <ModalSectionHeading icon={<Archive />} title="المؤرشف" />
      {ITEMS.filter((r) => !r.live).map(row)}
    </div>
  );
}

/* ═══ ٣ — الهيرو يخفّ ═══ */

function QuietHeroView() {
  const toast = useToast();
  return (
    <div className="mpage">
      {ITEMS.map((r) => (
        <CandidacyJourney
          key={r.candidateId}
          c={r}
          cycle={r.cycle}
          foldable
          open={r.live}
          onToggle={() => toast.info("محاكاة")}
          onEdit={() => toast.success("محاكاة")}
          onWithdraw={() => toast.success("محاكاة")}
        />
      ))}
    </div>
  );
}

/* ═══ ٤ — مسيرةٌ واحدة ═══ */

function OneTimelineView({ onOpen }: { onOpen: (r: Row) => void }) {
  // الأقدمُ أوّلًا فالمسيرةُ تُقرأ صاعدة، والأحدثُ محطّةٌ حاليّة
  const chrono = [...ITEMS].reverse();
  return (
    <ol className="jrn">
      {chrono.map((r, i) => (
        <li key={r.candidateId} className={`jrn-i ${i === chrono.length - 1 ? "jrn-cur" : "jrn-done"}`}>
          <div className="jrn-node">{iconOf(r)}</div>
          <div className="jrn-c">
            <div className="jrn-head">
              <b className="jrn-t">{r.position}</b>
              <span className="jrn-d">{r.cycle}</span>
            </div>
            <div className="jrn-body">
              <div className="chip-row">
                <Badge tone={r.statusTone} dot>{r.statusLabel}</Badge>
                <Badge tone="neutral" variant="outline">رقمك #{r.number}</Badge>
                <Button variant="ghost" size="sm" onClick={() => onOpen(r)}>عرض الرحلة</Button>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ═══ ٥ — شبكةُ كروت ═══ */

function CardGridView({ onOpen }: { onOpen: (r: Row) => void }) {
  return (
    <div className="opp-grid">
      {ITEMS.map((r) => (
        <OpportunityCard
          key={r.candidateId}
          done={r.statusLabel === "فائز"}
          icon={iconOf(r)}
          title={r.position}
          subtitle={`${r.cycle}، رقمك #${r.number}`}
          action={
            <div className="chip-row">
              <Badge tone={r.statusTone} dot>{r.statusLabel}</Badge>
              <Button variant="ghost" size="sm" onClick={() => onOpen(r)}>عرض الرحلة</Button>
            </div>
          }
        />
      ))}
    </div>
  );
}

/* ═══ الصفحة ═══ */

const VIEWS = [
  { value: "today", label: "الحال اليوم" },
  { value: "two", label: "١ عمودان" },
  { value: "fold", label: "٢ طيٌّ في مكانه" },
  { value: "quiet", label: "٣ الهيرو يخفّ" },
  { value: "line", label: "٤ مسيرةٌ واحدة" },
  { value: "grid", label: "٥ شبكةُ كروت" },
];

const NOTE: Record<string, string> = {
  today: "سبعةُ أقسامٍ متساوية الوزن، كلٌّ منها هيرو وتنبيهٌ ورحلةٌ وبيان.",
  two: "قسمان صريحان في عمودٍ يمينًا: القائمُ الآن والمؤرشف، والمختارُ يُعرض يسارًا بالسرد الحاليّ بلا نقصان.",
  fold: "قسمان صريحان، ورؤوسٌ مضغوطةٌ بعرض الشاشة؛ القائمُ مفتوحٌ ابتداءً والمؤرشفُ يُفتح بنقرة، واحدًا في كلّ مرّة.",
  quiet: "لا حذفَ ولا طيّ: الهيرو المتدرّج للجاري وحده، وما انقضى برأسٍ هادئٍ ورحلتُه تحته كاملة.",
  line: "سِجلٌّ واحدٌ يجري من أوّل ترشّحٍ إلى اليوم، والترشّحاتُ محطّاتُه، والرحلةُ في نافذة.",
  grid: "كرتٌ مقتضبٌ لكلّ ترشّح في شبكةٍ تلتفّ، والرحلةُ في نافذة.",
};

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-line p-4 md:p-7" style={{ background: "var(--color-bg)" }}>
      <div className="ash-phead"><div><h1>سِجلّ ترشُّحي</h1></div></div>
      {children}
    </div>
  );
}

function Lab() {
  const [view, setView] = useState("today");
  const [detail, setDetail] = useState<Row | null>(null);

  return (
    <main className="py-16">
      <div className="mx-auto w-full max-w-5xl px-4">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Candidacy Record at Scale</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">سِجلّ ترشُّحٍ كثُرت مناصبُه</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          البياناتُ واحدة في المقترحات كلّها: سبعةُ ترشّحاتٍ في ثلاث دورات، فيها منصبٌ واحدٌ تُرشِّح له مرّتين.
        </p>

        <div className="mt-6">
          <Segmented aria-label="أيّ مقترح" value={view} onValueChange={setView} items={VIEWS} />
        </div>
        <p className="mt-3 max-w-2xl text-sm text-content-muted">{NOTE[view]}</p>

        <div className="mt-5">
          <Frame>
            {view === "today" ? <TodayView /> : null}
            {view === "two" ? <TwoColumnView /> : null}
            {view === "fold" ? <InlineFoldView /> : null}
            {view === "quiet" ? <QuietHeroView /> : null}
            {view === "line" ? <OneTimelineView onOpen={setDetail} /> : null}
            {view === "grid" ? <CardGridView onOpen={setDetail} /> : null}
          </Frame>
        </div>

        <Modal
          open={!!detail}
          onClose={() => setDetail(null)}
          size="md"
          title={detail?.position ?? ""}
          description={detail ? `${detail.cycle}، رقمك الانتخابي ${detail.number}` : undefined}
          footer={<Button variant="ghost" size="md" onClick={() => setDetail(null)}>إغلاق</Button>}
        >
          {detail ? <p className="cjr-stmt">{detail.statement}</p> : null}
          {detail ? <JourneyBody c={detail} /> : null}
        </Modal>
      </div>
    </main>
  );
}

export default function CandidacyRecordLab() {
  return (
    <ToastProvider>
      <Lab />
    </ToastProvider>
  );
}
