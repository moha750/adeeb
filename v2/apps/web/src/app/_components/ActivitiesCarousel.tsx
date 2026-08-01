"use client";

import { useEffect, useRef } from "react";
import { Badge, CarouselNav } from "@adeeb/design-system";
import { Clock, MapPin, ArrowLeft } from "@phosphor-icons/react";

export type ActCard = {
  id: string;
  name: string;
  typeLabel: string;
  location: string | null;
  day: string;
  month: string;
  time: string | null;
  cover: string | null;
  href: string;
};

/** برامجنا وأنشطتنا — إطلالة جانبية بدوران لا نهائيّ. التنقّل بالأزرار وحدها (لا سحب). */
export function ActivitiesCarousel({ items }: { items: ActCard[] }) {
  const peekRef = useRef<HTMLDivElement>(null);
  const cool = useRef(false); // توقّف مؤقّت للتلقائي بعد تفاعل يدويّ
  const coolT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stepOf = () => {
    const c = peekRef.current?.querySelector<HTMLElement>(".act-card");
    return c ? c.offsetWidth + 22 : 360;
  };
  const bump = () => {
    cool.current = true;
    if (coolT.current) clearTimeout(coolT.current);
    coolT.current = setTimeout(() => { cool.current = false; }, 5000);
  };

  useEffect(() => {
    const peek = peekRef.current;
    if (!peek) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const loop = items.length > 1;
    let hover = false;

    const recenter = () => {
      if (!loop) return;
      peek.scrollLeft = -(peek.scrollWidth / 3);
    };
    requestAnimationFrame(recenter);

    const seam = () => {
      if (!loop) return;
      const sw = peek.scrollWidth / 3;
      if (peek.scrollLeft > -sw * 0.5) peek.scrollLeft -= sw;
      else if (peek.scrollLeft < -sw * 1.5) peek.scrollLeft += sw;
    };

    const en = () => { hover = true; };
    const lv = () => { hover = false; };

    peek.addEventListener("scroll", seam, { passive: true });
    window.addEventListener("resize", recenter);
    peek.addEventListener("mouseenter", en);
    peek.addEventListener("mouseleave", lv);

    let id: ReturnType<typeof setInterval> | null = null;
    if (!reduce && loop) {
      id = setInterval(() => {
        if (hover || cool.current) return;
        peek.scrollBy({ left: -stepOf(), behavior: "smooth" });
      }, 4500);
    }

    return () => {
      peek.removeEventListener("scroll", seam);
      window.removeEventListener("resize", recenter);
      peek.removeEventListener("mouseenter", en);
      peek.removeEventListener("mouseleave", lv);
      if (id) clearInterval(id);
      if (coolT.current) clearTimeout(coolT.current);
    };
  }, [items]);

  const nudge = (dir: "prev" | "next") => {
    const peek = peekRef.current;
    if (!peek) return;
    bump(); // منع الحركة التلقائية مؤقتًا عند استخدام الأزرار
    peek.scrollBy({ left: (dir === "next" ? -1 : 1) * stepOf(), behavior: "smooth" });
  };

  const copies = items.length > 1 ? [0, 1, 2] : [1];

  return (
    <div>
      <div className="act-peek" ref={peekRef}>
        {copies.map((c) =>
          items.map((a) => (
            <article className="act-card" key={`${a.id}-${c}`} aria-hidden={c !== 1}>
              <div className="act-cov" style={a.cover ? { backgroundImage: `url(${a.cover})` } : undefined}>
                <div className="act-date">
                  <div className="act-d">{a.day}</div>
                  <div className="act-m">{a.month}</div>
                </div>
              </div>
              <div className="act-bd">
                <Badge tone="info" className="self-start">{a.typeLabel}</Badge>
                <h3 className="act-title">{a.name}</h3>
                <div className="act-meta">
                  {a.time ? <span><Clock aria-hidden />{a.time}</span> : null}
                  {a.location ? <span><MapPin aria-hidden />{a.location}</span> : null}
                </div>
                {/* التحويل للنشاط عبر الزرّ فقط */}
                <a
                  className="abtn abtn-primary abtn-md mt-4 w-full"
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  draggable={false}
                  tabIndex={c !== 1 ? -1 : undefined}
                  aria-label={`سجّل في ${a.name}`}
                >
                  سجّل الآن<ArrowLeft aria-hidden />
                </a>
              </div>
            </article>
          )),
        )}
      </div>
      <CarouselNav onPrev={() => nudge("prev")} onNext={() => nudge("next")} />
    </div>
  );
}
