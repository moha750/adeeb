"use client";

import { Dialog } from "@adeeb/design-system";
import { useId, useRef } from "react";
import { toLatinDigits } from "@adeeb/core";
import { X } from "@/app/_components/glyphs";

export type Work = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  link_url: string | null;
};

/**
 * عارض الصورة للأعمال التي لا رابط وجهة لها — يجلس على بدائيّة {@link Dialog}
 * (فخّ تركيز · قفل تمرير · ESC · ARIA · إرجاع تركيز · حركة دخول/خروج) بمظهر «صورة أولًا».
 * يُغلق بالخلفية أو Esc. (Dialog يعيش في dashboard/_components ريثما يُرقّى إلى نظام التصميم.)
 */
export function WorkLightbox({ work, onClose }: { work: Work | null; onClose: () => void }) {
  // نُبقي آخر عمل معروض كي تُكمل حركة الإغلاق صورتها بعد أن يصير work=null
  const shown = useRef<Work | null>(work);
  if (work) shown.current = work;
  const w = shown.current;
  const titleId = useId();

  return (
    <Dialog open={!!work} onClose={onClose} contentClassName="wlb" closeOnScrimClick labelledBy={titleId}>
      {w ? (
        <>
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
            <h3 id={titleId} className="font-display text-xl font-bold text-content">
              {toLatinDigits(w.title)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-sm bg-navy-950/60 text-white transition hover:bg-navy-950"
          >
            <X aria-hidden />
          </button>
        </>
      ) : null}
    </Dialog>
  );
}
