"use client";

import { useMemo, useState } from "react";
import { KIND_META, type BookKind } from "../dashboard/library/vocab";

export type ShelfBook = {
  id: string;
  title: string;
  slug: string;
  kind: BookKind;
  kindLabel: string;
  yearLabel: string;
  coverUrl: string | null;
  isFeatured: boolean;
};

/** رفّ المكتبة العامّ — فلترة بالنوع (شرائح)، ثمّ شبكة أغلفة تنقر إلى القارئ. */
export function LibraryShelf({ books }: { books: ShelfBook[] }) {
  const [active, setActive] = useState<"الكل" | BookKind>("الكل");

  const kinds = useMemo(() => {
    const present = new Set<BookKind>();
    books.forEach((b) => present.add(b.kind));
    return (["الكل", ...Array.from(present)] as ("الكل" | BookKind)[]);
  }, [books]);

  const shown = active === "الكل" ? books : books.filter((b) => b.kind === active);
  const label = (k: "الكل" | BookKind) => (k === "الكل" ? "الكل" : KIND_META[k].label);

  return (
    <>
      {kinds.length > 2 ? (
        <div className="mb-10 mt-8 flex flex-wrap justify-center gap-2">
          {kinds.map((k) => {
            const on = k === active;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setActive(k)}
                className={
                  "rounded-full border px-4 py-1.5 text-sm font-bold transition " +
                  (on ? "border-transparent bg-brand text-white" : "border-line bg-surface text-content-muted hover:border-navy-300")
                }
              >
                {label(k)}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-8" />
      )}

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((b) => (
          <a
            key={b.id}
            href={`/library/${b.slug}`}
            title={b.title}
            className="group block overflow-hidden rounded border border-line bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-navy-100">
              {b.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.coverUrl} alt={b.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-content-muted">لا غلاف</div>
              )}
              {b.isFeatured ? (
                <span className="absolute end-3 top-3 rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">الأحدث</span>
              ) : null}
            </div>
            <div className="p-4">
              <span className="mb-1 block font-body text-xs font-bold text-secondary">
                {b.kindLabel}{b.yearLabel ? ` · ${b.yearLabel}` : ""}
              </span>
              <h3 className="font-display text-base font-bold leading-snug text-content">{b.title}</h3>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
