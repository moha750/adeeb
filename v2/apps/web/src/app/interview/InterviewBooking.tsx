"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Alert, Badge } from "@adeeb/design-system";
import { CalendarBlank, Clock, VideoCamera, MapPin, LinkSimple, CheckCircle } from "@phosphor-icons/react";
import { bookSlot, cancelBooking } from "./actions";

export type SlotView = { id: string; timeLabel: string; sort: string };
export type SessionGroup = { id: string; name: string; type: string | null; location: string | null; meetingLink: string | null; dateLabel: string; slots: SlotView[] };
export type ExistingBooking = {
  slotId: string;
  dateLabel: string;
  timeLabel: string;
  sessionName: string | null;
  type: string | null;
  location: string | null;
  meetingLink: string | null;
  allowCancellation: boolean;
};

const typeLabel = (t: string | null): string => (t === "in_person" ? "حضوريّة" : "عن بُعد");

/** تفاصيل مكان المقابلة — رابط اللقاء عن بُعد أو الموقع حضوريًّا. */
function Venue({ type, location, meetingLink }: { type: string | null; location: string | null; meetingLink: string | null }) {
  if (type === "in_person") {
    return location ? (
      <p className="flex items-center gap-2 text-content-muted"><MapPin aria-hidden /> {location}</p>
    ) : null;
  }
  return meetingLink ? (
    <p className="flex items-center gap-2 text-content-muted">
      <LinkSimple aria-hidden />
      <a href={meetingLink} target="_blank" rel="noopener noreferrer" className="font-bold text-secondary underline" dir="ltr">
        رابط اللقاء
      </a>
    </p>
  ) : (
    <p className="text-content-muted">سيصلك رابط اللقاء قبل الموعد.</p>
  );
}

export function InterviewBooking({
  applicationId,
  fullName,
  existing,
  sessions,
}: {
  applicationId: string;
  fullName: string;
  existing: ExistingBooking | null;
  sessions: SessionGroup[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBook = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await bookSlot(selected.id, applicationId);
      if (res.ok) router.refresh();
      else setError(res.message);
    });
  };

  const runCancel = () => {
    if (!existing) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelBooking(existing.slotId, applicationId);
      if (res.ok) router.refresh();
      else {
        setError(res.message);
        setConfirmingCancel(false);
      }
    });
  };

  // ── حالة الحجز القائم ──────────────────────────────────────────
  if (existing) {
    return (
      <div className="space-y-6">
        <div>
          <p className="font-body text-sm font-bold text-secondary">مرحبًا {fullName}</p>
          <h1 className="font-display text-2xl font-black text-content md:text-3xl">موعد مقابلتك محجوز</h1>
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Card tone="success">
          <CardBody className="space-y-3 p-6">
            <div className="flex items-center gap-2 text-lg font-bold text-content">
              <CheckCircle aria-hidden /> تأكيد الحجز
            </div>
            <p className="flex items-center gap-2 text-content"><CalendarBlank aria-hidden /> {existing.dateLabel}</p>
            <p className="flex items-center gap-2 text-content"><Clock aria-hidden /> {existing.timeLabel}</p>
            <p className="flex items-center gap-2 text-content"><VideoCamera aria-hidden /> مقابلة {typeLabel(existing.type)}</p>
            <Venue type={existing.type} location={existing.location} meetingLink={existing.meetingLink} />
          </CardBody>
        </Card>
        {existing.allowCancellation ? (
          confirmingCancel ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-content-muted">هل تريد إلغاء موعدك؟</span>
              <Button variant="ghost-danger" size="sm" loading={pending} onClick={runCancel}>تأكيد الإلغاء</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingCancel(false)}>تراجع</Button>
            </div>
          ) : (
            <Button variant="ghost-danger" size="sm" onClick={() => setConfirmingCancel(true)}>إلغاء الموعد وإعادة الحجز</Button>
          )
        ) : null}
      </div>
    );
  }

  // ── لا مواعيد متاحة ────────────────────────────────────────────
  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="font-body text-sm font-bold text-secondary">مرحبًا {fullName}</p>
          <h1 className="font-display text-2xl font-black text-content md:text-3xl">حجز موعد المقابلة</h1>
        </div>
        <Card>
          <CardBody className="p-6">
            <Alert tone="info" title="لا مواعيد متاحة حاليًّا">
              لم تُفتح مواعيد مقابلاتٍ بعد، أو اكتملت المتاحة. سنتواصل معك فور توفّر مواعيد جديدة.
            </Alert>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ── اختيار فترة وحجزها ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <p className="font-body text-sm font-bold text-secondary">مرحبًا {fullName}</p>
        <h1 className="font-display text-2xl font-black text-content md:text-3xl">اختر موعد مقابلتك</h1>
        <p className="mt-2 text-content-muted">اختر الوقت المناسب لك من المواعيد المتاحة، ثمّ أكّد الحجز.</p>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="space-y-4">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardBody className="p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2 font-bold text-content"><CalendarBlank aria-hidden /> {session.dateLabel}</span>
                <Badge tone="neutral">{typeLabel(session.type)}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.slots.map((slot) => (
                  <Button
                    key={slot.id}
                    type="button"
                    size="sm"
                    variant={selected?.id === slot.id ? "primary" : "ghost"}
                    onClick={() => setSelected({ id: slot.id, label: `${session.dateLabel} · ${slot.timeLabel}` })}
                  >
                    {slot.timeLabel}
                  </Button>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {selected ? (
        <Card tone="brand">
          <CardBody className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 font-bold text-content"><Clock aria-hidden /> {selected.label}</span>
            <Button size="lg" loading={pending} onClick={runBook}>تأكيد الحجز</Button>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
