"use client";

import { useCallback, useRef } from "react";
import { cn } from "../lib/cn";

export interface PointPadProps {
  /** موضعُ النقطة نسبةً من الضلع: ٠ يمينًا/أعلى، و١ يسارًا/أسفل (كإحداثيّات SVG). */
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
  /** معاينةٌ تُرسَم خلف النقطة (تدرّجٌ مثلًا) فيُرى أثرُ الموضع لا موضعُه فقط. */
  preview?: string;
  "aria-label"?: string;
  className?: string;
}

const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
const STEP = 0.05;

/**
 * **لوحُ النقطة** — مربّعٌ تُسحَب فيه نقطةٌ فتُعطي موضعًا في بُعدين.
 *
 * بُني لمركز التدرّج الشعاعيّ (٢٠٢٦-٠٨-٢٢): المركزُ موضعٌ لا رقمان، وحقلا `x` و`y`
 * يجعلان صاحبَ الشاشة يحسب ما يراه غيرُه بعينه. والخلفيّةُ تعرض التدرّجَ نفسَه، فما تحت
 * إصبعك هو ما سيخرج.
 */
export function PointPad({ x, y, onChange, preview, "aria-label": label, className }: PointPadProps) {
  const host = useRef<HTMLDivElement>(null);

  const fromPoint = useCallback((clientX: number, clientY: number) => {
    const el = host.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onChange(clamp((clientX - r.left) / r.width), clamp((clientY - r.top) / r.height));
  }, [onChange]);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    fromPoint(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 1) fromPoint(e.clientX, e.clientY);
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, [number, number]> = {
      ArrowRight: [STEP, 0], ArrowLeft: [-STEP, 0], ArrowDown: [0, STEP], ArrowUp: [0, -STEP],
    };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    onChange(clamp(x + d[0]), clamp(y + d[1]));
  };

  return (
    <div
      ref={host}
      className={cn("ppad", className)}
      style={{ ["--ppad-x" as string]: `${x * 100}%`, ["--ppad-y" as string]: `${y * 100}%`, ["--ppad-bg" as string]: preview }}
      role="application"
      tabIndex={0}
      aria-label={label}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onKeyDown={onKey}
    >
      <i className="ppad-dot" aria-hidden />
    </div>
  );
}
