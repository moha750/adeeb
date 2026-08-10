"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader, Modal, Textarea } from "@adeeb/design-system";
import { CalendarBlank, MapPin } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { TYPE_META } from "@/lib/activities";
import type { MyReservation } from "./data";

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

/** كرتُ حجزٍ واحد — عنوانُ الفعاليّة ووقتُها، وحالُ الحجز شاراتٍ، والإلغاءُ في تذييله. */
function BookingCard({ r, onCancel }: { r: MyReservation; onCancel?: (r: MyReservation) => void }) {
  return (
    <Card>
      <CardHeader
        className="acard-header-clip"
        icon={<CalendarBlank aria-hidden />}
        title={r.name}
        subtitle={r.timeLabel ? `${r.dateLabel}، ${r.timeLabel}` : r.dateLabel}
      />
      <CardBody className="pt-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral" variant="soft">{TYPE_META[r.type].label}</Badge>
            {r.cancelled ? <Badge tone="danger" variant="soft" dot>ملغيّ</Badge> : null}
            {r.attended ? <Badge tone="success" variant="soft" dot>حضرتَها</Badge> : null}
            {!r.cancelled && r.upcoming && r.whatsappConfirmed ? (
              <Badge tone="success" variant="soft">أُكّد حضورك</Badge>
            ) : null}
          </div>
          {r.location ? (
            <span className="inline-flex items-center gap-2 text-content-muted text-sm">
              <MapPin aria-hidden />
              <span>{r.location}</span>
            </span>
          ) : null}
          <Link href={`/activities/${r.activityId}`} className="text-sm font-bold underline">
            تفاصيل الفعاليّة
          </Link>
        </div>
      </CardBody>
      {onCancel ? (
        <CardFooter>
          <Button variant="ghost-danger" size="sm" onClick={() => onCancel(r)}>إلغاء الحجز</Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

/**
 * حجوزاتُ صاحب الحساب — القادمةُ تُلغى والسابقةُ تُقرأ.
 *
 * والإلغاءُ يجري من المتصفّح بـ`cancel_activity_reservation` (دالّةٌ مفوَّضة تتحقّق من الملكيّة
 * ومن مضيّ الفعاليّة) — لا فعلَ خادميًّا يكرّر حراستها. وهو الطريقُ نفسُه الذي تسلكه ودجة الحجز،
 * فلا يفترق الإلغاءُ من موضعين.
 */
export function MyBookings({ upcoming, past }: { upcoming: MyReservation[]; past: MyReservation[] }) {
  const router = useRouter();
  const [sb] = useState(() => createClient());
  const [target, setTarget] = useState<MyReservation | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice("أُلغي حجزك.");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {notice ? <Alert tone="success" onClose={() => setNotice(null)}>{notice}</Alert> : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">حجوزاتك القادمة</h2>
        {upcoming.length === 0 ? (
          <p className="text-content-muted text-sm">
            لا حجزَ قادمًا لك. <Link href="/activities" className="font-bold underline">تصفّح البرامج</Link>
          </p>
        ) : (
          <div className="card-grid">
            {upcoming.map((r) => <BookingCard key={r.id} r={r} onCancel={setTarget} />)}
          </div>
        )}
      </div>

      {past.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">ما مضى</h2>
          <div className="card-grid">
            {past.map((r) => <BookingCard key={r.id} r={r} />)}
          </div>
        </div>
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
        <p className="text-content-muted">
          سيُخلى مقعدُك في «{target?.name}» ويُتاح لغيرك. ويمكنك الحجز ثانيةً ما دام فيها متّسع.
        </p>
        {err ? <Alert tone="danger">{err}</Alert> : null}
        <Textarea
          label="سبب الإلغاء"
          icon={<PencilSimple />}
          innerIcon={<PencilSimple />}
          placeholder="اختياريّ"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          optional
        />
      </Modal>
    </div>
  );
}
