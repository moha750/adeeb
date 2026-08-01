"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
// أنواع page-flip (يشحن بلا أنواع) مُعلَنة في apps/web/src/page-flip.d.ts (سكربت محيطيّ).

export type BookReaderPage = { src: string; alt?: string; hard?: boolean; thumb?: string };

export interface BookReaderProps {
  pages: BookReaderPage[];
  /** اتّجاه القراءة — عربيّ من اليمين افتراضًا. */
  rtl?: boolean;
  className?: string;
}

const CaretRight = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
);
const CaretLeft = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
);
const Expand = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
);
const Compress = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 8h3a2 2 0 0 0 2-2V3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M21 16h-3a2 2 0 0 0-2 2v3" /></svg>
);
const Grid = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
);

const imageSize = (src: string) => new Promise<{ w: number; h: number }>((resolve) => {
  const img = new window.Image();
  img.onload = () => resolve({ w: img.naturalWidth || 550, h: img.naturalHeight || 733 });
  img.onerror = () => resolve({ w: 550, h: 733 });
  img.src = src;
});

/**
 * قارئ كتابٍ بتقليبٍ واقعيّ — يلفّ محرّك `page-flip` بإطار الهوية. المحرّك يُحمَّل ديناميكيًّا
 * داخل التأثير (client-only، آمنٌ للـSSR ولو صُدّر من الحزمة).
 *
 * **RTL بلا مرآة** (فالسحب الأصليّ يعمل صحيحًا): تقنية `react-pageflip-rtl` مطبَّقة على المحرّك —
 * (١) بناء الصفحات بترتيبٍ معكوس، (٢) بدء عند آخر مؤشّر (`total-1`) فيُفتح على الغلاف الأماميّ،
 * (٣) تبديل تقدّم/رجوع، (٤) إعادة تخطيط المؤشّر المعروض بـ`total-1-i`. سحب الفأرة/اللمس أصليّ.
 */
export function BookReader({ pages, rtl = true, className }: BookReaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<InstanceType<typeof import("page-flip").PageFlip> | null>(null);
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState(0); // مؤشّر منطقيّ (صفحة القراءة الحقيقيّة)
  const [total, setTotal] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const [showThumbs, setShowThumbs] = useState(false);
  const [gotoVal, setGotoVal] = useState("");
  const thumbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let flip: InstanceType<typeof import("page-flip").PageFlip> | null = null;

    (async () => {
      const el = stageRef.current;
      if (!el || pages.length === 0) return;

      // توافق التصدير: بناء UMD قد يضع الصنف تحت default؛ نلتقط الحالتين
      const mod = (await import("page-flip")) as typeof import("page-flip") & { default?: { PageFlip?: typeof import("page-flip").PageFlip } };
      const PageFlip = mod.PageFlip ?? mod.default?.PageFlip;
      if (disposed || !PageFlip) return;

      const { w, h } = await imageSize(pages[0].src);
      if (disposed) return;

      // RTL: نعكس ترتيب الصفحات، ونبدأ عند آخر مؤشّر فيُفتح على الغلاف الأماميّ (لا مرآة).
      const order = rtl ? [...pages].reverse() : pages;
      const count = order.length;
      const toLogical = (i: number) => (rtl ? count - 1 - i : i);

      // بناء عناصر الصفحات إمبراطيًّا (React لا يملكها → لا تعارض مع محرّك DOM)
      el.innerHTML = "";
      const imgEls: HTMLImageElement[] = [];
      order.forEach((p, i) => {
        const page = document.createElement("div");
        page.className = "book-page";
        page.setAttribute("data-density", (p.hard || i === 0 || i === count - 1) ? "hard" : "soft");
        const img = document.createElement("img");
        img.dataset.src = p.src;      // الرابط الحقيقيّ — لا يُحمَّل حتى تدخل نافذته
        img.alt = p.alt ?? "";
        img.draggable = false;
        img.decoding = "async";
        imgEls.push(img);
        page.appendChild(img);
        el.appendChild(page);
      });

      // تحميل مُنافِذ: نحمّل نافذةً حول الصفحة الحاليّة فقط (لا الـ100+ دفعةً)،
      // وتتوسّع بالتقليب. المُحمَّل يبقى (لا إعادة تحميل عند العودة).
      const WINDOW = 4;
      const loadAround = (center: number) => {
        const lo = Math.max(0, center - WINDOW);
        const hi = Math.min(count - 1, center + WINDOW);
        for (let i = lo; i <= hi; i++) {
          const im = imgEls[i];
          if (im && !im.getAttribute("src") && im.dataset.src) im.src = im.dataset.src;
        }
      };
      const startIndex = rtl ? count - 1 : 0;
      loadAround(startIndex);

      flip = new PageFlip(el, {
        width: Math.max(300, Math.round((h ? (w / h) : 0.75) * 720)),
        height: 720,
        size: "stretch",
        minWidth: 280,
        maxWidth: 1600,
        minHeight: 360,
        maxHeight: 2200,
        drawShadow: true,
        flippingTime: 700,
        maxShadowOpacity: 0.5,
        showCover: true,
        usePortrait: true,
        mobileScrollSupport: true,
        startPage: startIndex,
      });
      flip.loadFromHTML(el.querySelectorAll<HTMLElement>(".book-page"));
      flip.on("flip", (e) => { const ei = Number(e.data); setCurrent(toLogical(ei)); loadAround(ei); });
      flipRef.current = flip;
      setTotal(count);
      setCurrent(toLogical(flip.getCurrentPageIndex()));
      setReady(true);
    })();

    return () => {
      disposed = true;
      try { flip?.destroy(); } catch { /* تجاهُل */ }
      flipRef.current = null;
      setReady(false);
    };
  }, [pages, rtl]);

  // تقدّم/رجوع القراءة — في RTL يُبدَّل اتّجاه المحرّك (المؤشّر المنطقيّ يزيد بينما مؤشّر المحرّك ينقص).
  const goForward = useCallback(() => { const f = flipRef.current; if (f) rtl ? f.flipPrev() : f.flipNext(); }, [rtl]);
  const goBack = useCallback(() => { const f = flipRef.current; if (f) rtl ? f.flipNext() : f.flipPrev(); }, [rtl]);

  // قفز إلى صفحةٍ منطقيّة (يترجم إلى مؤشّر المحرّك حسب الاتّجاه). تحميل النافذة يتبع حدث flip.
  const jumpTo = useCallback((logical: number) => {
    const f = flipRef.current;
    if (!f || total === 0) return;
    const clamped = Math.max(0, Math.min(total - 1, logical));
    f.flip(rtl ? total - 1 - clamped : clamped);
  }, [rtl, total]);

  // لوحة المفاتيح — يسار = تقدّم في RTL (معكوس عن LTR)؛ Home/End لأوّل/آخر صفحة منطقيّة.
  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); rtl ? goForward() : goBack(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); rtl ? goBack() : goForward(); }
      else if (e.key === "Home") flipRef.current?.flip(rtl ? total - 1 : 0);
      else if (e.key === "End") flipRef.current?.flip(rtl ? 0 : Math.max(0, total - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, rtl, total, goForward, goBack]);

  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // إبراز المصغّرة الحاليّة في العرض عند فتح الفهرس أو تغيّر الصفحة
  useEffect(() => {
    if (!showThumbs) return;
    thumbsRef.current?.querySelector<HTMLElement>(".book-thumb.on")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [showThumbs, current]);

  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else rootRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={rootRef} className={cn("book-reader", className)}>
      <div className="book-reader-stage-wrap">
        <div className="book-flip-frame">
          <div ref={stageRef} className="book-reader-stage" />
        </div>
        {!ready ? <div className="book-reader-loading">…يُفتح الكتاب</div> : null}
      </div>

      {showThumbs && total > 0 ? (
        <div className="book-index" dir="rtl">
          <label className="book-goto">
            <span>اذهب إلى صفحة</span>
            <input
              className="book-goto-inp"
              type="number"
              min={1}
              max={total}
              value={gotoVal}
              onChange={(e) => setGotoVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { const n = parseInt(gotoVal, 10); if (n >= 1) jumpTo(n - 1); } }}
            />
            <span className="book-goto-total">/ {total}</span>
          </label>
          <div className="book-thumbs" ref={thumbsRef}>
            {pages.map((p, i) => (
              <button
                key={i}
                type="button"
                className={"book-thumb" + (i === current ? " on" : "")}
                onClick={() => jumpTo(i)}
                aria-label={`صفحة ${i + 1}`}
                aria-current={i === current || undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb ?? p.src} alt="" loading="lazy" />
                <span className="book-thumb-n">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="book-toolbar" dir="rtl">
        <button type="button" className="aibtn aibtn-md" aria-label="الصفحة السابقة" onClick={goBack} disabled={current <= 0}>
          <CaretRight />
        </button>
        <span className="book-counter">{total ? `${current + 1} / ${total}` : "—"}</span>
        <button type="button" className="aibtn aibtn-md" aria-label="الصفحة التالية" onClick={goForward} disabled={total > 0 && current >= total - 1}>
          <CaretLeft />
        </button>
        <button type="button" className={"aibtn aibtn-md" + (showThumbs ? " book-tb-on" : "")} aria-label="فهرس الصفحات" aria-pressed={showThumbs} onClick={() => setShowThumbs((s) => !s)}>
          <Grid />
        </button>
        <button type="button" className="aibtn aibtn-md" aria-label={isFs ? "إنهاء ملء الشاشة" : "ملء الشاشة"} onClick={toggleFs}>
          {isFs ? <Compress /> : <Expand />}
        </button>
      </div>
    </div>
  );
}
