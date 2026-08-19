"use client";

import type { ComponentType, ReactNode } from "react";
import { cn } from "../lib/cn";

export type SegmentedItem = {
  /** قيمة العنصر — يُطابَق بها `value` لتحديد الفعّال. */
  value: string;
  label: ReactNode;
  /** وضع التنقّل: إن وُجد رابطٌ صار العنصر `<a>`/`linkAs` بدل زرّ. */
  href?: string;
};

/** واجهة مكوّن الرابط الممرَّر (مثل Next `Link`) — كي تبقى المكتبة بلا تبعيّة إطار. */
type LinkLike = ComponentType<{ href: string; className?: string; "aria-current"?: "page"; children?: ReactNode }>;

export interface SegmentedProps {
  items: SegmentedItem[];
  /** القيمة الفعّالة الآن. */
  value: string;
  /** وضع الأزرار: يُستدعى عند الاختيار. يُهمَل في وضع الروابط. */
  onValueChange?: (value: string) => void;
  /** مكوّن الرابط لوضع التنقّل (Next `Link`)؛ الافتراضي `<a>`. */
  linkAs?: LinkLike;
  /** تسمية المجموعة لقارئ الشاشة. */
  "aria-label"?: string;
  /** ممتدٌّ على عرض صفّه، تتقاسمه عناصرُه بالسويّة — لخيارٍ هو نفسُه الشاشة لا زينةُ ركن. */
  wide?: boolean;
  className?: string;
}

/**
 * شريط مقطعيّ (Segmented) — تحكّمٌ لا سطح: خلفية غائرة وحدٌّ خاصّ، والعنصر الفعّال
 * يرتفع بسطحٍ أبيض وظلٍّ صغير. مصدرٌ واحد لتبويبات النافذة ومبدّل مدى التحليلات.
 *
 * وضعان: **أزرار** (حالة عبر `onValueChange`) أو **روابط** (تنقّل عبر `href`
 * على كلّ عنصر). في وضع الروابط مرّر `linkAs={Link}` لتنقّلٍ عميليّ.
 */
export function Segmented({ items, value, onValueChange, linkAs, wide, className, ...aria }: SegmentedProps) {
  const Link = linkAs;
  return (
    <div className={cn("seg", wide && "seg-wide", className)} role="group" aria-label={aria["aria-label"]}>
      {items.map((it) => {
        const on = it.value === value;
        if (it.href != null) {
          const cls = cn("seg-item", on && "on");
          return Link ? (
            <Link key={it.value} href={it.href} className={cls} aria-current={on ? "page" : undefined}>
              {it.label}
            </Link>
          ) : (
            <a key={it.value} href={it.href} className={cls} aria-current={on ? "page" : undefined}>
              {it.label}
            </a>
          );
        }
        return (
          <button
            key={it.value}
            type="button"
            className={cn("seg-item", on && "on")}
            aria-pressed={on}
            onClick={() => onValueChange?.(it.value)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
