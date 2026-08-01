"use client";

import { Card, CardBody, CardFooter, CardHeader, CardMedia } from "@adeeb/design-system";
import { CalendarBlank, MapPin, UsersThree } from "@phosphor-icons/react";
import { DropdownMenu, type MenuGroup } from "../_components/DropdownMenu";
import { StatusBadge } from "./StatusBadge";
import { TypeBadge } from "./TypeBadge";
import type { EventRow } from "./data";

type Props = {
  event: EventRow;
  actions: MenuGroup[];
  /** نغمة الكرت — يشتقّها الأب من مصدر النغمة نفسه (cardTone) فتُطابق نغمةَ صفّ الجدول:
      المنشورة خضراء (حيّة/قادمة)، المنتهية رماديّة، الملغاة حمراء، والمسودّة بلا نغمة. */
  tone?: "neutral" | "success" | "warning" | "danger";
  /** فتح التفاصيل عند النقر على الكرت (كنقر صفّ الجدول)؛ ونقرُ النقاط لا يعنيه (stopPropagation). */
  onOpen?: () => void;
};

/** كرت فعاليّة — يُركَّب من بطاقة الهوية (Card) وأغلافها، لا CSS خاصّ. */
export function EventCard({ event, actions, tone, onOpen }: Props) {
  return (
    <Card tone={tone} interactive={!!onOpen} onClick={onOpen}>
      {event.coverImageUrl ? <CardMedia image={event.coverImageUrl} alt={event.name} /> : null}
      <CardHeader
        className="acard-header-clip"
        icon={<CalendarBlank weight="duotone" aria-hidden />}
        title={event.name}
        subtitle={event.timeLabel ? `${event.dateLabel} · ${event.timeLabel}` : event.dateLabel}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={event.status} />
            {actions.length > 0 ? (
              <span onClick={(e) => e.stopPropagation()}>
                <DropdownMenu groups={actions} tone={tone} />
              </span>
            ) : null}
          </div>
        }
      />
      <CardBody className="pt-3">
        <div className="flex flex-col gap-2">
          <TypeBadge type={event.type} />
          {event.location ? (
            <span className="inline-flex items-center gap-2 text-content-muted text-sm">
              <MapPin weight="duotone" aria-hidden />
              <span>{event.location}</span>
            </span>
          ) : null}
          {event.organizerName ? (
            <span className="inline-flex items-center gap-2 text-content-muted text-sm">
              <UsersThree weight="duotone" aria-hidden />
              <span>{event.organizerName}</span>
            </span>
          ) : null}
        </div>
      </CardBody>
      <CardFooter>
        <span className="text-sm text-content-muted">
          الحجوزات <b className="font-latin text-content">{event.reserved}</b>
          <span className="text-content-muted"> / </span>
          <b className="font-latin text-content">{event.totalSeats ?? "∞"}</b>
        </span>
        {event.attended > 0 ? (
          <span className="text-sm text-content-muted">
            حضر <b className="font-latin text-content">{event.attended}</b>
          </span>
        ) : (
          <span className="text-sm text-content-muted">أُضيفت {event.created}</span>
        )}
      </CardFooter>
    </Card>
  );
}
