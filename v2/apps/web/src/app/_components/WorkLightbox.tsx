"use client";

import { useEffect } from "react";
import { toLatinDigits } from "@adeeb/core";

export type Work = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  link_url: string | null;
};

/** عارض الصورة للأعمال التي لا رابط وجهة لها. يُغلق بالخلفية أو Esc. */
export function WorkLightbox({ w, onClose }: { w: Work; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/80 p-6 backdrop-blur-sm"
    >
      <div
        className="relative max-h-[85vh] w-full max-w-3xl overflow-hidden  bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {w.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={w.image_url}
            alt={w.title}
            className="max-h-[70vh] w-full bg-navy-950 object-contain"
          />
        ) : null}
        <div className="p-5">
          {w.category ? (
            <span className="mb-1 block font-body text-xs font-bold text-secondary">
              {toLatinDigits(w.category)}
            </span>
          ) : null}
          <h3 className="font-display text-xl font-bold text-content">{toLatinDigits(w.title)}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center  bg-navy-950/60 text-white transition hover:bg-navy-950"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
