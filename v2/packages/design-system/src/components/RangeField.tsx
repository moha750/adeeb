"use client";

import { useId } from "react";
import { cn } from "../lib/cn";

export interface RangeFieldProps {
  label?: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** لاحقةُ الرقم المعروض (درجةٌ، نسبةٌ مئويّة…). */
  unit?: string;
  className?: string;
}

/**
 * **حقلُ المزلق** — رقمٌ يُقاد بالإصبع بين حدّين، وقيمتُه مكتوبةٌ بجواره.
 *
 * أوّلُ مزلقٍ في المكتبة (٢٠٢٦-٠٨-٢٢). والقضيبُ من رموز الأسطح والحدود، والمقبضُ هدفُ
 * لمسٍ لا زينة: ٢٤ بكسلًا مرئيّة داخل مساحةٍ يبلغها الإبهام (قانونُ اللمس ٤٤).
 * والرقمُ بخطّ اللاتينيّ واتّجاهه، فلا تقلبه الخوارزميّةُ ثنائيّةُ الاتّجاه في سطرٍ عربيّ.
 */
export function RangeField({ label, value, onValueChange, min = 0, max = 100, step = 1, unit, className }: RangeFieldProps) {
  const id = useId();
  return (
    <div className={cn("rng", className)}>
      {label ? <label className="rng-lbl" htmlFor={id}>{label}</label> : null}
      <div className="rng-row">
        <input
          id={id}
          type="range"
          className="rng-in"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
        />
        <output className="rng-val font-latin" dir="ltr" htmlFor={id}>{Math.round(value)}{unit ?? ""}</output>
      </div>
    </div>
  );
}
