"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { CountBadge } from "./Badge";

export type OptionListItem = {
  /** قيمة البند — يُطابَق بها `value` لتحديد المختار. */
  value: string;
  label: ReactNode;
  /** سطرٌ ثانٍ تحت التسمية (المعرّف اللاتينيّ نموذجًا). */
  hint?: ReactNode;
  /** شارة عددٍ في طرف البند. */
  count?: ReactNode;
};

export interface OptionListProps {
  items: OptionListItem[];
  /** البند المختار الآن. */
  value: string | null;
  onValueChange: (value: string) => void;
  /** عنوانٌ صغير أعلى القائمة. */
  heading?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

/**
 * قائمة اختيارٍ عموديّة — نظيرُ الشريط المقطعيّ حين تكثر الخيارات: `Segmented` صفٌّ
 * يضيق باثني عشر بندًا، وهذه عمودٌ يتّسع لها ويحمل لكلٍّ سطرًا ثانيًا وشارة عدد.
 *
 * أزرارٌ في مجموعة (`aria-pressed`) لا `listbox` — فالتنقّل بينها بـTab كما يتوقّعه
 * المستخدم، بلا ادّعاء دورٍ يستلزم تنقّلًا بالأسهم لا نبنيه.
 */
export function OptionList({ items, value, onValueChange, heading, className, ...aria }: OptionListProps) {
  return (
    <div className={cn("olist", className)} role="group" aria-label={aria["aria-label"]}>
      {heading ? <div className="olist-head">{heading}</div> : null}
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            className={cn("olist-item", on && "on")}
            aria-pressed={on}
            onClick={() => onValueChange(it.value)}
          >
            <span className="olist-tx">
              <b>{it.label}</b>
              {it.hint ? <small dir="ltr">{it.hint}</small> : null}
            </span>
            {it.count != null ? <CountBadge tone={on ? "info" : "neutral"}>{it.count}</CountBadge> : null}
          </button>
        );
      })}
    </div>
  );
}
