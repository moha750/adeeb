import { Badge } from "@adeeb/design-system";
import { ArrowDown, ArrowUp } from "@/app/_components/glyphs";

/**
 * **شارةُ الفرق عن المدّة السابقة** — بلغة التحليلات نفسِها (`analytics/StatsView`): خضراءُ للصعود
 * وحمراءُ للهبوط، والسهمُ يقول الاتّجاه. ولا شارةَ حين لا سابقَ يُقاس عليه (صفرٌ قبلها).
 */
export function Trend({ now, before }: { now: number; before: number }) {
  if (!before) return null;
  const d = Math.round(((now - before) / before) * 100);
  const tone = d === 0 ? "neutral" : d > 0 ? "success" : "danger";
  return (
    <Badge tone={tone} size="sm" icon={d >= 0 ? <ArrowUp /> : <ArrowDown />}>
      <span className="font-latin">{Math.abs(d)}٪</span>
    </Badge>
  );
}
