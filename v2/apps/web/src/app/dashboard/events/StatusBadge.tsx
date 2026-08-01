import { Badge } from "@adeeb/design-system";
import { STATUS_META, type EventStatus } from "./vocab";

/**
 * شارة حالة الفعاليّة — مصدر واحد للجدول والكرت. الحالة مشتقّة (deriveStatus في data.ts)،
 * وهنا عرضها فقط: المنشورة «حيّة» فتنبض، والباقي نقطة ساكنة بنغمته.
 */
export function StatusBadge({ status }: { status: EventStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} variant="soft" dot live={status === "published"}>
      {meta.label}
    </Badge>
  );
}
