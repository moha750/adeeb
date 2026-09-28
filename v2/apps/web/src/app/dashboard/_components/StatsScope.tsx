"use client";

import { Badge, Button } from "@adeeb/design-system";
import { FunnelSimple } from "@/app/_components/glyphs";
import type { FilterDef } from "./Toolbar";

/**
 * تسمياتُ المرشِّحات القائمة من تعريفاتها نفسِها — فلا تكتب الشاشةُ الاسمَ مرّتين
 * (مرّةً في المرشِّح ومرّةً في سطر النطاق)، ولا يفترقان يومًا.
 */
export function scopeLabels(defs: FilterDef[], values: Record<string, string>): string[] {
  return defs
    .map((d) => defs.length && values[d.key]
      ? (d.options.find((o) => o.value === values[d.key])?.label ?? null)
      : null)
    .filter((l): l is string => Boolean(l));
}

/**
 * **سطرُ نطاق الإحصاء (ق١٧)** — مصدرٌ واحدٌ لكلّ شاشةٍ فيها أرقامٌ فوق كشف.
 *
 * الأرقامُ تتبع التبويبَ والمرشِّحات ولا تسمع البحث، **ومتى قام مرشِّحٌ قالت الشاشةُ نطاقَها**:
 * «إحصاءُ: لجنة التصوير» وبجانبه بابُ رفعه. وبلا مرشِّحٍ لا يُرسَم شيء — فلا سطرَ فارغٌ
 * يزاحم الأرقام، ولا يُعاد ذكرُ التبويب (معلَنٌ بنفسه في شريطه فوقه).
 *
 * و`labels` جملةُ ما قام من مرشِّحات: واحدٌ يُقال وحدَه، وأكثرُ يُجمَع بفاصلةٍ عربيّة.
 */
export function StatsScope({ labels, onClear, clearLabel = "كلُّ الكشف" }: {
  /** تسمياتُ المرشِّحات القائمة (الفارغةُ تُنخَل قبل التمرير أو هنا). */
  labels: (string | null | undefined)[];
  onClear: () => void;
  clearLabel?: string;
}) {
  const live = labels.filter((l): l is string => Boolean(l && l.trim()));
  if (live.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 14 }}>
      <Badge tone="info" variant="soft" icon={<FunnelSimple />}>{`إحصاءُ: ${live.join("، ")}`}</Badge>
      <Button variant="ghost" size="sm" onClick={onClear}>{clearLabel}</Button>
    </div>
  );
}
