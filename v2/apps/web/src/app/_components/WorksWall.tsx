"use client";

import { useState, type CSSProperties } from "react";
import { toLatinDigits } from "@adeeb/core";
import { ArrowUpRight } from "@phosphor-icons/react";
import { WorkLightbox, type Work } from "./WorkLightbox";

const COLS = 3;
const DURATIONS = ["36s", "46s", "32s"]; // سرعات متفاوتة لحيوية أعلى

/** معرض «إبداعاتنا»: جدار حيّ بأعمدة متعاكسة الاتجاه. البطاقة كلّها رابط،
 *  ومن لا رابط له يُفتح في عارض (lightbox). يتوقّف العمود عند مرور الماوس. */
export function WorksWall({ works }: { works: Work[] }) {
  const [box, setBox] = useState<Work | null>(null);

  // توزيع دائري على الأعمدة
  const columns: Work[][] = Array.from({ length: COLS }, () => []);
  works.forEach((w, i) => columns[i % COLS].push(w));

  return (
    <>
      <div className="works-wall-mask grid h-[560px] grid-cols-2 gap-4 md:grid-cols-3">
        {columns.map((col, ci) => (
          <div
            key={ci}
            className={"works-col overflow-hidden" + (ci === 2 ? " hidden md:block" : "")}
          >
            <div
              className="works-track flex flex-col"
              style={
                {
                  "--dur": DURATIONS[ci],
                  animationDirection: ci % 2 === 1 ? "reverse" : "normal",
                } as CSSProperties
              }
            >
              {/* مضاعفة العناصر مرّتين لحلقة تمرير سلسة */}
              {[...col, ...col].map((w, k) => (
                <WorkTile key={`${w.id}-${k}`} w={w} onOpen={() => setBox(w)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <WorkLightbox work={box} onClose={() => setBox(null)} />
    </>
  );
}

function WorkTile({ w, onOpen }: { w: Work; onOpen: () => void }) {
  const inner = (
    <>
      {w.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={w.image_url}
          alt={w.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <div className="h-full w-full bg-navy-100" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-right opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        {w.category ? (
          <span className="mb-1 block font-body text-xs font-bold text-steel-200">
            {toLatinDigits(w.category)}
          </span>
        ) : null}
        <div className="flex items-center justify-between gap-2 text-white">
          <h3 className="font-display text-base font-bold leading-snug">{toLatinDigits(w.title)}</h3>
          {w.link_url ? (
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-navy-950/60 text-white"
            >
              <ArrowUpRight aria-hidden />
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  // hamish سفليّ ثابت (بدل gap) ليتطابق النصفان المكرّران ويصير التمرير سلسًا بلا قفزة
  const base =
    "group relative block h-52 shrink-0 overflow-hidden rounded shadow-lg ring-1 ring-navy-950/5 mb-4";

  return w.link_url ? (
    <a
      href={w.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className={base}
      title={w.title}
    >
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onOpen} className={`${base} w-full`} title={w.title}>
      {inner}
    </button>
  );
}
