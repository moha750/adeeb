"use client";

import { Badge, Card, CardBody } from "@adeeb/design-system";
import { CalendarBlank, Clock, MapPin } from "@phosphor-icons/react";
import { AUDIENCE_LABEL, TYPE_META } from "@/lib/activities";
import type { PublicActivity } from "../data";
import { BookingWidget } from "./BookingWidget";

/** عرض تفاصيل فعاليّة عامّة + نافذة الحجز. */
export function ActivityDetailView({ a }: { a: PublicActivity }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {a.cover ? <img src={a.cover} alt={a.name} className="w-full max-h-80 object-cover rounded" /> : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 text-content-muted text-sm">
          <Badge tone="neutral" variant="soft">{TYPE_META[a.type].label}</Badge>
          {a.targetGender ? <Badge tone="info" variant="soft">{AUDIENCE_LABEL[a.targetGender]}</Badge> : null}
          <span className="inline-flex items-center gap-2"><CalendarBlank aria-hidden />{a.dateLabel}</span>
          {a.timeLabel ? <span className="inline-flex items-center gap-2"><Clock aria-hidden />{a.timeLabel}</span> : null}
          {a.location ? (
            a.locationUrl
              ? <a href={a.locationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline"><MapPin aria-hidden />{a.location}</a>
              : <span className="inline-flex items-center gap-2"><MapPin aria-hidden />{a.location}</span>
          ) : null}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-content">{a.name}</h1>
      </div>

      {a.description ? <p className="text-content-muted leading-relaxed">{a.description}</p> : null}

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-content-muted">
        {a.unlimited ? (
          <span>التسجيل متاح للجميع — بلا عدد محدّد</span>
        ) : a.splitByGender ? (
          <>
            <span>مقاعد الرجال المتبقّية <b className="font-latin text-content">{a.maleRemaining}</b> / <b className="font-latin text-content">{a.maleSeats}</b></span>
            <span>مقاعد النساء المتبقّية <b className="font-latin text-content">{a.femaleRemaining}</b> / <b className="font-latin text-content">{a.femaleSeats}</b></span>
          </>
        ) : (
          <span>المقاعد المتبقّية <b className="font-latin text-content">{a.totalRemaining}</b> / <b className="font-latin text-content">{a.totalSeats}</b> — مفتوح للجنسين</span>
        )}
      </div>

      <Card>
        <CardBody>
          <BookingWidget activityId={a.id} unlimited={a.unlimited} splitByGender={a.splitByGender} targetGender={a.targetGender} totalRemaining={a.totalRemaining ?? 0} maleRemaining={a.maleRemaining} femaleRemaining={a.femaleRemaining} />
        </CardBody>
      </Card>
    </div>
  );
}
