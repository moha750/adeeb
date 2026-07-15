"use client";

import { useId } from "react";
import type { ReactNode } from "react";

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/**
 * أكورديون (طيّ/فتح) على <details> الأصليّ — سهل الوصول، بلا JS.
 * بهويّة أديب: زوايا متراكزة · ظلّ من السلّم · لمسة Aurora عند الفتح · مؤشّر chevron · حركة ناعمة.
 * حصريّ افتراضيًّا: فتح عنصرٍ يُغلق المفتوح (عبر سمة name المشتركة). مرّر exclusive={false} للسماح بتعدّد المفتوح.
 */
export function Accordion({
  items,
  exclusive = true,
  name,
}: {
  items: { q: string; a: ReactNode }[];
  exclusive?: boolean;
  name?: string;
}) {
  const autoId = useId();
  const groupName = exclusive ? name ?? `aacc-${autoId}` : undefined;
  return (
    <div className="aacc">
      {items.map((it, i) => (
        <details key={i} name={groupName} className="aacc-item">
          <summary className="aacc-head">
            <span className="aacc-q">{it.q}</span>
            <span className="aacc-ic"><Chevron /></span>
          </summary>
          <div className="aacc-body">{it.a}</div>
        </details>
      ))}
    </div>
  );
}
