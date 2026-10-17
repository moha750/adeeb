"use client";

import { Newspaper } from "@phosphor-icons/react";
import { SealCard } from "../../NewsCard";
import type { PublicNews } from "../../data";

/** «اقرأ أيضًا»: ثلاثةُ أخبارٍ بكرت «ختم التاريخ» (المالك ٢٠٢٦-١٠-١٤). */
export function MoreNews({ items }: { items: PublicNews[] }) {
  return (
    <div className="art art-more">
      <h2 className="art-sec-h">
        <Newspaper className="art-sec-ic" aria-hidden />
        <span className="art-h-t">اقرأ أيضًا</span>
      </h2>
      <div className="art-more-l">
        {items.map((m) => (
          <SealCard key={m.id} n={m} />
        ))}
      </div>
    </div>
  );
}
