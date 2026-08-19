"use client";

import Link from "next/link";
import { Segmented } from "@adeeb/design-system";

/**
 * مبدّلُ الإدارة — لمن يبلغ تعيينُه أكثرَ من إدارةٍ إداريّة (الرئيسان اليوم).
 *
 * **روابطُ لا أزرار**: الإدارةُ المعروضة حالةُ عنوانٍ لا حالةُ مكوّن — فتُشارَك بنسخ الرابط،
 * وتُحفظ في تاريخ المتصفّح، ويعود إليها زرُّ الرجوع. ولذلك لا `useState` هنا ولا موجّه.
 *
 * ومن يبلغ إدارةً واحدةً لا يرى هذا الشريط أصلًا (الصفحة لا تركّبه) — فلا اختيارَ بلا خيار.
 */
export function UnitSwitcher({
  units,
  current,
}: {
  units: readonly { id: number; name: string }[];
  current: number;
}) {
  return (
    <Segmented
      aria-label="الإدارة المعروضة"
      linkAs={Link}
      wide
      className="mb-4"
      value={String(current)}
      items={units.map((u) => ({
        value: String(u.id),
        label: u.name,
        href: `/dashboard/unit?u=${u.id}`,
      }))}
    />
  );
}
