"use client";

import { useCallback, useRef } from "react";
import { cn } from "../lib/cn";

export interface AngleDialProps {
  /** الزاوية بالدرجات: صفرٌ يمينًا، وتدور مع عقارب الساعة (اصطلاحُ `qr.ts`). */
  value: number;
  onValueChange: (deg: number) => void;
  /** لقطةُ الدوران بالدرجات. الافتراضُ ١٥، ومع `Shift` تسقط إلى درجةٍ واحدة. */
  step?: number;
  "aria-label"?: string;
  className?: string;
}

const norm = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * **قرصُ الاتّجاه** — دائرةٌ تُدار بالإصبع فتعطي أيَّ زاويةٍ من ٠ إلى ٣٥٩.
 *
 * وعلّةُ وجوده أنّ الاتّجاه **شكلٌ لا رقم**: قائمةٌ مكتوبة («مائل معكوس») تُقرأ ثمّ تُترجَم
 * في الذهن إلى صورة، والقرصُ يُري الاتّجاهَ نفسَه فيُحكَم عليه بالنظر. والزاويةُ حرّةٌ لا
 * أربعُ خانات، والراسمُ يقبلها كلَّها أصلًا (يحسبها بالجيب لا من قائمة).
 *
 * **واللقطةُ خمسَ عشرةَ درجة** ما لم يُضغط `Shift`: اليدُ لا تصيب درجةً بعينها على قرصٍ
 * قطرُه ١٢٠ بكسلًا، واللقطةُ تجعل «الأفقيّ» و«الرأسيّ» و«المائل» تقع بلا مطاردة.
 * ولوحةُ المفاتيح تقودُه بالأسهم: قانونُ الوصول لا يُشترى بمكوّنٍ جميل.
 */
export function AngleDial({ value, onValueChange, step = 15, "aria-label": label, className }: AngleDialProps) {
  const host = useRef<HTMLDivElement>(null);

  const fromPoint = useCallback((clientX: number, clientY: number, snap: boolean) => {
    const el = host.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    const deg = norm((Math.atan2(dy, dx) * 180) / Math.PI);
    onValueChange(snap ? norm(Math.round(deg / step) * step) : Math.round(deg));
  }, [onValueChange, step]);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    fromPoint(e.clientX, e.clientY, !e.shiftKey);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    fromPoint(e.clientX, e.clientY, !e.shiftKey);
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const d = e.shiftKey ? 1 : step;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onValueChange(norm(value + d)); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onValueChange(norm(value - d)); }
  };

  return (
    <div
      ref={host}
      className={cn("adial", className)}
      style={{ ["--adial-a" as string]: `${value}deg` }}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)} درجة`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onKeyDown={onKey}
    >
      <i className="adial-arm" aria-hidden />
      <span className="adial-val font-latin" data-deg={`${Math.round(value)}°`} aria-hidden />
    </div>
  );
}
