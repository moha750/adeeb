"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge, useInView } from "@adeeb/design-system";
import { CalendarBlank, User } from "@phosphor-icons/react";
import { Eye, ArrowLeft } from "@/app/_components/glyphs";

export type NewsCard = {
  id: string;
  title: string;
  summary: string | null;
  cover: string | null;
  dateStr: string;
  author: string | null;
  views: number | null;
  featured: boolean;
  href: string;
};

const Meta = ({ n }: { n: NewsCard }) => (
  <div className="ns-meta">
    <span><CalendarBlank aria-hidden />{n.dateStr}</span>
    {n.views != null ? <span><Eye aria-hidden /><span className="num">{n.views}</span> مشاهدة</span> : null}
    {n.author ? <span><User aria-hidden />{n.author}</span> : null}
  </div>
);

/** آخر الأخبار — عرض تحريريّ متحرّك (مقال مميّز يتبدّل تلقائيًّا + قائمة/شريط مصغّرات). */
export function NewsShowcase({ items }: { items: NewsCard[] }) {
  const n = items.length;
  const [cur, setCur] = useState(0);
  // مرآةُ الخبر الحاضر لمؤقّت التبديل: هو مربوطٌ مرّةً عند التركيب فلا يرى الحالةَ الجارية.
  // **وتُحدَّث بعد الرسم لا فيه**: الكتابةُ في مرجعٍ أثناء الرسم تكسر نقاءه (قاعدةُ `refs`)،
  // وما بعد التثبيت يسبق أوّلَ دقّةٍ للمؤقّت (خمسُ ثوانٍ) وأوّلَ نقرةٍ دائمًا.
  const curRef = useRef(0);
  useEffect(() => { curRef.current = cur; });

  const l0 = useRef<HTMLDivElement>(null);
  const l1 = useRef<HTMLDivElement>(null);
  const active = useRef(0);
  const prog = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hover = useRef(false);
  const cool = useRef(false);
  const coolT = useRef<ReturnType<typeof setTimeout> | null>(null);
  // سحب شريط المصغّرات
  const railRef = useRef<HTMLDivElement>(null);
  const rdown = useRef(false);
  const rsx = useRef(0);
  const rsl = useRef(0);
  const rmoved = useRef(false);

  const bump = () => {
    cool.current = true;
    if (coolT.current) clearTimeout(coolT.current);
    coolT.current = setTimeout(() => { cool.current = false; }, 6000);
  };

  const restartProg = () => {
    if (!prog.current) return;
    prog.current.classList.remove("ns-run");
    void prog.current.offsetWidth;
    prog.current.classList.add("ns-run");
  };

  const applyLayer = (i: number) => {
    const layers = [l0.current, l1.current];
    if (!layers[0] || !layers[1]) return;
    const nl = 1 - active.current;
    const el = layers[nl]!;
    el.style.backgroundImage = items[i].cover ? `url("${items[i].cover}")` : "";
    el.style.animation = "ns-kb 7s ease-out forwards";
    el.style.opacity = "1";
    layers[active.current]!.style.opacity = "0";
    active.current = nl;
    restartProg();
  };

  const go = (i: number, manual: boolean) => {
    if (i === curRef.current) return;
    setCur(i);
    applyLayer(i);
    if (manual) bump();
  };

  // تهيئة الطبقة الأولى وشريط التقدّم عند التركيب
  useEffect(() => {
    const el = l0.current;
    if (el) {
      el.style.backgroundImage = items[0]?.cover ? `url("${items[0].cover}")` : "";
      el.style.animation = "ns-kb 7s ease-out forwards";
      el.style.opacity = "1";
    }
    active.current = 0;
    restartProg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // لا يبدّل الخبرَ إلّا والقسمُ في الشاشة (المصدر الواحد لكلّ الأشرطة)
  const inView = useInView(rootRef);
  const visible = useRef(false);

  // ووصولُ القسم يُعيد شريطَ التقدّم من أوّله: لولاه لَوجد الزائرُ الشريطَ ممتلئًا
  // والخبرُ الأوّل ما يزال مكانه.
  useEffect(() => {
    visible.current = inView;
    if (inView) restartProg();
  }, [inView]);

  // التبديل التلقائيّ
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || n <= 1) return;
    const id = setInterval(() => {
      if (hover.current || cool.current || !visible.current) return;
      go((curRef.current + 1) % n, false);
    }, 5000);
    return () => {
      clearInterval(id);
      if (coolT.current) clearTimeout(coolT.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  // شريط المصغّرات: السحب بالماوس + تلاشي الحافّتين عند الفيض فقط
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const updateFade = () => {
      rail.classList.toggle("ns-rail-fade", rail.scrollWidth > rail.clientWidth + 4);
    };
    updateFade();
    const onMove = (e: PointerEvent) => {
      if (!rdown.current) return;
      const dx = e.clientX - rsx.current;
      if (Math.abs(dx) > 5) rmoved.current = true;
      rail.scrollLeft = rsl.current - dx;
    };
    const onUp = () => { rdown.current = false; };
    window.addEventListener("resize", updateFade);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("resize", updateFade);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [items]);

  const onRailDown = (e: React.PointerEvent) => {
    const rail = railRef.current;
    if (!rail) return;
    rdown.current = true;
    rmoved.current = false;
    rsx.current = e.clientX;
    rsl.current = rail.scrollLeft;
  };

  const it = items[cur];
  const onEnter = () => { hover.current = true; };
  const onLeave = () => { hover.current = false; };

  return (
    <div ref={rootRef}>
      <div className="ns-show" onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <div className="ns-feat">
          <div className="ns-prog"><i ref={prog} /></div>
          <div className="ns-layer" ref={l0} />
          <div className="ns-layer" ref={l1} />
          <div className="ns-grad" />
          <div className="ns-cap" key={cur}>
            <Badge variant="glass" className="mb-3">{it.featured ? "مميّز" : "خبر"}</Badge>
            <Meta n={it} />
            <h3 className="ns-clamp3">{it.title}</h3>
            {it.summary ? <p className="ns-clamp2">{it.summary}</p> : null}
            <Link className="abtn abtn-inverse abtn-sm mt-3" href={it.href}>
              اقرأ المزيد<ArrowLeft aria-hidden />
            </Link>
          </div>
        </div>
        <div className="ns-list">
          {items.map((m, i) => (
            <button type="button" key={m.id} className={"ns-li" + (i === cur ? " ns-on" : "")} onClick={() => go(i, true)}>
              <span className="ns-th" style={m.cover ? { backgroundImage: `url("${m.cover}")` } : undefined} />
              <span className="ns-st">
                <span className="ns-h4">{m.title}</span>
                <span className="ns-lidate">{m.dateStr}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="ns-rail" ref={railRef} onPointerDown={onRailDown} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {items.map((m, i) => (
          <button
            type="button"
            key={m.id}
            className={"ns-rt" + (i === cur ? " ns-on" : "")}
            onClick={() => { if (rmoved.current) { rmoved.current = false; return; } go(i, true); }}
            aria-label={m.title}
            style={m.cover ? { backgroundImage: `url("${m.cover}")` } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
