"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardHeader, Modal, Textarea } from "@adeeb/design-system";
import {
  CalendarCheck, CalendarPlus, CalendarX, Clock, ClockCounterClockwise, ListBullets, Ticket, WhatsappLogo,
} from "@phosphor-icons/react";
import { CaretDown, CaretUp, CheckCircle, PencilSimple, Prohibit, X, XCircle } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { TYPE_META } from "@/lib/activities";
import type { MyReservation } from "@/app/me/data";
import { CaretAct, Row, type Ico } from "./Row";
import { dayLabel, dayNumber, soonLabel } from "./time";

/**
 * **غرفةُ «حجوزاتي»** — المعتمَدةُ في المختبر («جدًّا راضٍ ومعجب»، المالك ٢٠٢٦-١٠-١٣).
 * العريضُ لما ينتظرك: كلُّ حجزٍ كرتٌ معنونٌ رأسُه يومُه، وسطوره الموعدُ وحضورُك والفعاليّةُ وإلغاؤه
 * (سطرَ خطرٍ بهيبة). والضيّقُ «سجلّك»: آخرُ خمسٍ تنفتح بقيّتُها في مكانها.
 *
 * والإلغاءُ من المتصفّح بـ`cancel_activity_reservation` (دالّةٌ مفوَّضة تتحقّق من الملكيّة ومن مضيّ
 * الفعاليّة) — الطريقُ نفسُه الذي تسلكه ودجةُ الحجز، فلا يفترق الإلغاءُ من موضعين.
 */

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

const PAST_SHOWN = 5;
const Down = CaretDown as unknown as Ico;
const Up = CaretUp as unknown as Ico;

/** ملفُّ تقويمٍ يصنعه المتصفّح — لا خادمَ ولا قاعدة. وبلا ساعةٍ يصير موعدًا ليومٍ كامل. */
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

function Booking({ r, onCancel }: { r: MyReservation; onCancel: (r: MyReservation) => void }) {
  return (
    <Card className="abk-card">
      <CardHeader variant="soft" icon={<b className="abk-day">{dayNumber(r.date)}</b>} title={r.name} subtitle={`${dayLabel(r.date)}، ${soonLabel(r.date)}`} />
      <Row Icon={Clock} k={TYPE_META[r.type]?.label ?? "فعاليّة"} v={r.timeLabel || "الوقتُ يُعلَن قريبًا"} sub={r.location ?? undefined}
        act={{ Icon: CalendarPlus, label: "أضف الموعد إلى تقويمك", text: "أضِفه" }} onClick={() => addToCalendar(r)} />
      {r.whatsappConfirmed
        ? <Row Icon={CalendarCheck} k="حضورك" v="مؤكَّد، ومقعدُك محفوظ" tone="ok" />
        : <Row Icon={WhatsappLogo} k="حضورك" v="سنتواصل معك عبر واتساب لتأكيده" tone="wait" />}
      <Row Icon={Ticket} k="الفعاليّة" v="وصفُها ومكانُها" act={CaretAct(`تفاصيل ${r.name}`)} href={`/activities/${r.activityId}`} />
      <Row Icon={CalendarX} v="إلغاء الحجز" sub="يُخلى مقعدُك ويُتاح لغيرك"
        act={{ Icon: X, label: "إلغاء الحجز", danger: true, text: "إلغاء" }} danger onClick={() => onCancel(r)} />
    </Card>
  );
}

/** نتيجةُ ما مضى: حضرتَ، أو لم تحضر، أو ألغيت. */
function outcome(r: MyReservation, female: boolean): { out: string; tone: "ok" | "bad" | "muted"; Icon: Ico } {
  if (r.cancelled) return { out: female ? "ألغيتِ حجزك" : "ألغيتَ حجزك", tone: "muted", Icon: Prohibit };
  if (r.attended) return { out: female ? "حضرتِها" : "حضرتَها", tone: "ok", Icon: CheckCircle };
  return { out: female ? "لم تحضريها" : "لم تحضرها", tone: "bad", Icon: XCircle };
}

export function BookingsRoom({ upcoming, past, open, female }: {
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
  const [allPast, setAllPast] = useState(false);

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

  const shown = allPast ? past : past.slice(0, PAST_SHOWN);

  return (
    // بلا سجلٍّ لا عمودَ ثانٍ: الكرتُ يأخذ العرضَ كلَّه ولا يُترك نصفُ الصفحة فارغًا
    <div className={past.length ? "acc-cols is-wide-aside" : "acc-main"}>
      <div className="acc-main">
        {notice ? <Alert tone="success" onClose={() => setNotice(null)}>{notice}</Alert> : null}
        {upcoming.length ? (
          upcoming.map((r) => <Booking key={r.id} r={r} onCancel={setTarget} />)
        ) : (
          <Card>
            <CardHeader variant="soft" icon={<CalendarPlus aria-hidden />} title="لا حجزَ قادمًا لك" subtitle={open.length ? "وهذه فعاليّاتٌ يُحجز فيها الآن" : "نُعلن الفعاليّاتِ في الموقع وفي إشعاراتك"} />
            {open.map((o) => (
              <Row key={o.id} Icon={Ticket} k={o.when} v={o.title} sub={o.seats}
                act={{ Icon: Ticket, label: `احجز مقعدك في ${o.title}`, text: "احجز" }} href={`/activities/${o.id}`} />
            ))}
            {open.length ? null : <Row Icon={Ticket} k="الفعاليّات" v="كلُّ فعاليّات أدِيب" act={CaretAct("فعاليّات أدِيب")} href="/activities" />}
          </Card>
        )}
      </div>

      {past.length ? (
        <aside className="acc-aside">
          <Card>
            <CardHeader variant="soft" icon={<ClockCounterClockwise aria-hidden />} title="سجلّك" />
            {shown.map((r) => {
              const o = outcome(r, female);
              return <Row key={r.id} Icon={o.Icon} k={dayLabel(r.date)} v={r.name} sub={o.out} tone={o.tone} toneAt="sub" />;
            })}
            {past.length > PAST_SHOWN ? (
              allPast
                ? <Row Icon={ListBullets} v="اطوِ القائمة" sub={`ويبقى آخرُ ${PAST_SHOWN} حجوزات`}
                    act={{ Icon: Up, label: "طيّ الحجوزات السابقة", text: "أقلّ" }} onClick={() => setAllPast(false)} />
                : <Row Icon={ListBullets} v="كلُّ حجوزاتك السابقة" sub={`${past.length} حجزًا`}
                    act={{ Icon: Down, label: "عرض كلّ الحجوزات السابقة", text: "عرض" }} onClick={() => setAllPast(true)} />
            ) : null}
          </Card>
        </aside>
      ) : null}

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
        <p className="text-content-muted">سيُخلى مقعدُك في «{target?.name}» ويُتاح لغيرك. ويمكنك الحجز ثانيةً ما دام فيها متّسع.</p>
        {err ? <Alert tone="danger">{err}</Alert> : null}
        <Textarea label="سبب الإلغاء" icon={<PencilSimple />} innerIcon={<PencilSimple />} placeholder="اختياريّ" rows={2}
          value={reason} onChange={(e) => setReason(e.target.value)} optional />
      </Modal>
    </div>
  );
}
