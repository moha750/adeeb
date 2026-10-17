import { positionLine, rankFor } from "@/lib/positionLabel";

/**
 * **مقعدُ المستلم كما يُكتب على البطاقة** — رتبتُه بجنسه ثمّ وحدتُه: «قائدة لجنة التصوير»،
 * «الرئيسة التنفيذية». من المصدر الواحد (`positionLine` و`rankFor`) لا خياطةً باليد.
 */
export function irfanSeat(roleAr: string | null | undefined, unit: string | null | undefined, gender: string | null | undefined): string {
  const line = positionLine(roleAr ?? "", unit) ?? "";
  return line ? rankFor(line, gender) : "";
}
