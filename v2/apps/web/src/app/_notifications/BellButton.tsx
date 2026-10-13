"use client";

import { CountBadge } from "@adeeb/design-system";
import { Bell } from "@phosphor-icons/react";

/**
 * **الجرس** — زرٌّ واحدٌ يلبسه رأسُ اللوحة ورأسُ الموقع (`.ntf-bell`). والعلامةُ **عددٌ** لا نقطة
 * (قرار محمد ٢٠٢٦-١٠-١٠ من `/ui/bell`): العددُ يقول «كم ينتظرك»، والنقطةُ «ثمّة شيء» فحسب.
 * وما زاد على تسعةٍ يُقال «+9»: الرقمُ الكبيرُ لا يُقرأ في ركن الجرس، والقائمةُ تقول الباقي.
 */
export function BellButton({
  count,
  open,
  onClick,
}: {
  count: number;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="ntf-bell"
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={count ? `الإشعارات، ${count} لم تُقرأ` : "الإشعارات"}
      onClick={onClick}
    >
      <Bell aria-hidden />
      {count > 0 && <CountBadge tone="danger">{count > 9 ? "+9" : count}</CountBadge>}
    </button>
  );
}
