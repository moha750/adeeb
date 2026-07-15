"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@adeeb/design-system";
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

/** برامجنا وأنشطتنا — إطلالة جانبية بدوران لا نهائيّ. التحويل عبر الزرّ فقط. */
export function ActivitiesCarousel({ items }: { items: ActCard[] }) {
  const peekRef = useRef<HTMLDivElement>(null);
  const down = useRef(false);
  const sx = useRef(0);
  const sl = useRef(0);
  const moved = useRef(false);
  const settling = useRef(false); // أثناء الاستقرار الناعم بعد السحب
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
      if (!loop || down.current || settling.current) return;
      const sw = peek.scrollWidth / 3;
      if (peek.scrollLeft > -sw * 0.5) peek.scrollLeft -= sw;
      else if (peek.scrollLeft < -sw * 1.5) peek.scrollLeft += sw;
    };

    const onMove = (e: PointerEvent) => {
      if (!down.current) return;
      const dx = e.clientX - sx.current;
      if (Math.abs(dx) > 5) moved.current = true;
      peek.scrollLeft = sl.current - dx;
    };
    const onUp = () => {
      if (!down.current) return;
      down.current = false;
      // استقرار ناعم لأقرب بطاقة (بلا قفزة scroll-snap)
      const step = stepOf();
      const nearest = Math.round(peek.scrollLeft / step) * step;
      settling.current = true;
      peek.scrollTo({ left: nearest, behavior: "smooth" });
      setTimeout(() => { settling.current = false; seam(); }, 380);
    };
    const en = () => { hover = true; };
    const lv = () => { hover = false; };

    peek.addEventListener("scroll", seam, { passive: true });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", recenter);
    peek.addEventListener("mouseenter", en);
    peek.addEventListener("mouseleave", lv);

    let id: ReturnType<typeof setInterval> | null = null;
    if (!reduce && loop) {
      id = setInterval(() => {
        if (hover || down.current || cool.current) return;
        peek.scrollBy({ left: -stepOf(), behavior: "smooth" });
      }, 4500);
    }

    return () => {
      peek.removeEventListener("scroll", seam);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", recenter);
      peek.removeEventListener("mouseenter", en);
      peek.removeEventListener("mouseleave", lv);
      if (id) clearInterval(id);
      if (coolT.current) clearTimeout(coolT.current);
    };
  }, [items]);

  const onDown = (e: React.PointerEvent) => {
    const peek = peekRef.current;
    if (!peek) return;
    down.current = true;
    moved.current = false;
    sx.current = e.clientX;
    sl.current = peek.scrollLeft;
  };
  const nudge = (dir: "prev" | "next") => {
    const peek = peekRef.current;
    if (!peek) return;
    bump(); // منع الحركة التلقائية مؤقتًا عند استخدام الأزرار
    peek.scrollBy({ left: (dir === "next" ? -1 : 1) * stepOf(), behavior: "smooth" });
  };

  const copies = items.length > 1 ? [0, 1, 2] : [1];

  return (
    <div>
      <div className="act-peek" ref={peekRef} onPointerDown={onDown}>
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
                  tabIndex={c !== 1 ? -1 : undefined}
                  aria-label={`سجّل في ${a.name}`}
                  onClick={(e) => { if (moved.current) e.preventDefault(); }}
                >
                  سجّل الآن<ArrowLeft aria-hidden />
                </a>
              </div>
            </article>
          )),
        )}
      </div>
      <div className="act-ctrl">
        <button type="button" onClick={() => nudge("prev")} aria-label="السابق">‹</button>
        <button type="button" onClick={() => nudge("next")} aria-label="التالي">›</button>
      </div>
    </div>
  );
}
