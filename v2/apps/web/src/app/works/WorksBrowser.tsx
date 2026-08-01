"use client";

import { useMemo, useState } from "react";
import { toLatinDigits } from "@adeeb/core";
import { WorkLightbox, type Work } from "../_components/WorkLightbox";

/** تصفّح كامل للأعمال مع فلترة بالتصنيف — شبكة ثابتة للتصفّح المتأنّي والنقر المريح. */
export function WorksBrowser({ works }: { works: Work[] }) {
  const [active, setActive] = useState<string>("الكل");
  const [box, setBox] = useState<Work | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    works.forEach((w) => w.category && set.add(w.category));
    return ["الكل", ...Array.from(set)];
  }, [works]);

  const shown = active === "الكل" ? works : works.filter((w) => w.category === active);

  return (
    <>
      {/* شرائح الفلترة */}
      <div className="mb-10 mt-8 flex flex-wrap justify-center gap-2">
        {categories.map((c) => {
          const on = c === active;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={
                "rounded-full border px-4 py-1.5 text-sm font-bold transition " +
                (on
                  ? "border-transparent bg-brand text-white"
                  : "border-line bg-surface text-content-muted hover:border-navy-300")
              }
            >
              {toLatinDigits(c)}
            </button>
          );
        })}
      </div>

      {/* الشبكة */}
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((w) => (
          <WorkGridCard key={w.id} w={w} onOpen={() => setBox(w)} />
        ))}
      </div>

      <WorkLightbox work={box} onClose={() => setBox(null)} />
    </>
  );
}

function WorkGridCard({ w, onOpen }: { w: Work; onOpen: () => void }) {
  const inner = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden">
        {w.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={w.image_url}
            alt={w.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-navy-100" />
        )}
        {w.link_url ? (
          <span
            aria-hidden
            className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm bg-navy-950/50 text-sm text-white opacity-0 transition group-hover:opacity-100"
          >
            ↗
          </span>
        ) : null}
      </div>
      <div className="p-4">
        {w.category ? (
          <span className="mb-1 block font-body text-xs font-bold text-secondary">
            {toLatinDigits(w.category)}
          </span>
        ) : null}
        <h3 className="font-display text-base font-bold leading-snug text-content">
          {toLatinDigits(w.title)}
        </h3>
      </div>
    </>
  );

  const base =
    "group block overflow-hidden rounded border border-line bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg";

  return w.link_url ? (
    <a href={w.link_url} target="_blank" rel="noopener noreferrer" className={base} title={w.title}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onOpen} className={`${base} w-full text-right`} title={w.title}>
      {inner}
    </button>
  );
}
