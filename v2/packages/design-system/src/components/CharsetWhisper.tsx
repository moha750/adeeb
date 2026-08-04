"use client";

import type { RefObject } from "react";
import { AnchoredPopover } from "./AnchoredPopover";

/** لوحة مفاتيح — بخطّ أيقونات النظام نفسه (stroke 1.7، لا تعبئة)، كعين الكشف في `Field`. */
export const KeyboardGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2.2" y="5.6" width="19.6" height="12.8" rx="2.6" />
    <path d="M6 9.2h.01M9.6 9.2h.01M13.2 9.2h.01M16.8 9.2h.01M6 12.6h.01M9.6 12.6h.01M13.2 12.6h.01M16.8 12.6h.01M8.4 15.8h7.2" />
  </svg>
);

export interface CharsetWhisperProps {
  /** نصّ الهمسة الحيّة، أو `null` فلا تُعرض. */
  text: string | null;
  /** بئر الحقل (`.fld-wrap`) — تتوسّطه الهمسة وتطفو فوقه. */
  anchorRef: RefObject<HTMLElement | null>;
  /** طَورُ الذوبان — تُصنَّف اللوحة فتنصرف كما جاءت. */
  leaving?: boolean;
  /** إسكاتٌ (نقرٌ خارجيّ · Escape). */
  onHush: () => void;
}

/**
 * همسة الطقم — جوابٌ لحظيّ لمحرفٍ رفضه الحقل، يطفو **فوق** البئر لحظتين ثمّ يذوب.
 *
 * تركب بدائيّة `AnchoredPopover` كسائر منبثقات النظام: Portal إلى body فلا يقصّها جسم نافذةٍ ولا كرت جدول،
 * وتموضعٌ مُدرِك ينقلب أسفل البئر حين يضيق ما فوقه (حقلٌ في رأس الشاشة).
 * **متوسّطةُ البئر** (`align="center"`) لا محاذيةَ حافّة: الهمسة تخصّ الحقل كلّه لا طرفًا منه.
 * `role="status"` كي يُنطَق النصّ لقارئ الشاشة — ولا يُوضع داخل `<label>` فيلتحق باسم الحقل المنطوق.
 */
export function CharsetWhisper({ text, anchorRef, leaving, onHush }: CharsetWhisperProps) {
  return (
    <AnchoredPopover
      open={!!text}
      anchorRef={anchorRef}
      onDismiss={onHush}
      side="above"
      align="center"
      className={leaving ? "fld-whisper fld-whisper-out" : "fld-whisper"}
      role="status"
    >
      <span className="fld-whisper-ic" aria-hidden="true">
        <KeyboardGlyph />
      </span>
      {text}
    </AnchoredPopover>
  );
}
