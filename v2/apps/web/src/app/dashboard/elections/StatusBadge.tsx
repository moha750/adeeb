import { Badge } from "@adeeb/design-system";
import { STATUS_META, type ElectionStatus } from "./vocab";

/**
 * شارة حالة الانتخاب — مصدر واحد للجدول والكرت وصفحة التفاصيل (كانت مكرّرةً حرفيًّا في موضعين).
 * النغمة والتسمية من `STATUS_META`، والطورا المفتوحان (ترشّح/تصويت) ينبضان `live`.
 *
 * والمتعثّر (`stalled`) يعلو الحالةَ نفسَها: بابُه مفتوحٌ شكلًا لكنّ مهلته انقضت بلا مرشّح،
 * فالخبرُ الذي يعني المشرف هو أنّه **ينتظر قراره** لا أنّ الترشّح مفتوح.
 */
export function StatusBadge({ status, stalled = false, short = false }: { status: ElectionStatus; stalled?: boolean; short?: boolean }) {
  if (stalled) return <Badge tone="warning" variant="soft" dot>{short ? "بانتظارك" : "بانتظار قرار"}</Badge>;
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} variant="soft" dot live={meta.live}>
      {short ? meta.short : meta.label}
    </Badge>
  );
}
