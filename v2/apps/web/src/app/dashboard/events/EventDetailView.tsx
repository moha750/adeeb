"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Badge, BarList, Button, SectionCard, Textarea, matchesSearch, Modal } from "@adeeb/design-system";
import { CalendarBlank, Certificate, ChatText, Clock, Copy, MapPin } from "@phosphor-icons/react";
import { ArrowUUpLeft } from "@/app/_components/glyphs";
import { CheckCircle, PencilSimple, Prohibit, WhatsappLogo } from "@/app/_components/glyphs";
import { waHref } from "@/lib/whatsapp";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar } from "../_components/Toolbar";
import { Tabs } from "../_components/Tabs";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import type { MenuGroup } from "../_components/DropdownMenu";
import type { EventDetail, ReservationRow } from "./data";
import { ACCOUNT_TYPE_LABEL, AUDIENCE_LABEL, STAGE_META, TYPE_META, reservationStage } from "./vocab";
import {
  batchConfirmWhatsapp, batchMarkCertificatesSent, cancelReservation,
  confirmWhatsapp, markAttendance, markCertificateSent, type EventResult,
} from "./actions";
import { StatusBadge } from "./StatusBadge";
import { TypeBadge } from "./TypeBadge";
import { Breadcrumb } from "../_shell/Breadcrumb";

type Phase = "draft" | "cancelled" | "upcoming" | "today" | "ended";
type TabKey = "whatsapp" | "attendance" | "certificates" | "completed" | "dropped" | "all";

const stageOf = (r: ReservationRow) =>
  reservationStage({ status: r.status, attendance: r.attendance, whatsappConfirmed: r.whatsappConfirmed, certificateSent: r.certificateSent });

// تبويبات المراحل — كلٌّ يطابق أهله في خطّ العمل، والقابل للتحديد يُتيح فعلًا جماعيًّا.
const STAGE_TABS: { value: TabKey; label: string; match: (r: ReservationRow) => boolean; selectable: boolean }[] = [
  { value: "whatsapp", label: "تأكيد واتساب", match: (r) => r.status === "confirmed" && !r.whatsappConfirmed && r.attendance === "registered", selectable: true },
  { value: "attendance", label: "تسجيل الحضور", match: (r) => r.status === "confirmed" && r.attendance === "registered", selectable: false },
  { value: "certificates", label: "إرسال الشهادات", match: (r) => r.attendance === "attended" && !!r.certificateSerial && !r.certificateSent, selectable: true },
  { value: "completed", label: "مكتمل", match: (r) => r.certificateSent, selectable: false },
  { value: "dropped", label: "لم يحضر / ملغى", match: (r) => r.status === "cancelled" || r.attendance === "no_show", selectable: false },
  { value: "all", label: "الكلّ", match: () => true, selectable: false },
];

const AR_DIGITS = (s: string | number) => String(s).replace(/[0-9]/g, (x) => "٠١٢٣٤٥٦٧٨٩"[+x]);
const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** "YYYY-MM-DD" → «الأربعاء، ٦ مايو ٢٠٢٦» (يوم الأسبوع + أرقام عربيّة). */
function fmtFullDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}، ${AR_DIGITS(d)} ${MONTHS[m - 1]} ${AR_DIGITS(y)}`;
}
/** "HH:MM" (٢٤‑ساعة) → «١٠:٠٠ ص» (١٢‑ساعة، أرقام عربيّة). */
function to12h(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${AR_DIGITS(h12)}:${AR_DIGITS(String(m).padStart(2, "0"))} ${h < 12 ? "ص" : "م"}`;
}

/** رسالة تأكيد واتساب بالقالب المعتمَد — مُعبّأة ببيانات الحاجز والفعاليّة. */
function buildWaMessage(r: ReservationRow, d: EventDetail): string {
  const greet = r.fullName?.trim() ? `السلام عليكم ${r.fullName.trim()}،` : "السلام عليكم،";
  const time = d.startTime ? `الوقت: ${d.endTime ? `${to12h(d.startTime)} - ${to12h(d.endTime)}` : to12h(d.startTime)}` : "";
  const loc = d.location
    ? (d.locationUrl ? `الموقع: ${d.location}\n${d.locationUrl}` : `الموقع: ${d.location}`)
    : (d.locationUrl ? `الموقع:\n${d.locationUrl}` : "");
  return [
    greet,
    `نؤكد حجزك في ${TYPE_META[d.type].label} "${d.name}".`,
    `التاريخ: ${fmtFullDate(d.date)}`,
    time,
    "ملحوظة: يُرجى الحضور قبل الموعد المحدد بـ10 دقايق على الأقل لضمان سلاسة الدخول.",
    loc,
    "نسعد بحضورك.\nمع تحيات نادي أدِيب",
  ].filter(Boolean).join("\n\n");
}

const StageBadge = ({ r }: { r: ReservationRow }) => {
  const m = STAGE_META[stageOf(r)];
  return <Badge tone={m.tone} variant="soft" dot>{m.label}</Badge>;
};

export function EventDetailView({ detail }: { detail: EventDetail }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cancelTarget, setCancelTarget] = useState<ReservationRow | null>(null);
  const [reason, setReason] = useState("");

  const s = detail.stats;
  const seats = detail.seats;

  const phase: Phase =
    detail.status === "cancelled" ? "cancelled"
      : detail.status === "draft" ? "draft"
      : detail.isPast ? "ended"
      : detail.isToday ? "today"
      : "upcoming";

  // التبويب الافتراضيّ = تبويبُ عمل الطور إن كان فيه أحد، وإلّا «الكلّ» (فلا يفتح على تبويبٍ فارغ)
  const countIn = (v: TabKey) => detail.reservations.filter(STAGE_TABS.find((t) => t.value === v)!.match).length;
  const phaseTab: TabKey = phase === "ended" ? "certificates" : phase === "today" ? "attendance" : phase === "upcoming" ? "whatsapp" : "all";
  const defaultTab: TabKey = phaseTab !== "all" && countIn(phaseTab) > 0 ? phaseTab : "all";
  const [tab, setTab] = useState<TabKey>(defaultTab);
  const currentTab = STAGE_TABS.find((t) => t.value === tab) ?? STAGE_TABS[STAGE_TABS.length - 1];

  // التحديد يخصّ تبويبًا؛ يُصفَّر عند التنقّل (في المُعالِج لا في تأثير — التبويب لا يتغيّر إلّا هنا)
  const changeTab = (v: TabKey) => { setTab(v); setSelected(new Set()); };

  const run = (fn: () => Promise<EventResult>) => {
    startPending(async () => {
      const r = await fn();
      if (r.ok) { toast.success(r.message); setCancelTarget(null); setReason(""); router.refresh(); }
      else toast.error(r.message);
    });
  };
  const runBatch = (fn: (ids: string[]) => Promise<EventResult>) => {
    const ids = [...selected];
    startPending(async () => {
      const r = await fn(ids);
      if (r.ok) { toast.success(r.message); setSelected(new Set()); router.refresh(); }
      else toast.error(r.message);
    });
  };
  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`نُسخ ${label}.`); } catch { toast.error("تعذّر النسخ."); }
  };
  const openWa = (r: ReservationRow) => { if (r.phone) window.open(waHref(r.phone, buildWaMessage(r, detail)), "_blank", "noopener"); };

  const tabItems = useMemo(
    () => STAGE_TABS.map((t) => {
      const n = detail.reservations.filter(t.match).length;
      return { value: t.value, label: t.label, badge: n > 0 ? String(n) : undefined };
    }),
    [detail.reservations],
  );

  const rows = useMemo(() => {
    return detail.reservations.filter((r) => {
      if (!currentTab.match(r)) return false;
      if (!matchesSearch(search, r.fullName, r.phone, r.email)) return false;
      return true;
    });
  }, [detail.reservations, search, currentTab]);

  /* ── الأعمدة: مشتركة (اسم · تواصل) + عمود المرحلة/الفعل حسب التبويب ── */

  const nameCol: Column<ReservationRow> = {
    key: "name", header: "المشارك", width: "minmax(160px, 1.8fr)",
    render: (r) => <span className="txt"><b>{r.fullName ?? "—"}</b><span className="text-content-muted">، {ACCOUNT_TYPE_LABEL[r.accountType]}</span></span>,
  };
  const contactCol: Column<ReservationRow> = {
    key: "contact", header: "التواصل", width: "minmax(150px, 1.3fr)",
    render: (r) => (
      <span className="txt inline-flex items-center gap-2">
        <bdi dir="ltr">{r.phone ?? "—"}</bdi>
        {r.phone ? <Button variant="ghost-success" size="sm" onClick={() => openWa(r)} aria-label="مراسلة واتساب" title="مراسلة واتساب"><WhatsappLogo /></Button> : null}
      </span>
    ),
  };
  const actionCol = (header: string, label: string, fn: (r: ReservationRow) => Promise<EventResult>): Column<ReservationRow> => ({
    key: "act", header, width: "128px", align: "end",
    render: (r) => <Button variant="primary" size="sm" disabled={pending} onClick={() => run(() => fn(r))}>{label}</Button>,
  });

  const columns: Column<ReservationRow>[] = useMemo(() => {
    const base = [nameCol, contactCol];
    switch (tab) {
      case "whatsapp": return [...base, actionCol("الإجراء", "تأكيد", (r) => confirmWhatsapp(r.id))];
      case "attendance": return [...base, actionCol("الإجراء", "حاضر", (r) => markAttendance(r.id, "attended"))];
      case "certificates": return [...base, actionCol("الإجراء", "أُرسلت", (r) => markCertificateSent(r.id))];
      case "completed": return [...base, { key: "cert", header: "رقم الشهادة", width: "1fr", render: (r) => <span className="txt text-content-muted">{r.certificateSerial ?? "—"}</span> }];
      case "dropped": return [...base, { key: "stage", header: "الحالة", width: "1fr", render: (r) => <StageBadge r={r} /> }];
      default: return [
        ...base,
        { key: "stage", header: "المرحلة", width: "1.1fr", render: (r) => <StageBadge r={r} /> },
        { key: "reserved", header: "وقت الحجز", width: "minmax(140px, 1.2fr)", render: (r) => <span className="txt">{r.reservedAtLabel}</span> },
      ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pending]);

  // قائمة «⋯» للحوافّ — في تبويب «الكلّ» وحده (بقيّة التبويبات فعلُها زرٌّ ظاهر)
  const allActions = (r: ReservationRow): MenuGroup[] => {
    const groups: MenuGroup[] = [];
    const contact = [];
    if (r.phone) contact.push({ label: "مراسلة واتساب", icon: <WhatsappLogo />, onSelect: () => openWa(r) });
    if (r.phone) contact.push({ label: "نسخ الجوّال", icon: <Copy />, onSelect: () => copy(r.phone!, "الجوّال") });
    if (r.email) contact.push({ label: "نسخ البريد", icon: <Copy />, onSelect: () => copy(r.email!, "البريد") });
    if (contact.length) groups.push({ header: "التواصل", items: contact });
    if (r.status === "confirmed") {
      const ops = [];
      if (!detail.isPast) {
        if (r.attendance === "attended") ops.push({ label: "تراجع عن الحضور", icon: <ArrowUUpLeft />, onSelect: () => run(() => markAttendance(r.id, "registered")) });
        else ops.push({ label: "تسجيل حضور", icon: <CheckCircle />, onSelect: () => run(() => markAttendance(r.id, "attended")) });
        if (!r.whatsappConfirmed) ops.push({ label: "تأكيد واتساب", icon: <WhatsappLogo />, onSelect: () => run(() => confirmWhatsapp(r.id)) });
      }
      if (r.certificateSerial && !r.certificateSent) ops.push({ label: "تعليم الشهادة مُرسَلة", icon: <Certificate />, onSelect: () => run(() => markCertificateSent(r.id)) });
      if (ops.length) groups.push({ header: "الإجراءات", items: ops });
      if (!detail.isPast && r.attendance === "registered" && !r.certificateSerial) {
        groups.push({ header: "منطقة الخطر", danger: true, items: [{ label: "إلغاء الحجز", icon: <Prohibit />, danger: true, onSelect: () => { setReason(""); setCancelTarget(r); } }] });
      }
    }
    return groups;
  };

  /* ── القمع + التسرّب + السعة ── */

  const reg = s.registered_count || 1;
  const pct = (v: number) => `${Math.round((v / reg) * 100)}%`;
  const funnel = [
    { label: "مسجّل", value: s.registered_count },
    { label: "مؤكّد واتساب", value: s.whatsapp_confirmed_count, note: pct(s.whatsapp_confirmed_count) },
    { label: "حاضر", value: s.attended_count, note: pct(s.attended_count) },
    { label: "أُرسلت الشهادة", value: s.certificates_sent_count, note: pct(s.certificates_sent_count) },
  ];

  const focus = (() => {
    const pendingWA = detail.reservations.filter(STAGE_TABS[0].match).length;
    const pendingCert = detail.reservations.filter(STAGE_TABS[2].match).length;
    switch (phase) {
      case "draft": return { tone: "info" as const, title: "مسودّة", text: "لم تُنشَر بعد. انشرها من قائمة الفعاليّات ليبدأ الحجز." };
      case "cancelled": return { tone: "danger" as const, title: "فعاليّة ملغاة", text: "حجوزاتها محفوظة للاطّلاع، ولا إجراءات عليها." };
      case "upcoming": return { tone: "info" as const, title: "التسجيل مفتوح", text: `${pendingWA} حجزًا بانتظار تأكيد واتساب.` };
      case "today": return { tone: "success" as const, title: "الحضور جارٍ", text: "سجّل الحاضرين الآن من تبويب «تسجيل الحضور»." };
      case "ended": return { tone: "neutral" as const, title: "انتهت الفعاليّة", text: pendingCert > 0 ? `${pendingCert} شهادة بانتظار الإرسال؛ تسجيل الحضور والإلغاء مقفلان.` : "اكتملت الشهادات؛ تسجيل الحضور والإلغاء مقفلان." };
    }
  })();

  const empty = detail.reservations.length === 0;

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf={detail.name} />
          <h1>{detail.name}</h1>
        </div>
        <div className="form-head-actions">
          <StatusBadge status={detail.status} />
          <Link href={`/dashboard/events/${detail.id}/edit`} className="abtn abtn-ghost abtn-md"><PencilSimple size={18} />تحرير</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-content-muted text-sm" style={{ marginBottom: 14 }}>
        <TypeBadge type={detail.type} />
        {detail.targetGender ? <Badge tone="info" variant="soft">{AUDIENCE_LABEL[detail.targetGender]}</Badge> : null}
        <span className="inline-flex items-center gap-2"><CalendarBlank aria-hidden />{detail.dateLabel}</span>
        {detail.timeLabel ? <span className="inline-flex items-center gap-2"><Clock aria-hidden />{detail.timeLabel}</span> : null}
        {detail.location ? (
          detail.locationUrl
            ? <a href={detail.locationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline"><MapPin aria-hidden />{detail.location}</a>
            : <span className="inline-flex items-center gap-2"><MapPin aria-hidden />{detail.location}</span>
        ) : null}
        {seats ? (
          detail.unlimited
            ? <span>التسجيل غير محدود، <b className="font-latin text-content">{seats.total_booked}</b> مسجّلًا</span>
            : detail.splitByGender
              ? <span>المقاعد: رجال <b className="font-latin text-content">{seats.male_booked}</b>/<b className="font-latin text-content">{seats.male_seats}</b>، نساء <b className="font-latin text-content">{seats.female_booked}</b>/<b className="font-latin text-content">{seats.female_seats}</b></span>
              : <span>المقاعد (مفتوح للجنسين): <b className="font-latin text-content">{seats.total_booked}</b>/<b className="font-latin text-content">{seats.total_seats}</b> محجوز</span>
        ) : null}
      </div>

      {focus ? <div style={{ marginBottom: 16 }}><Alert tone={focus.tone} title={focus.title}>{focus.text}</Alert></div> : null}

      {empty ? (
        <EmptyState variant="soft" icon={<CalendarBlank />} title="لا حجوزات بعد" description="ستظهر رحلة الحجوزات هنا فور أن يحجز أحدٌ مقعده." />
      ) : (
        <>
          <SectionCard headerVariant="chip" icon={<CheckCircle />} title="مسار التقدّم" style={{ marginBottom: 18 }}>
            <BarList items={funnel} max={reg} unit={{ one: "مشارك", two: "مشاركان", few: "مشاركون" }} />
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-content-muted" style={{ marginTop: 12 }}>
              <span>المتسرّبون:</span>
              <span>ملغى <b className="font-latin text-content">{s.cancelled_count}</b></span>
              <span>لم يحضر <b className="font-latin text-content">{s.no_show_count}</b></span>
            </div>
          </SectionCard>

          <div style={{ marginBottom: 14 }}>
            <Tabs items={tabItems} value={tab} onValueChange={(v) => changeTab(v as TabKey)} variant="pill" />
          </div>

          <Toolbar
            searchPlaceholder="ابحث بالاسم أو الجوّال أو البريد…"
            search={search}
            onSearch={setSearch}
            selectedCount={currentTab.selectable ? selected.size : 0}
            onClearSelection={() => setSelected(new Set())}
            bulkActions={
              tab === "whatsapp" ? <Button variant="primary" size="sm" loading={pending} onClick={() => runBatch(batchConfirmWhatsapp)}>تأكيد واتساب للمحدّدين</Button>
                : tab === "certificates" ? <Button variant="primary" size="sm" loading={pending} onClick={() => runBatch(batchMarkCertificatesSent)}>تعليم المحدّدين مُرسَلة</Button>
                : null
            }
          />

          <DataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            selectable={currentTab.selectable}
            selected={selected}
            onSelectedChange={setSelected}
            rowActions={tab === "all" ? allActions : undefined}
            emptyState={
              <EmptyState variant="soft" icon={<CheckCircle />} title="لا أحد في هذه المرحلة" description="لا حجوزات تطابق هذا التبويب أو بحثك." />
            }
          />
        </>
      )}

      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        busy={pending}
        title="إلغاء حجز"
        description={cancelTarget ? `إلغاء حجز «${cancelTarget.fullName ?? "مشارك"}»، سببٌ يُحفَظ في السجلّ.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="danger" size="md" loading={pending} onClick={() => { if (cancelTarget) run(() => cancelReservation(cancelTarget.id, reason)); }}>تأكيد الإلغاء</Button>
            <Button variant="ghost-danger" size="md" onClick={() => setCancelTarget(null)} disabled={pending}>تراجع</Button>
          </>
        }
      >
        <Textarea label="سبب الإلغاء" icon={<Prohibit />} innerIcon={<ChatText />} placeholder="اذكر سبب الإلغاء…" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
      </Modal>
    </>
  );
}
