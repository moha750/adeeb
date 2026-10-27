"use client";

import { useEffect, useRef, useState } from "react";
import { CountBadge } from "@adeeb/design-system";
import { Bell } from "@phosphor-icons/react";

/**
 * **الجرس** — زرٌّ واحدٌ يلبسه رأسُ اللوحة ورأسُ الموقع (`.ntf-bell`). والعلامةُ **عددٌ** لا نقطة
 * (قرار محمد ٢٠٢٦-١٠-١٠ من `/ui/bell`): العددُ يقول «كم ينتظرك»، والنقطةُ «ثمّة شيء» فحسب.
 * وما زاد على تسعةٍ يُقال «+9»: الرقمُ الكبيرُ لا يُقرأ في ركن الجرس، والقائمةُ تقول الباقي.
 *
 * **ويرنّ** (٢٠٢٦-١٠-٢٧، يُعرض الوجهان في `/ui/bell`): يهتزّ اهتزازةَ جرسٍ حين تُفتح الصفحةُ وفيه
 * ما لم يُقرأ، وحين يزيد العددُ وأنت فيها، **ثمّ يعيدها كلَّ ثلاث ثوانٍ** ما دام فيه ما لم يُقرأ —
 * اختيارُ محمد من وجهين عُرضا هناك (رنّةٌ واحدة، أو تكرارٌ)، وحدّد المدّةَ بنفسه (خمسًا ثمّ ثلاثًا). ولا يرنّ وصندوقُه
 * مفتوح، ولا في تبويبٍ غائب، ولا لمن فضّل تقليلَ الحركة (في `components.css`).
 */
export function BellButton({
  count,
  open,
  onClick,
  ringEvery = 3_000,
}: {
  count: number;
  open: boolean;
  onClick: () => void;
  /** إعادةُ الرنّة كلَّ هذه المدّة (ملّي ثانية) ما دام فيه ما لم يُقرأ. `0`: لا تكرار. */
  ringEvery?: number;
}) {
  const [ring, setRing] = useState(0);
  const prev = useRef<number | null>(null);

  // أوّلُ ظهورٍ وفيه ما لم يُقرأ، أو زيادةُ العدد بعده ⇒ رنّة
  useEffect(() => {
    const was = prev.current;
    prev.current = count;
    if (open || count <= 0) return;
    if (was === null) {
      const t = window.setTimeout(() => setRing((r) => r + 1), 700); // بعد أن تستقرّ الصفحةُ لا معها
      return () => window.clearTimeout(t);
    }
    if (count > was) setRing((r) => r + 1);
  }, [count, open]);

  // التكرار — يتوقّف في التبويب الغائب وما دام الصندوقُ مفتوحًا
  useEffect(() => {
    if (!ringEvery || open || count <= 0) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setRing((r) => r + 1);
    }, ringEvery);
    return () => window.clearInterval(id);
  }, [ringEvery, open, count]);

  return (
    <button
      type="button"
      className="ntf-bell"
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={count ? `الإشعارات، ${count} لم تُقرأ` : "الإشعارات"}
      onClick={onClick}
    >
      {/* المفتاحُ يتغيّر مع كلّ رنّة فتُرسم الأيقونةُ من جديد وتبدأ حركتُها من أوّلها */}
      <Bell key={ring} aria-hidden data-ring={ring > 0 ? "" : undefined} />
      {count > 0 && <CountBadge tone="danger">{count > 9 ? "+9" : count}</CountBadge>}
    </button>
  );
}
