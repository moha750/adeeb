"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
// أنواع page-flip (يشحن بلا أنواع) مُعلَنة في apps/web/src/page-flip.d.ts (سكربت محيطيّ).

export type BookReaderPage = { src: string; alt?: string; hard?: boolean; thumb?: string };

export interface BookReaderProps {
  pages: BookReaderPage[];
  /** اتّجاه القراءة — عربيّ من اليمين افتراضًا. */
  rtl?: boolean;
  className?: string;
  /** أدواتٌ تُلحق بشريط القارئ بعد أدواته (المشاركة في صفحة الكتاب العامّة) — بصنف زرّ الأيقونة `ad-ibtn` */
  tools?: ReactNode;
  /** **فهرسُ الكتيّب** (٢٠٢٦-١١-١٦): الصفحاتُ المسمّاةُ في البوّابة («تسمية») أقسامُه — `page` مؤشّرُ الصفحة (يبدأ بصفر) */
  sections?: { title: string; page: number }[];
  /** **رابطٌ إلى صفحةٍ بعينها**: يُفتح الكتابُ عليها (`?p=34` في صفحة الكتاب) — مؤشّرٌ يبدأ بصفر */
  initialPage?: number;
  /** يُخبَر صاحبُه بالصفحة الحاليّة (لـ«رابط هذه الصفحة») */
  onPage?: (page: number) => void;
  /** **«تابع من حيث توقّفت»**: مفتاحُ حفظ آخر صفحةٍ في متصفّح القارئ وحده (`localStorage`) — بلا مفتاحٍ لا حفظ */
  resumeKey?: string;
  /** يَعرض القارئُ نفسُه «توقّفتَ عند صفحة…» — وصفحةُ الكتيّب تعرضه تنبيهًا قبل فتح الغرفة فلا يتكرّر داخلها */
  offerResume?: boolean;
  /** **ما يملأ الشاشة**: القارئُ وحده (الأصل)، أو الصفحةُ كلُّها (`page`) لمن يضعه في غرفةٍ تملأ الشاشة أصلًا — فمؤشّرُ أدِيب المرسوم
   *  يبقى داخل ما ملأ الشاشة. كان القارئُ وحده يملؤها فيختفي المؤشّرُ معه، إذ المؤشّرُ عنصرٌ خارجَه (محمد ٢٠٢٦-١١-١٦: «الماوس لا يظهر») */
  fullscreen?: "self" | "page";
  /** **شريطٌ بالكلمات** (غرفةُ القراءة): كلُّ فعلٍ رمزُه فوق واسمُه تحته كقسائم التذكرة — الرمزُ وحده لا يُفهم (محمد). والأصلُ أزرارُ الرمز
   *  بتلميحها لمن يضع القارئَ في مكانٍ ضيّق (معاينةُ المحرّر) */
  labelled?: boolean;
}

const List = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>
);

/** حفظُ آخر صفحة: يُقرأ ويُكتب في `try` — المتصفّحُ قد يمنع التخزين (نافذةٌ خاصّة)، فلا يكسر القارئ */
const readResume = (key?: string): number | null => {
  if (!key) return null;
  try { const v = Number(window.localStorage.getItem(`adeeb:book:${key}`)); return Number.isFinite(v) && v > 0 ? v : null; } catch { return null; }
};
const writeResume = (key: string | undefined, page: number) => {
  if (!key) return;
  try { window.localStorage.setItem(`adeeb:book:${key}`, String(page)); } catch { /* تجاهُل */ }
};

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
export function BookReader({ pages, rtl = true, className, tools, sections, initialPage, onPage, resumeKey, offerResume = true, fullscreen = "self", labelled = false }: BookReaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<InstanceType<typeof import("page-flip").PageFlip> | null>(null);
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState(0); // مؤشّر منطقيّ (صفحة القراءة الحقيقيّة)
  const [total, setTotal] = useState(0);
  const [isFs, setIsFs] = useState(false);
  /** صفحتان متقابلتان (السعة) أم صفحةٌ واحدة (الجوّال) — في الأولى يقعد الغلافُ المغلقُ في نصف المسرح */
  const [spread, setSpread] = useState(false);
  /**
   * **السؤالُ من جديد عند تغيّر المقاس** (محمد ٢٠٢٦-١١-١٦: «عند التصغير تكون صفحة، فعند التكبير لا ترجع صفحتين!!»): غرفةُ القراءة تضيّق
   * الكتابَ إلى صفحةٍ حين يعرض صفحةً (`data-portrait`)، والمحرّكُ لا يعرض صفحتين إلّا في عرضٍ يتّسع لهما (`2 × minWidth`) — فيبقى على صفحةٍ
   * مهما كبرت الشاشة. فحين يتغيّر المقاس يُرفع التضييقُ لحظةً، ويُسأل المحرّكُ بعرض صفحتين، ثمّ يعود التضييقُ إن بقي على صفحة
   */
  const [probe, setProbe] = useState(false);
  /** اللوحةُ تحت الكتاب: فهرسُ الأقسام، أو المصغّرات */
  const [panel, setPanel] = useState<"toc" | "thumbs" | null>(null);
  const showThumbs = panel === "thumbs";
  /** عرضُ المتابعة: آخرُ صفحةٍ قرأها هذا المتصفّح، يُعرض مرّةً عند الفتح ما لم يُفتح على صفحةٍ بعينها */
  const [resume, setResume] = useState<number | null>(null);
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
      // نسبةُ الصفحة لمن يلفّ القارئ: الكتابُ يُقاس بارتفاع الشاشة فيُرى كلُّه مع شريطه (`ad.css`)
      rootRef.current?.style.setProperty("--book-page-ratio", String(h ? w / h : 0.75));

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
      const first = initialPage != null && initialPage > 0 && initialPage < count ? initialPage : 0;
      const startIndex = rtl ? count - 1 - first : first;
      loadAround(startIndex);

      flip = new PageFlip(el, {
        width: Math.max(300, Math.round((h ? (w / h) : 0.75) * 720)),
        height: 720,
        size: "stretch",
        // 200 لا 280 (٢٠٢٦-١١-١٦): بـ280 كانت الصفحةُ في الجوّال أطولَ ممّا بقي من الشاشة فنزل الشريطُ تحتها، وكان الكتابُ لا يُعرض صفحتين
        // إلّا في 560 (ضعفُ هذا الحدّ) فبقيت منضدةُ المحرّر في الحاسوب صفحةً واحدة
        minWidth: 200,
        maxWidth: 1600,
        // 200 لا 360 (المراجع ٢٠٢٦-١١-١٦): بـ360 لم يقصر الكتابُ عن 360 مهما قصرت الشاشة، فنزل الشريطُ تحتها في كلّ شاشةٍ دون 715 تقريبًا
        minHeight: 200,
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
      let at = toLogical(flip.getCurrentPageIndex());
      let land = flip.getOrientation() === "landscape";
      flip.on("flip", (e) => { const ei = Number(e.data); const lg = toLogical(ei); at = lg; setCurrent(lg); loadAround(ei); writeResume(resumeKey, lg); setResume(null); });
      // **من صفحتين إلى صفحةٍ يبقى على أُولاهما** (المراجع ٢٠٢٦-١١-١٦): كان المحرّكُ يبقى على مؤشّره، وهو في القراءة من اليمين الصفحةُ اليسرى،
      // فمن كان على «10-11» وضاقت شاشتُه صار على 11 وفاتته 10. فيُقلب إلى أُولى الصفحتين كما يقولها العدّاد
      flip.on("changeOrientation", (e) => {
        const toLand = e.data === "landscape";
        if (land && !toLand && count > 1) {
          const first = Math.max(0, at % 2 === 0 ? at - 1 : at);
          try { (flip as unknown as { turnToPage?: (i: number) => void } | null)?.turnToPage?.(rtl ? count - 1 - first : first); } catch { /* تجاهُل */ }
          at = first;
          setCurrent(first);
        }
        land = toLand;
        setSpread(toLand);
      });
      setSpread(flip.getOrientation() === "landscape");
      flipRef.current = flip;
      setTotal(count);
      setCurrent(toLogical(flip.getCurrentPageIndex()));
      setReady(true);
      // المتابعةُ تُعرض لمن عاد بلا رابطِ صفحة، وكان قد تجاوز الغلافَ ولم يبلغ الآخر
      const saved = initialPage || !offerResume ? null : readResume(resumeKey);
      if (saved && saved > 1 && saved < count - 1) setResume(saved);
    })();

    return () => {
      disposed = true;
      try { flip?.destroy(); } catch { /* تجاهُل */ }
      flipRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- الصفحةُ الأولى ومفتاحُ الحفظ يُقرآن عند البناء وحده
  }, [pages, rtl]);

  useEffect(() => { onPage?.(current); }, [current, onPage]);

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
    let raf = 0;
    const onResize = () => {
      setProbe(true);
      cancelAnimationFrame(raf);
      // إطاران: الأوّلُ يرسم الكتابَ بعرض صفحتين، والثاني يسأل المحرّكَ بعد أن يُقاس
      raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => { try { (flipRef.current as unknown as { update?: () => void } | null)?.update?.(); } catch { /* `update` في المحرّك ولا تذكره أنواعُه */ } setProbe(false); }); });
    };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(fullscreen === "page" ? !!document.fullscreenElement : document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [fullscreen]);

  // إبراز المصغّرة الحاليّة في العرض عند فتح الفهرس أو تغيّر الصفحة
  useEffect(() => {
    if (!showThumbs) return;
    thumbsRef.current?.querySelector<HTMLElement>(".book-thumb.on")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [showThumbs, current]);

  /** القسمُ الذي فيه القارئ: آخرُ قسمٍ بدأ عند صفحته أو قبلها */
  const tocAt = sections?.reduce<number>((at, sec, i) => (sec.page <= current ? i : at), -1) ?? -1;

  const tb = labelled ? "book-tb-act" : "ad-ibtn";
  const tip = (t: string) => (labelled ? undefined : t);
  const word = (t: string) => (labelled ? <span>{t}</span> : null);
  /* يُقرأ بعد البناء: الخادمُ لا يعرف الشاشة، والزرُّ يظهر أوّلًا ثمّ يختفي حيث لا يُتاح (آيفون) */
  const [canFs, setCanFs] = useState(true);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- قدرةُ المتصفّح تُقرأ بعد البناء
  useEffect(() => setCanFs(document.fullscreenEnabled !== false && !!document.documentElement.requestFullscreen), []);

  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else (fullscreen === "page" ? document.documentElement : rootRef.current)?.requestFullscreen?.();
  };

  return (
    <div ref={rootRef} className={cn("book-reader", className)}>
      <div className="book-reader-stage-wrap">
        {/* **الكتابُ المغلقُ في وسط المسرح** (صفحةُ الكتاب ٢٠٢٦-١١-١٦): في الصفحتين المتقابلتين يقعد الغلافُ وحده في نصفه والنصفُ الآخرُ
            فارغ، فيُزاح الإطارُ ربعَ عرضه نحو الوسط ما دام الكتابُ مغلقًا — على غلافه الأماميّ أو الخلفيّ — ويعود حين يُفتح */}
        <div className="book-flip-frame" data-portrait={ready && !spread && !probe ? "" : undefined} data-closed={spread && total > 1 ? (current === 0 ? "front" : current === total - 1 ? "back" : undefined) : undefined} data-rtl={rtl || undefined}>
          <div ref={stageRef} className="book-reader-stage" />
        </div>
        {!ready ? <div className="book-reader-loading">…يُفتح الكتاب</div> : null}
      </div>

      {resume != null ? (
        <div className="book-resume" role="status" dir="rtl">
          <span>توقّفتَ عند صفحة <b className="book-num">{resume + 1}</b></span>
          <button type="button" className="ad-btn ad-btn-soft ad-btn-sm" onClick={() => { jumpTo(resume); setResume(null); }}>تابع القراءة</button>
          <button type="button" className="ad-ibtn" aria-label="ابدأ من الغلاف" data-tip="ابدأ من الغلاف" onClick={() => setResume(null)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      ) : null}

      {panel === "toc" && sections && sections.length ? (
        <nav className="book-toc" aria-label="فهرس الكتيّب" dir="rtl">
          <ol>
            {sections.map((sec, i) => (
              <li key={`${sec.page}-${sec.title}`}>
                <button type="button" className="book-toc-item" aria-current={i === tocAt || undefined} onClick={() => { jumpTo(sec.page); if (labelled) setPanel(null); }}>
                  {/* **واختيارُ موضوعٍ يُغلق اللوحة** في الغرفة: جئتَ إليه لتقرأه لا لتبقى في الفهرس (محمد ٢٠٢٦-١١-١٦) */}
                  {/* في الشريط بالكلمات: مصغّرةُ الصفحة بجانب اسمها (اقتراحُ محمد ٢٠٢٦-١١-١٦) فيُعرف الموضوعُ بصورته قبل اسمه */}
                  {labelled && pages[sec.page] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- مصغّراتُ المخزن
                    <img className="book-toc-thumb" src={pages[sec.page].thumb ?? pages[sec.page].src} alt="" loading="lazy" />
                  ) : null}
                  <span>{sec.title}</span><b className="book-num">{sec.page + 1}</b>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {showThumbs && total > 0 ? (
        <div className="book-index" dir="rtl">
{labelled ? null : (
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
          )}
          <div className="book-thumbs" ref={thumbsRef}>
            {pages.map((p, i) => (
              <button
                key={i}
                type="button"
                className={"book-thumb" + (i === current ? " on" : "")}
                onClick={() => { jumpTo(i); if (labelled) setPanel(null); }}
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

      <div className="book-toolbar" dir="rtl" data-labelled={labelled || undefined}>
        <button type="button" className={tb} aria-label="الصفحة السابقة" data-tip={tip("الصفحة السابقة")} onClick={goBack} disabled={current <= 0}>
          <CaretRight />{word("السابقة")}
        </button>
        {/* في الصفحتين المتقابلتين يقول العدّادُ الصفحتين («12-13») لا إحداهما — كان يقول «13» والقارئُ فتح الفهرسَ على 12 */}
        <span className="book-counter">{total ? `${spread && current > 0 && current < total - 1 ? `${current % 2 === 0 ? current : current + 1}-${current % 2 === 0 ? current + 1 : current + 2}` : current + 1} / ${total}` : "—"}</span>
        <button type="button" className={tb} aria-label="الصفحة التالية" data-tip={tip("الصفحة التالية")} onClick={goForward} disabled={total > 0 && current >= total - 1}>
          <CaretLeft />{word("التالية")}
        </button>
        {labelled ? <span className="book-tb-sep" aria-hidden /> : null}
        {/* **فهرسٌ واحد في الشريط بالكلمات** (محمد ٢٠٢٦-١١-١٦): «الفهرس» و«الصفحات» كانا يؤدّيان الوظيفةَ نفسها — الوصولَ إلى مكانٍ في الكتاب.
            فالكتابُ ذو المواضيع يفتح مواضيعَه، والذي بلا مواضيع يفتح شبكةَ صفحاته كاملةً. وفي الشريط بالرموز يبقيان زرّين كما كانا */}
        {labelled ? (
          <button type="button" className={tb + (panel ? " book-tb-on" : "")} aria-label="الفهرس" aria-pressed={!!panel} onClick={() => setPanel((p) => (p ? null : sections && sections.length ? "toc" : "thumbs"))}>
            <List />{word("الفهرس")}
          </button>
        ) : (
          <>
            {sections && sections.length ? (
              <button type="button" className={tb + (panel === "toc" ? " book-tb-on" : "")} aria-label="الفهرس" aria-pressed={panel === "toc"} data-tip={tip("الفهرس")} onClick={() => setPanel((p) => (p === "toc" ? null : "toc"))}>
                <List />
              </button>
            ) : null}
            <button type="button" className={tb + (showThumbs ? " book-tb-on" : "")} aria-label="الصفحات" aria-pressed={showThumbs} data-tip={tip("الصفحات")} onClick={() => setPanel((p) => (p === "thumbs" ? null : "thumbs"))}>
              <Grid />
            </button>
          </>
        )}
        {/* ملءُ الشاشة حيث يُتاح وحده: آيفون لا يملأ الشاشةَ بعنصر، فكان الزرُّ فيه لا يفعل شيئًا */}
        {canFs ? (
          <button type="button" className={tb} data-fs aria-label={isFs ? "إنهاء ملء الشاشة" : "ملء الشاشة"} data-tip={tip(isFs ? "إنهاء ملء الشاشة" : "ملء الشاشة")} onClick={toggleFs}>
            {isFs ? <Compress /> : <Expand />}{word(isFs ? "تصغير" : "ملء الشاشة")}
          </button>
        ) : null}
        {tools ? <><span className="book-tb-sep" aria-hidden />{tools}</> : null}
      </div>
    </div>
  );
}
