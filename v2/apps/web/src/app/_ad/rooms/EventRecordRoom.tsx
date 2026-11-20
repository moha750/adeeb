"use client";

/**
 * **صفحةُ الفعاليّة على قالب «التذكرة المفتوحة»** (`_ad/record.tsx`، اعتمده محمد ٢٠٢٦-١١-٠٧). السلوكُ سلوكُ `events/EventDetailView.tsx`
 * حرفًا: مراحلُ الحجز الستّ بأعدادها وتبويبُ الطور الافتراضيّ، والبحثُ بالاسم والجوّال والبريد، والتحديدُ الجماعيّ في «تأكيد واتساب»
 * و«إرسال الشهادات»، وفعلُ كلّ مرحلةٍ في سطرها، وقائمةُ «الكلّ» (التواصل، والحضورُ وتراجعُه، وتأكيدُ واتساب، وتعليمُ الشهادة، وإلغاءُ
 * الحجز بسببه في نافذته)، ورسالةُ واتساب المعبّأة (`waMessage.ts`). والفرقُ في الشكل:
 * - **الرأسُ تذكرةُ الفعاليّة مفتوحة**: الشاراتُ والاسمُ والموعدُ والمكانُ والمقاعدُ والمتسرّبون، و«تحرير» و«الخريطة»، ورحلةُ الحجز أرقامًا
 *   أربعة (كانت «مسار التقدّم» شرائطَ في قسمٍ وحده).
 * - **التنبيهُ حين يكون ما يُفعل**: ما ينتظر في مرحلته وفعلُه ينقل إليها؛ وفي المنتهية المكتملة والقادمةِ المؤكَّدة لا تنبيه.
 * - **المرحلةُ الخالية تنزل إلى «المزيد»** في المبدّل: المنتهيةُ لا تفتح على ثلاثة أصفار.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Textarea, matchesSearch } from "@adeeb/design-system";
import { Armchair, CalendarBlank, Certificate, ChatText, Copy, MapPin, Phone, Ticket, UserCheck, UserCircle, UserMinus, WhatsappLogo } from "@phosphor-icons/react";
import { ArrowUUpLeft, Check, CheckCircle, PencilSimple, Prohibit } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { waHref } from "@/lib/whatsapp";
import { copyText } from "@/lib/clipboard";
import { standingName, standingOfAccountType } from "@/lib/standing";
import { arCount, AR_CERTIFICATE, type ArForms } from "@/lib/arabicCount";
import { fmtTimeRange, hour12 } from "@adeeb/core/dates";
import type { EventDetail, ReservationRow } from "@/app/dashboard/events/data";
import { AUDIENCE_LABEL, STAGE_META, STATUS_META, TYPE_META, reservationStage } from "@/app/dashboard/events/vocab";
import {
  batchConfirmWhatsapp, batchMarkCertificatesSent, cancelReservation, confirmWhatsapp, markAttendance, markCertificateSent, type EventResult,
} from "@/app/dashboard/events/actions";
import { buildWaMessage } from "@/app/dashboard/events/waMessage";
import { CollectionRoom, type Position, type TableSpec } from "../collection";
import { RecordTicket } from "../record";
import { AdActs, AdBadge, AdButton, AdNote, AdRow, type AdFigure, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { dayParts, fmtClock, fmtDayFull, fmtNum } from "../format";

type Phase = "draft" | "cancelled" | "upcoming" | "today" | "ended";
type StageKey = "whatsapp" | "attendance" | "certificates" | "completed" | "dropped" | "all";

const BOOKING: ArForms = ["حجزٌ واحد", "حجزان", "حجوزات", "حجزًا"];
const PEOPLE: ArForms = ["مشاركٌ واحد", "مشاركان", "مشاركين", "مشاركًا"];
const TONE: Record<string, AdTone> = { neutral: "neutral", info: "info", success: "ok", warning: "warn", danger: "bad" };

/** مراحلُ الحجز كما كانت تبويباتُها حرفًا — كلٌّ يطابق أهلَه في خطّ العمل، و`pick: false` ما لا فعلَ جماعيًّا فيه. */
const STAGES: (Position<ReservationRow> & { key: StageKey })[] = [
  { key: "whatsapp", label: "تأكيد واتساب", match: (r) => r.status === "confirmed" && !r.whatsappConfirmed && r.attendance === "registered", empty: "لا أحد بانتظار تأكيد واتساب." },
  { key: "attendance", label: "تسجيل الحضور", match: (r) => r.status === "confirmed" && r.attendance === "registered", empty: "لا أحد بانتظار تسجيل حضوره.", pick: false },
  { key: "certificates", label: "إرسال الشهادات", match: (r) => r.attendance === "attended" && !!r.certificateSerial && !r.certificateSent, empty: "لا شهادة بانتظار الإرسال." },
  { key: "completed", label: "مكتمل", match: (r) => r.certificateSent, empty: "لم تُرسل شهادةٌ بعد.", pick: false },
  { key: "dropped", label: "لم يحضر / ملغى", match: (r) => r.status === "cancelled" || r.attendance === "no_show", empty: "لا متسرّبين.", pick: false },
  { key: "all", label: "الكلّ", match: () => true, empty: "لا حجوزات.", pick: false },
];

const phaseOf = (d: EventDetail): Phase =>
  d.status === "cancelled" ? "cancelled" : d.status === "draft" ? "draft" : d.isPast ? "ended" : d.isToday ? "today" : "upcoming";

const clock = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return m ? `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "ص" : "م"}` : hour12(h);
};
/** سطرُ الموعد بصائغ النادي كتذكرة القائمة: «6 مايو 2026، من 10 ص إلى 11 ص» */
const whenOf = (d: EventDetail) => {
  const day = fmtDayFull(`${d.date}T12:00:00`);
  const time = fmtTimeRange(d.startTime, d.endTime) || (d.startTime ? `الساعة ${clock(d.startTime)}` : "");
  return time ? `${day}، ${time}` : day;
};
/** المقاعدُ بتفصيلها كما كانت في سطر الحقائق: بالنوع، أو مشتركةٌ للجنسين، أو بلا حدّ — وعددُها في رقم «الحجوزات» */
const seatsOf = (d: EventDetail): string | null => {
  const s = d.seats;
  if (!s) return null;
  if (d.unlimited) return `التسجيلُ بلا حدّ، ${arCount(s.total_booked, BOOKING)}`;
  if (d.splitByGender) return `رجال ${fmtNum(s.male_booked)} / ${fmtNum(s.male_seats ?? 0)}، نساء ${fmtNum(s.female_booked)} / ${fmtNum(s.female_seats ?? 0)}`;
  return `مقاعدُ مشتركةٌ للجنسين، ${fmtNum(s.total_booked)} / ${fmtNum(s.total_seats)}`;
};
/** المتسرّبون بقسمتهم (كانوا تحت «مسار التقدّم»): «لم يحضر 14 مشاركًا، وألغى مشاركان» */
const dropOf = (d: EventDetail): string | null => {
  const no = d.stats.no_show_count;
  const off = d.stats.cancelled_count;
  const parts = [no ? `لم يحضر ${arCount(no, PEOPLE)}` : "", off ? `ألغى ${arCount(off, PEOPLE)}` : ""].filter(Boolean);
  return parts.length ? parts.join("، و") : null;
};
/** وقتُ الحجز بصائغ النادي («6 مايو 2026، 5:01 ص») — كان بساعةٍ من أربعٍ وعشرين */
const reservedOf = (r: ReservationRow) => (r.reservedAtRaw ? `${fmtDayFull(r.reservedAtRaw)}، ${fmtClock(r.reservedAtRaw)}` : r.reservedAtLabel);

/**
 * **رحلةُ الحجز أرقامًا أربعة** (كانت «مسار التقدّم»: المسجّلون، ثمّ مؤكّدو واتساب، ثمّ الحاضرون، ثمّ من أُرسلت شهاداتهم): الحجوزاتُ من
 * المقاعد، والتأكيدُ والحضورُ من الحجوزات، والشهاداتُ من الحاضرين. وحيث لا تصحّ النسبةُ تقول الكلمةُ مكانَها والشريطُ فارغ —
 * «لم يبدأ» قبل يومها (والشهاداتُ قبل انتهائها)، و«أُلغيت»، و«لا حجوزات» — فتبقى الأرقامُ الأربعةُ بهيئةٍ واحدة.
 */
function figuresOf(d: EventDetail, phase: Phase): AdFigure[] {
  const s = d.stats;
  const reg = s.registered_count;
  const started = phase === "ended" || phase === "today";
  const off = phase === "cancelled" ? "أُلغيت" : undefined;
  const total = d.unlimited ? null : d.seats?.total_seats ?? d.totalSeats;
  const ahead = phase === "upcoming" || phase === "draft";
  return [
    { icon: <Ticket />, label: "الحجوزات", value: `${fmtNum(reg)} / ${total == null ? "∞" : fmtNum(total)}`, of: total ? { now: reg, max: total, full: ahead ? "مكتمل" : undefined } : undefined },
    { icon: <WhatsappLogo />, label: "أكّدوا", value: `${fmtNum(s.whatsapp_confirmed_count)} / ${fmtNum(reg)}`, of: { now: s.whatsapp_confirmed_count, max: reg, note: off ?? (reg ? undefined : "لا حجوزات") } },
    { icon: <UserCheck />, label: "الحضور", value: `${fmtNum(s.attended_count)} / ${fmtNum(reg)}`, of: { now: s.attended_count, max: reg, note: off ?? (!started ? "لم يبدأ" : reg ? undefined : "لا حجوزات") } },
    { icon: <Certificate />, label: "الشهادات", value: `${fmtNum(s.certificates_sent_count)} / ${fmtNum(s.attended_count)}`, of: { now: s.certificates_sent_count, max: s.attended_count, note: off ?? (phase !== "ended" ? "لم يبدأ" : s.attended_count ? undefined : "لا حاضرين") } },
  ];
}

export function EventRecordRoom({ detail }: { detail: EventDetail }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [batching, setBatching] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ReservationRow | null>(null);
  const [reason, setReason] = useState("");
  const phase = phaseOf(detail);
  const rs = detail.reservations;
  const countIn = (k: StageKey) => rs.filter(STAGES.find((s) => s.key === k)!.match).length;

  // التبويبُ الافتراضيّ تبويبُ عمل الطور إن كان فيه أحد، وإلّا «الكلّ» (فلا تفتح الصفحةُ على مرحلةٍ خالية) — كالصفحة القديمة
  const phaseStage: StageKey = phase === "ended" ? "certificates" : phase === "today" ? "attendance" : phase === "upcoming" ? "whatsapp" : "all";
  const defaultStage: StageKey = phaseStage !== "all" && countIn(phaseStage) > 0 ? phaseStage : "all";
  // المرحلةُ الخالية تنزل إلى «المزيد» (الافتراضيّةُ و«الكلّ» في مكانهما)
  const positions = STAGES.map((s) => ({ ...s, rare: s.key !== "all" && s.key !== defaultStage && countIn(s.key) === 0 }));

  /** فعلٌ على حجزٍ واحد: يدور زرُّه، ولا يُقبل فعلٌ ثانٍ حتى يعود (كانت الأزرارُ كلُّها تُعطَّل) */
  const run = (key: string, fn: () => Promise<EventResult>) => {
    if (pending) return;
    setBusy(key);
    start(async () => {
      const r = await fn();
      setBusy(null);
      if (r.ok) { toast.success(r.message); setCancelTarget(null); setReason(""); router.refresh(); }
      else toast.error(r.message);
    });
  };
  /** فعلٌ على المحدَّدين: يدور زرُّه حتى يعود، ونجاحُه (`true`) يُسقط التحديد — كما كانت الصفحةُ تفرغه بعد نجاحه */
  const runBatch = async (fn: (ids: string[]) => Promise<EventResult>, ids: string[]) => {
    if (batching || pending) return false;
    setBatching(true);
    const r = await fn(ids);
    setBatching(false);
    if (r.ok) { toast.success(r.message); router.refresh(); return true; }
    toast.error(r.message);
    return false;
  };
  /** حين يجري فعلٌ على حجزٍ يُمسَك الباقي (كانت الأزرارُ كلُّها تُعطَّل): يُرى موقوفًا لا يُضغط بلا أثر */
  const hold = (id: string) => pending && busy !== id;
  const copy = async (text: string, label: string) => {
    try { await copyText(text); toast.success(`نُسخ ${label}.`); } catch { toast.error("تعذّر النسخ."); }
  };
  const openWa = (r: ReservationRow) => { if (r.phone) window.open(waHref(r.phone, buildWaMessage(r, detail)), "_blank", "noopener"); };

  /* ── سطرُ المشارك: وجهُه واسمُه، ثمّ مقامُه وجوّالُه، وشارةُ مرحلته حيث تختلط المراحل، وفعلُ مرحلته ── */
  const waOp = (r: ReservationRow): AdOp[] => (r.phone ? [{ key: "wa", label: "واتساب", icon: <WhatsappLogo />, onClick: () => openWa(r) }] : []);
  const actsOf = (r: ReservationRow, pos: string) => {
    switch (pos as StageKey) {
      case "whatsapp": return <AdActs inRow primary={{ label: "تأكيد", icon: <Check />, busy: busy === r.id, disabled: hold(r.id), onClick: () => run(r.id, () => confirmWhatsapp(r.id)) }} ops={waOp(r)} />;
      case "attendance": return <AdActs inRow primary={{ label: "حاضر", icon: <UserCheck />, busy: busy === r.id, disabled: hold(r.id), onClick: () => run(r.id, () => markAttendance(r.id, "attended")) }} ops={waOp(r)} />;
      case "certificates": return <AdActs inRow primary={{ label: "أُرسلت", icon: <Certificate />, busy: busy === r.id, disabled: hold(r.id), onClick: () => run(r.id, () => markCertificateSent(r.id)) }} ops={waOp(r)} />;
      case "all": {
        // قائمةُ «الكلّ» كما كانت: التواصلُ، ثمّ الإجراءات، ثمّ منطقةُ الخطر
        const ops: AdOp[] = [];
        if (r.phone) ops.push({ key: "cp", label: "نسخ الجوّال", icon: <Copy />, onClick: () => void copy(r.phone!, "الجوّال") });
        if (r.email) ops.push({ key: "ce", label: "نسخ البريد", icon: <Copy />, onClick: () => void copy(r.email!, "البريد") });
        if (r.status === "confirmed") {
          if (!detail.isPast) {
            ops.push(r.attendance === "attended"
              ? { key: "un", label: "تراجع عن الحضور", icon: <ArrowUUpLeft />, onClick: () => run(r.id, () => markAttendance(r.id, "registered")) }
              : { key: "at", label: "تسجيل حضور", icon: <CheckCircle />, onClick: () => run(r.id, () => markAttendance(r.id, "attended")) });
            if (!r.whatsappConfirmed) ops.push({ key: "wc", label: "تأكيد واتساب", icon: <WhatsappLogo />, onClick: () => run(r.id, () => confirmWhatsapp(r.id)) });
          }
          if (r.certificateSerial && !r.certificateSent) ops.push({ key: "cs", label: "تعليم الشهادة مُرسَلة", icon: <Certificate />, onClick: () => run(r.id, () => markCertificateSent(r.id)) });
          if (!detail.isPast && r.attendance === "registered" && !r.certificateSerial) {
            ops.push({ key: "x", label: "إلغاء الحجز", icon: <Prohibit />, danger: true, onClick: () => { setReason(""); setCancelTarget(r); } });
          }
        }
        const held = ops.map((o) => ({ ...o, busy: o.key !== "cp" && o.key !== "ce" && busy === r.id, disabled: o.key !== "cp" && o.key !== "ce" && hold(r.id) }));
        if (r.phone) return <AdActs inRow primary={{ label: "واتساب", icon: <WhatsappLogo />, onClick: () => openWa(r) }} ops={held} />;
        return held.length ? <AdActs inRow primary={{ label: held[0].label, icon: held[0].icon, onClick: held[0].onClick! }} ops={held.slice(1)} /> : null;
      }
      default: return r.phone ? <AdActs inRow primary={{ label: "واتساب", icon: <WhatsappLogo />, onClick: () => openWa(r) }} ops={[]} /> : null;
    }
  };
  const badgeOf = (r: ReservationRow, pos: string) => {
    if (pos !== "all" && pos !== "dropped") return undefined;
    const m = STAGE_META[reservationStage({ status: r.status, attendance: r.attendance, whatsappConfirmed: r.whatsappConfirmed, certificateSent: r.certificateSent })];
    return <AdBadge tone={TONE[m.tone]}>{m.label}</AdBadge>;
  };
  const subOf = (r: ReservationRow): AdMeta[] => [
    { icon: <UserCircle />, text: standingName(standingOfAccountType(r.accountType), r.gender) },
    ...(r.phone ? [{ icon: <Phone />, text: r.phone, ltr: true }] : []),
  ];
  const cellsOf = (r: ReservationRow, pos: string) =>
    pos === "all" ? [{ label: "وقت الحجز", value: reservedOf(r), text: true }]
      : pos === "completed" ? [{ label: "رقم الشهادة", value: r.certificateSerial ?? "—", text: true, ltr: true }]
      : [];
  const table = (pos: string): TableSpec<ReservationRow> => ({
    head: "المشارك",
    stub: { key: "face", label: "", icon: <UserCircle /> },
    columns: pos === "all" ? [{ key: "at", label: "وقت الحجز", icon: <CalendarBlank />, text: true }]
      : pos === "completed" ? [{ key: "serial", label: "رقم الشهادة", icon: <Certificate />, text: true }]
      : [],
  });
  const row = (r: ReservationRow, pos: string) => (
    <AdRow
      key={r.id}
      face={{ name: r.fullName ?? "مشارك", gender: r.gender }}
      title={r.fullName ?? "—"}
      badge={badgeOf(r, pos)}
      sub={subOf(r)}
      cells={cellsOf(r, pos)}
      acts={actsOf(r, pos)}
    />
  );

  /* ── الرأس: تذكرةُ الفعاليّة مفتوحة ── */
  const status = STATUS_META[detail.status];
  const day = dayParts(`${detail.date}T12:00:00`);
  const seats = seatsOf(detail);
  const drop = dropOf(detail);
  const info: AdMeta[] = [
    { icon: <CalendarBlank />, text: whenOf(detail) },
    // «الخريطة» بجانب المكان لا في رأس التذكرة (محمد ٢٠٢٦-١١-٢٠، العودةُ والأساسيُّ وحدهما في الرأس)
    ...(detail.location ? [{ icon: <MapPin />, text: detail.location, act: detail.locationUrl ? { label: "الخريطة", href: detail.locationUrl, external: true } : undefined }] : []),
    ...(seats ? [{ icon: <Armchair />, text: seats }] : []),
    ...(drop ? [{ icon: <UserMinus />, text: drop, tone: "warn" as const }] : []),
  ];
  const head = (
    <RecordTicket
      title={detail.name}
      seed={detail.id}
      cover={detail.coverImageUrl}
      stub={{ big: day.day, small: day.month }}
      chips={
        <>
          <AdBadge tone={TONE[status.tone]}>{status.label}</AdBadge>
          <AdBadge>{TYPE_META[detail.type].label}</AdBadge>
          {detail.targetGender ? <AdBadge>{AUDIENCE_LABEL[detail.targetGender]}</AdBadge> : null}
        </>
      }
      acts={
        <>
          <AdButton variant="fill" size="sm" icon={<PencilSimple />} href={`/dashboard/events/${detail.id}/edit`}>تحرير</AdButton>
        </>
      }
      info={info}
      figures={figuresOf(detail, phase)}
    />
  );

  /* ── التنبيه حين يكون ما يُفعل (القالبُ المعتمد): المسودّةُ والملغاةُ دائمًا، وما ينتظر في مرحلة الطور بعدده — وهي المرحلةُ التي تفتح
     عليها الصفحة. والمنتهيةُ المكتملة والقادمةُ المؤكَّدة بلا تنبيه: الشارةُ والأرقامُ تقولانهما (كانت «اكتملت الشهادات» دائمًا) ── */
  const notice = (() => {
    const pendWa = countIn("whatsapp");
    const pendAtt = countIn("attendance");
    const pendCert = countIn("certificates");
    switch (phase) {
      case "draft": return <AdNote tone="info" label="مسودّة" title="لم تُنشَر بعد">انشرها من قائمة الفعاليّات ليبدأ الحجز.</AdNote>;
      case "cancelled": return <AdNote tone="bad" label="فعاليّةٌ ملغاة" title="حجوزاتُها محفوظةٌ للاطّلاع">ولا إجراءات عليها.</AdNote>;
      case "upcoming": return pendWa ? <AdNote tone="info" label="التسجيل مفتوح" title={`${arCount(pendWa, BOOKING)} بانتظار تأكيد واتساب`} /> : null;
      case "today": return pendAtt ? <AdNote tone="ok" label="الحضور جارٍ" title={`سجّل الحاضرين الآن: ${arCount(pendAtt, PEOPLE)} لم يُسجَّل حضورُهم بعد`} /> : null;
      case "ended": return pendCert
        ? <AdNote tone="warn" label="انتهت الفعاليّة" title={`${arCount(pendCert, AR_CERTIFICATE)} بانتظار الإرسال`}>تسجيل الحضور والإلغاء مقفلان.</AdNote>
        : null;
    }
  })();

  return (
    <>
      <CollectionRoom<ReservationRow>
        navPath="/dashboard/events"
        title={detail.name}
        head={head}
        listOnly
        pageSize={Infinity}
        noun={BOOKING}
        items={rs}
        positions={positions}
        defaultPosition={defaultStage}
        searchPlaceholder="ابحث بالاسم أو الجوّال أو البريد…"
        matchSearch={(r, q) => matchesSearch(q, r.fullName, r.phone, r.email)}
        emptyAll={{ title: "لا حجوزات بعد", desc: "ستظهر رحلةُ الحجوزات هنا فور أن يحجز أحدٌ مقعده." }}
        idOf={(r) => r.id}
        bulk={(ids, pos) =>
          pos === "whatsapp" ? [{ key: "wa", label: "تأكيد واتساب للمحدّدين", icon: <Check />, busy: batching, onClick: () => runBatch(batchConfirmWhatsapp, ids) }]
            : pos === "certificates" ? [{ key: "cs", label: "تعليم المحدّدين مُرسَلة", icon: <Certificate />, busy: batching, onClick: () => runBatch(batchMarkCertificatesSent, ids) }]
            : []
        }
        notice={notice}
        table={table}
        renderCard={row}
        renderRow={row}
      />
      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        busy={pending}
        title="إلغاء حجز"
        description={cancelTarget ? `«${cancelTarget.fullName ?? "مشارك"}»` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="danger" size="md" loading={pending} onClick={() => { if (cancelTarget) run(cancelTarget.id, () => cancelReservation(cancelTarget.id, reason)); }}>تأكيد الإلغاء</Button>
            <Button variant="ghost-danger" size="md" onClick={() => setCancelTarget(null)} disabled={pending}>تراجع</Button>
          </>
        }
      >
        <Textarea label="سبب الإلغاء" icon={<Prohibit />} innerIcon={<ChatText />} placeholder="اذكر سبب الإلغاء…" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} helper="يُحفظ في السجلّ." required />
      </Modal>
    </>
  );
}
