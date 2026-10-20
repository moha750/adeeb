"use client";

/**
 * **بطاقةُ «الإيصال»** — غلافُ الصفحة الكحليّ بنقشه إلى آخر الشاشة، وفي وسطه بطاقةٌ بيضاء: علامةٌ في مربّعٍ
 * بتدرّج الهويّة، فعنوانٌ ونصّ، ثمّ ما يُمرَّر (أسطرُ الإيصال والأزرار). تلبسها شاشةُ الشكر (`Done`)
 * وشاشاتُ الحال كلُّها (لم يبدأ، انتهى، للأعضاء، سبق أن شاركت…) فلا يدخل المجيبُ صفحةً بهيئةٍ ويخرج بأخرى.
 */

import Link from "next/link";
import type { ReactNode } from "react";

export function Ticket({ mark, title, text, children }: { mark: ReactNode; title: string; text?: ReactNode; children?: ReactNode }) {
  return (
    <div className="spt">
      <section className="spt-hero spt-fin">
        <div className="spt-hero-in">
          <Link href="/" className="spt-logo" aria-label="موقع أدِيب">
            {/* eslint-disable-next-line @next/next/no-img-element -- شعارٌ متّجهٌ صغير */}
            <img src="/brand/logo-horizontal-white.svg" alt="" />
          </Link>
          <div className="spt-ticket">
            <span className="spt-ticket-mark" aria-hidden>{mark}</span>
            <h1 className="spt-ticket-t">{title}</h1>
            {text ? <p className="spt-ticket-p">{text}</p> : null}
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}

/** علامةُ الصحّ تُرسم مرّةً واحدة (وتقليلُ الحركة يُظهرها مرسومةً). */
export const Drawn = () => (
  <svg className="spt-drawn" viewBox="0 0 24 24" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
