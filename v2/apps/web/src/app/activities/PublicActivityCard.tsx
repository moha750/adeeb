"use client";

import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, CardMedia } from "@adeeb/design-system";
import { CalendarBlank, MapPin } from "@phosphor-icons/react";
import { AUDIENCE_LABEL, TYPE_META } from "@/lib/activities";
import type { PublicActivity } from "./data";

/** كرت فعاليّة عامّ — بطاقة الهوية ملفوفةً برابطٍ إلى تفاصيلها (البطاقة تبقى div، تُلَفّ عند الحاجة). */
export function PublicActivityCard({ a }: { a: PublicActivity }) {
  return (
    <Link href={`/activities/${a.id}`} className="block">
      <Card interactive>
        {a.cover ? <CardMedia image={a.cover} alt={a.name} /> : null}
        <CardHeader
          className="acard-header-clip"
          icon={<CalendarBlank weight="duotone" aria-hidden />}
          title={a.name}
          subtitle={a.timeLabel ? `${a.dateLabel} · ${a.timeLabel}` : a.dateLabel}
        />
        <CardBody className="pt-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge tone="neutral" variant="soft">{TYPE_META[a.type].label}</Badge>
              {a.targetGender ? <Badge tone="info" variant="soft">{AUDIENCE_LABEL[a.targetGender]}</Badge> : null}
              {a.full ? <Badge tone="warning" variant="soft" dot>مكتمل</Badge> : null}
            </div>
            {a.location ? (
              <span className="inline-flex items-center gap-2 text-content-muted text-sm">
                <MapPin weight="duotone" aria-hidden />
                <span>{a.location}</span>
              </span>
            ) : null}
            {a.unlimited ? (
              <span className="text-sm text-content-muted">التسجيل متاح للجميع</span>
            ) : !a.full ? (
              a.splitByGender
                ? <span className="text-sm text-content-muted">متبقٍّ — رجال <b className="font-latin text-content">{a.maleRemaining}</b> · نساء <b className="font-latin text-content">{a.femaleRemaining}</b></span>
                : <span className="text-sm text-content-muted">متبقٍّ <b className="font-latin text-content">{a.totalRemaining}</b> مقعدًا (مفتوح للجنسين)</span>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
