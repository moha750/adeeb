"use client";

/**
 * غرفةُ «حجوزاتي» على قالب «الحساب» (٢٠٢٦-١١-٠٤) — السلوكُ سلوكُ `dashboard/_portal/BookingsRoom.tsx` المعتمد حرفًا: كلُّ حجزٍ قادمٍ
 * بموعده وحضوره وفعاليّته، و«أضِفه» إلى التقويم (ملفٌّ يصنعه المتصفّح)، وإلغاؤه بنافذته وسببٍ اختياريّ (`cancel_activity_reservation`)،
 * و«سجلّك» في العمود الضيّق: آخرُ خمسٍ تنفتح بقيّتُها في مكانها، وبلا حجزٍ قادمٍ الفعاليّاتُ المفتوحة و«احجز».
 *
 * والفرقُ في الشكل: **الحجزُ تذكرة** — تذكرةُ قالب القوائم نفسُها: كعبُها يومُ الفعاليّة وشهرُه، وشارتاها نوعُها وحالُ حضورك، وسطورُها
 * الساعةُ والمكانُ وكم بقي، وفعلُها «افتح الفعاليّة» وفي «المزيد» التقويمُ والإلغاء (الإلغاءُ آخرُها بالأحمر).
 * **و«سجلّك» موضعٌ في المبدّل** (محمد ٢٠٢٦-١١-٠٤: قسمُ السطور بجانب التذاكر «ليس فيه اتّساقٌ بصريّ»): «القادمة» و«السابقة»، والحجزُ
 * السابقُ تذكرةٌ كالقادم وشارتُه نتيجتُه — فللحجز شكلٌ واحدٌ ومبدّلٌ واحد. (كان آخرُ خمسٍ في عمودٍ ضيّقٍ تنفتح بقيّتُها في مكانها.)
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal, Textarea } from "@adeeb/design-system";
import {
  CalendarBlank, CalendarCheck, CalendarPlus, CalendarX, Clock, MapPin, Ticket, WhatsappLogo,
} from "@phosphor-icons/react";
import { CaretLeft, CheckCircle, PencilSimple, Prohibit, XCircle } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { dateOnlyParts } from "@/lib/dates";
import { TYPE_META } from "@/lib/activities";
import type { MyReservation } from "@/app/me/data";
import { soonLabel } from "@/app/dashboard/_portal/time";
import { AdActs, AdBadge, AdCard, AdNote, AdSwitch, type AdMeta, type AdTone } from "../primitives";
import { AccountRoom, AdLine, AdSection } from "../account";
import { dayParts } from "../format";

const CANCEL_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت جلستك. سجّل دخولك من جديد.",
  RESERVATION_NOT_FOUND: "لم نعثر على الحجز.",
  NOT_OWNER: "هذا الحجز ليس لك.",
  REASON_REQUIRED: "سبب الإلغاء مطلوب.",
  ACTIVITY_PAST: "انتهى وقت هذه الفعاليّة، لا يُلغى حجزُها.",
};
const cancelError = (raw: string | null | undefined): string => {
  const code = Object.keys(CANCEL_ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? CANCEL_ERRORS[code] : "تعذّر إلغاء الحجز. حاول مجدّدًا.";
};


/** ملفُّ تقويمٍ يصنعه المتصفّح — لا خادمَ ولا قاعدة. وبلا ساعةٍ يصير موعدًا ليومٍ كامل. (حرفُ الغرفة القديمة) */
function addToCalendar(r: MyReservation) {
  const d = r.date.replaceAll("-", "");
  const t = (hm: string | null) => (hm ? `T${hm.replace(":", "")}00` : "");
  const when = r.startTime
    ? [`DTSTART;TZID=Asia/Riyadh:${d}${t(r.startTime)}`, `DTEND;TZID=Asia/Riyadh:${d}${t(r.endTime ?? r.startTime)}`]
    : [`DTSTART;VALUE=DATE:${d}`];
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Adeeb//Bookings//AR", "BEGIN:VEVENT",
    `UID:${r.id}@adeeb.club`, ...when, `SUMMARY:${r.name}`, ...(r.location ? [`LOCATION:${r.location}`] : []),
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${r.name}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** نتيجةُ ما مضى: حضرتَ، أو لم تحضر، أو ألغيت — شارةً بلون نتيجتها ورمزها. */
function outcome(r: MyReservation, female: boolean): { out: string; tone: AdTone; icon: React.ReactNode } {
  if (r.cancelled) return { out: female ? "ألغيتِ حجزك" : "ألغيتَ حجزك", tone: "neutral", icon: <Prohibit /> };
  if (r.attended) return { out: female ? "حضرتِها" : "حضرتَها", tone: "ok", icon: <CheckCircle /> };
  return { out: female ? "لم تحضريها" : "لم تحضرها", tone: "bad", icon: <XCircle /> };
}

export function MyBookingsRoom({ upcoming, past, open, female }: {
  upcoming: MyReservation[];
  past: MyReservation[];
  open: { id: string; title: string; when: string; seats: string }[];
  female: boolean;
}) {
  const router = useRouter();
  const [sb] = useState(() => createClient());
  const [target, setTarget] = useState<MyReservation | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pos, setPos] = useState<"upcoming" | "past">("upcoming");

  const close = () => { if (!busy) { setTarget(null); setReason(""); setErr(null); } };
  const confirm = async () => {
    if (!target) return;
    setErr(null);
    setBusy(true);
    const { error } = await sb.rpc("cancel_activity_reservation", {
      p_reservation_id: target.id,
      p_reason: reason.trim() || "إلغاء من صاحب الحجز",
    });
    setBusy(false);
    if (error) { setErr(cancelError(error.message)); return; }
    setTarget(null);
    setReason("");
    setNotice("أُلغي حجزك، وصار مقعدُك متاحًا لغيرك.");
    router.refresh();
  };

  /** الكعبُ يومُ الفعاليّة وشهرُه وسنتُه، كتذكرة الفعاليّة في غرفة الإدارة. */
  const stubOf = (r: MyReservation) => { const d = dayParts(`${r.date}T12:00:00`); return { big: d.day, small: d.month }; };
  /** الشارتان: نوعُ الفعاليّة، وحالُ حضورك — مؤكَّدٌ بلونه أو ينتظر واتساب للقادم، ونتيجتُه للسابق (حضرتَها، لم تحضرها، ألغيتَه). */
  const chips = (r: MyReservation) => {
    const o = r.upcoming && !r.cancelled ? null : outcome(r, female);
    return (
      <>
        <AdBadge>{TYPE_META[r.type]?.label ?? "فعاليّة"}</AdBadge>
        {o ? <AdBadge tone={o.tone} icon={o.icon}>{o.out}</AdBadge>
          : r.whatsappConfirmed
            ? <AdBadge tone="ok" icon={<CalendarCheck />}>حضورك مؤكَّد</AdBadge>
            : <AdBadge tone="warn" icon={<WhatsappLogo />}>نؤكّده معك بواتساب</AdBadge>}
      </>
    );
  };
  /** السطور: الساعةُ («الوقتُ يُعلَن قريبًا» قبل إعلانها)، والمكان، ثمّ يومُ الأسبوع وكم بقي — واليومُ وشهرُه في الكعب لا يتكرّران. والسابقُ بلا «كم بقي». */
  const info = (r: MyReservation): AdMeta[] => [
    // والسابقُ بلا ساعةٍ معلنة لا سطرَ له: «الوقتُ يُعلَن قريبًا» وعدٌ لما يأتي
    ...(r.timeLabel ? [{ icon: <Clock />, text: r.timeLabel }] : r.upcoming && !r.cancelled ? [{ icon: <Clock />, text: "الوقتُ يُعلَن قريبًا" }] : []),
    ...(r.location ? [{ icon: <MapPin />, text: r.location }] : []),
    ...(r.upcoming && !r.cancelled ? [{ icon: <CalendarBlank />, text: [dateOnlyParts(r.date)?.weekday, soonLabel(r.date)].filter(Boolean).join("، ") }] : []),
  ];
  /** القادمُ: الفتحُ ظاهرًا، والتقويمُ والإلغاءُ في «المزيد». والسابقُ فتحُه وحده (لا يُلغى ما مضى). */
  const acts = (r: MyReservation) => (
    <AdActs
      primary={{ label: "افتح الفعاليّة", icon: <Ticket />, href: `/activities/${r.activityId}` }}
      ops={r.upcoming && !r.cancelled ? [
        { key: "cal", label: "أضِفه إلى تقويمك", icon: <CalendarPlus />, onClick: () => addToCalendar(r) },
        { key: "cancel", label: "إلغاء الحجز", icon: <CalendarX />, danger: true, onClick: () => setTarget(r) },
      ] : []}
    />
  );
  const ticket = (r: MyReservation) => (
    <AdCard key={r.id} seed={r.activityId} stub={stubOf(r)} chips={chips(r)} title={r.name} href={`/activities/${r.activityId}`} meta={info(r)} foot={acts(r)} />
  );

  // المبدّلُ حين يكون للمرء ما مضى؛ ومن لم يحجز قطُّ ترى غرفتُه القادمَ وحده بلا مبدّل
  const head = past.length ? (
    <AdSwitch
      positions={[
        { key: "upcoming", label: "القادمة", count: upcoming.length },
        { key: "past", label: "السابقة", count: past.length },
      ]}
      position={pos}
      onPosition={(k) => setPos(k as "upcoming" | "past")}
    />
  ) : undefined;

  return (
    <AccountRoom navPath="/dashboard/bookings" title="حجوزاتي" head={head}>
      {notice ? <AdNote tone="ok" onClose={() => setNotice(null)}>{notice}</AdNote> : null}
      {pos === "past" && past.length ? (
        <div className="ad-grid">{past.map(ticket)}</div>
      ) : upcoming.length ? (
        <div className="ad-grid">{upcoming.map(ticket)}</div>
      ) : (
          <AdSection icon={<CalendarPlus />} title="لا حجزَ قادمًا لك" sub={open.length ? "وهذه فعاليّاتٌ يُحجز فيها الآن" : "نُعلن الفعاليّاتِ في الموقع وفي إشعاراتك"}>
            {open.map((o) => (
              <AdLine key={o.id} icon={<Ticket />} k={o.when} v={o.title} sub={o.seats} act={{ icon: <Ticket />, text: "احجز", label: `احجز مقعدك في ${o.title}` }} href={`/activities/${o.id}`} />
            ))}
            {open.length ? null : <AdLine icon={<Ticket />} k="الفعاليّات" v="كلُّ فعاليّات أدِيب" act={{ icon: <CaretLeft />, text: "فتح", label: "فعاليّات أدِيب" }} href="/activities" />}
          </AdSection>
      )}

      {/* الإلغاءُ لا رجعةَ فيه ويُخلي مقعدًا: نافذةُ القديمة حرفًا، والسببُ اختياريّ */}
      <Modal
        open={target !== null}
        onClose={close}
        busy={busy}
        size="sm"
        className="mdl-tone-danger"
        title="إلغاء الحجز"
        footer={
          <>
            <Button variant="danger" size="sm" loading={busy} onClick={confirm}>تأكيد الإلغاء</Button>
            <Button variant="ghost" size="sm" onClick={close} disabled={busy}>تراجع</Button>
          </>
        }
      >
        <p>سيُخلى مقعدُك في «{target?.name}» ويُتاح لغيرك. ويمكنك الحجز ثانيةً ما دام فيها متّسع.</p>
        {/* النافذةُ بتنبيهها القديم حتى نبلغ قالبَ النوافذ: تنبيهُ الهويّة ورقةٌ تُوضع على الصفحة، وفي النافذة ورقةٌ فوق ورقة (محمد ٢٠٢٦-١١-٠٥: «غريب») */}
        {err ? <Alert tone="danger">{err}</Alert> : null}
        <Textarea label="سبب الإلغاء" icon={<PencilSimple />} innerIcon={<PencilSimple />} placeholder="اختياريّ" rows={2}
          value={reason} onChange={(e) => setReason(e.target.value)} optional />
      </Modal>
    </AccountRoom>
  );
}
