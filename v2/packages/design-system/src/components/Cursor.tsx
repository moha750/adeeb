"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { cn } from "../lib/cn";

/**
 * التوجّهات — أسرتان وطليقون، لا قائمةٌ مسطّحة:
 * **قارئ النغمة** (`tone`) وأبناؤه: `morph` · `brackets` · `liquid` (ومنه
 * `nibdrop`: القطرةُ بعينها والريشةُ مكانَ نقطتها، بطلب المالك).
 * **الريشة** (`quill`) وأبناؤها: `tilt` · `trail` · `blot`.
 * و**من خارجهما** (٢٠٢٦-٠٨-٠٣): `dots` (نقطةُ الإعجام) · `kashida` (الكشيدة) ·
 * `invert` (القرصُ القالب) · `magnet` (الانجذاب) · `ruler` (مسطرةُ القراءة).
 * (أُعدمت ثلاثةٌ لم تُقرّ: السهم المعكوس · المؤشّر يتكلّم · كشّاف النقش.)
 */
export type CursorVariant =
  | "tone" | "morph" | "brackets" | "liquid" | "nibdrop"
  | "quill" | "tilt" | "trail" | "blot"
  | "dots" | "kashida" | "invert" | "magnet" | "ruler";

export interface CursorProps {
  /** التوجّه المعروض. */
  variant?: CursorVariant;
  /**
   * حصرُ المؤشّر في مسرحٍ واحد (المعرض): يُخفى خارجه، ويُخفى مؤشّرُ النظام داخله
   * وحده. بلا هذا يعمّ الصفحة كلَّها.
   */
  scopeRef?: RefObject<HTMLElement | null>;
  className?: string;
}

/* ما يُعدّ «هدفًا» — ما تحته يدٌ أو كتابة. `[data-cursor]` مِقبضٌ يُدخل عنصرًا غير
   تفاعليٍّ في حساب المؤشّر (غلافُ كتابٍ مثلًا) دون أن يصير زرًّا. */
const HOT =
  "a,button,[role='button'],summary,select,input,textarea,[contenteditable='true'],[data-cursor]";
const TEXT = "input:not([type='button']):not([type='checkbox']):not([type='radio']),textarea,[contenteditable='true']";

/** نقاطُ أثر الحبر وعمرُها وأعرضُ ما يبلغه عند الرأس (يتناقص إلى صفرٍ عند الذيل). */
const TRAIL = 28;
const TRAIL_MS = 300;
const TRAIL_W = 5.2;

/**
 * شريطُ الحبر: **شكلٌ مملوءٌ واحد** لا قطعٌ مرصوفة.
 *
 * كان الأثرُ ١٦ قطعةً مستقلّة لكلّ واحدةٍ عرضُها وشفافيّتُها ونهايتان مدوّرتان،
 * فظهرت فيه **نقاطٌ** (رآها المالك): عند البطء تكون القطعةُ أقصرَ من عرضها فتُرسم
 * قرصًا لا خطًّا، وحيث تلتقي قطعتان مختلفتا العرض تبرز الدائرةُ الأعرضُ من تحت
 * الأضيق وتتراكب شفافيّتاهما فتغمق العقدة.
 *
 * والعلاجُ ليس تنعيمَ القطع بل إلغاؤها: تُحسب حافّتان (يمنى ويسرى) بإزاحة كلّ نقطةٍ
 * على **عمود اتّجاهها** بنصف العرض، ثمّ يُغلق الشكل ويُملأ مرّةً واحدة — فلا نهاياتٍ
 * ولا تراكبَ ولا حدود. والحافّتان تُرسمان بمنحنياتٍ تربيعيّة عبر منتصفات الأضلاع،
 * فالمسارُ يمرّ ناعمًا بلا زوايا. والعرضُ يتناقص إلى **الصفر** عند الذيل، فيُقرأ
 * رفعَ قلمٍ لا انقطاعَ خطّ — وهو ما يُغني عن تدرّج الشفافيّة أصلًا.
 */
function ribbon(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n < 3) return "";
  const L: { x: number; y: number }[] = [], R: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const f = i / (n - 1);            // 0 = الذيلُ الأقدم · 1 = الرأسُ تحت السنّ
    const w = (TRAIL_W * f * f) / 2;  // تربيعيٌّ لا خطّيّ: الرهافةُ تتركّز في الذيل
    L.push({ x: p.x - dy * w, y: p.y + dx * w });
    R.push({ x: p.x + dy * w, y: p.y - dx * w });
  }
  const curve = (s: { x: number; y: number }[], head: string) => {
    let d = `${head}${s[0].x.toFixed(1)} ${s[0].y.toFixed(1)}`;
    for (let i = 1; i < s.length - 1; i++) {
      const mx = (s[i].x + s[i + 1].x) / 2, my = (s[i].y + s[i + 1].y) / 2;
      d += `Q${s[i].x.toFixed(1)} ${s[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const e = s[s.length - 1];
    return `${d}L${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  };
  // الذهابُ على الحافّة اليسرى إلى الرأس، والعودةُ على اليمنى إلى الذيل، ثمّ إغلاق
  return `${curve(L, "M")} ${curve(R.reverse(), "L")}Z`;
}

/** الأسرتان — يُشتقّ منهما ما يُرسَم، فلا شرطٌ يُكرّر في كلّ سطر. */
const NIB = new Set<CursorVariant>(["quill", "tilt", "trail", "blot", "nibdrop"]);
/** ما يحتاج مستطيلَ الهدف: يلبسه (`morph`) أو يلتقطه (`brackets`) أو يسطّر تحته (`kashida`). */
const BOX = new Set<CursorVariant>(["morph", "brackets", "kashida"]);

/**
 * مؤشّرُ أديب — طبقةٌ واحدة تتبع الفأرة، ومحرّكٌ واحد لكلّ التوجّهات:
 * إحداثيّتان (`--cx/--cy`) للنقطة، ومتأخّرتان (`--hx/--hy`) للهالة، وحالةٌ
 * (`data-mode`) تقول ما تحت المؤشّر. ويزيد بحسب التوجّه: سرعةٌ متجهة
 * (`--ang/--stretch/--squash/--tilt`)، ومستطيلُ الهدف (`--mx/--my/--mw/--mh/--mr`)،
 * ومخزنُ نقاطٍ لأثر الحبر — **ولا يُحسَب إلّا ما يطلبه التوجّه المعروض**.
 *
 * **النغمة تُقرأ ولا تُخترع**: يأخذها المؤشّر من `--shadow-tone` الذي يعلنه العنصر
 * نفسه (ق٥)، فيحمرّ فوق «حذف» بلا أن يعرف أنّه حذف. الأنماط في components.css
 * تحت البادئة `.cur`.
 *
 * ثلاثةُ حرّاس: الفأرةُ وحدها (`pointer: fine`)، وتقليلُ الحركة يُلغي التأخّر
 * والحبر والتمطّط، ودلالةُ النظام تبقى (كتابةٌ في الحقول · ممنوعٌ على المعطّل).
 */
export function Cursor({ variant = "tone", scopeRef, className }: CursorProps) {
  const uid = useId().replace(/:/g, "");
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  // اللمسُ والقلم لا مؤشّر لهما: لا طبقةَ تُرسَم ولا مستمعَ يُركَّب أصلًا.
  // ويُؤجَّل إلى ما بعد التركيب فلا يختلف خادمٌ عن عميل (hydration).
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) setReady(true);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!ready || !root) return;
    const host = scopeRef?.current ?? document.documentElement;
    const src: HTMLElement | Document = scopeRef?.current ?? document;
    host.classList.add("cur-host");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wantsBox = BOX.has(variant);
    const wantsVel = (variant === "liquid" || variant === "nibdrop" || variant === "tilt") && !reduce;
    const wantsTrail = (variant === "trail" || variant === "nibdrop") && !reduce;
    const wantsMag = variant === "magnet" && !reduce;

    let tx = 0, ty = 0, hx = 0, hy = 0, px = 0, py = 0, vx = 0, vy = 0, sx = 0, sy = 0;
    // زاويةُ الريشة وسرعتُها الزاويّة — نابضٌ لا قيمةٌ تُسنَد (انظر كتلةَ الميل)
    let ta = 0, tv = 0, resting = false, idle = 0, lastT = 0;
    let raf = 0, seen = false;
    let lastHot: Element | null = null;
    const pts: { x: number; y: number; t: number }[] = [];
    /* مراكزُ الأهداف للانجذاب — تُمسَح **مرّةً عند الدخول وعند التمرير**، لا كلَّ
       إطار: الجذبُ يحتاج معرفةَ ما حولَ المؤشّر قبل بلوغه، وذلك لا يُعرَف من
       `e.target` (وهو لا يقول إلّا ما تحته الآن). */
    let cands: { x: number; y: number }[] = [];
    const survey = () => {
      if (!wantsMag) return;
      cands = Array.from((scopeRef?.current ?? document).querySelectorAll(HOT)).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    };

    /* مستطيلُ الهدف: يُقاس عند تبدّله وعند التمرير — لا في كلّ إطار. قياسُ
       `getBoundingClientRect` كلَّ إطارٍ يُجبر المتصفّح على إعادة تخطيطٍ ستّين
       مرّةً في الثانية، وهو ثمنٌ لا يشتريه شيء (الهدفُ ساكنٌ ما لم يُمرَّر). */
    const measure = (el: Element | null) => {
      if (!wantsBox || !el) return;
      const r = el.getBoundingClientRect();
      const br = getComputedStyle(el).borderRadius;
      root.style.setProperty("--mx", `${r.left + r.width / 2}px`);
      root.style.setProperty("--my", `${r.top + r.height / 2}px`);
      root.style.setProperty("--mw", `${r.width}px`);
      root.style.setProperty("--mh", `${r.height}px`);
      /* الزاويةُ زاويةُ الهدف نفسِه (ق٢) — والدائريُّ يبقى دائريًّا، والحادُّ يأخذ الصغرى.
         **والقيمةُ المركّبة تُرفض**: زاويةٌ بأربع قيمٍ أو بشرطةٍ إهليلجيّة تدخل في
         `calc` فتُفسده، والقيمةُ المخصّصة الفاسدة تُسقط `border-radius` إلى الصفر —
         فتنقلب الحلقةُ مربّعًا حادًّا صامتًا. فلا يُقبل إلّا مقياسٌ واحد. */
      const one = br && br !== "0px" && !br.includes(" ") && !br.includes("/");
      root.style.setProperty("--mr", one ? br : "var(--radius-sm)");
    };

    const apply = (hot: Element | null) => {
      const mode = !hot
        ? "idle"
        : hot.matches("[disabled],[aria-disabled='true']")
          ? "off"
          : hot.matches(TEXT)
            ? "text"
            : "hot";
      root.dataset.mode = mode;
      // النغمة من العنصر: `--shadow-tone` معرَّفٌ على `*` فلكلّ عنصرٍ قيمةٌ محسوبة.
      // والقيمةُ الفارغة تُزيل السطر فيرتدّ المؤشّر إلى نغمة العلامة تلقائيًّا.
      root.style.setProperty(
        "--shadow-tone",
        hot && mode !== "off" ? getComputedStyle(hot).getPropertyValue("--shadow-tone").trim() : "",
      );
      if (mode === "hot") measure(hot);
    };

    const move = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { hx = tx; hy = ty; px = tx; py = ty; sx = tx; sy = ty; seen = true; root.dataset.on = "true"; survey(); }
      // الطبقةُ `pointer-events: none` فالهدفُ هو العنصرُ الحقيقيّ تحتها.
      const hot = (e.target as Element | null)?.closest?.(HOT) ?? null;
      // `getComputedStyle` عند **تبدّل** الهدف لا عند كلّ حركة.
      if (hot !== lastHot) { lastHot = hot; apply(hot); }
    };

    const leave = () => {
      root.dataset.on = "false"; seen = false; lastHot = null; pts.length = 0;
      // الريحُ تبدأ من جديدٍ عند العودة: لا تُستأنَف من هبّةٍ توقّفت خلف الستار
      idle = 0; lastT = 0; ta = 0; tv = 0;
      apply(null);
    };
    const scrolled = () => { if (root.dataset.mode === "hot") measure(lastHot); survey(); };

    /* نقطةُ حبرٍ عند الضغط: قرصٌ نظيف في «الريشة»، وبقعةٌ عضويّةٌ في «النشّاف» —
       زوايا غير منتظمة ورشقاتٌ حولها، تُولَد بالضغط وتموت بانتهاء حركتها. */
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const drop = (x: number, y: number, cls: string, delay = 0, size = 1) => {
      const d = document.createElement("span");
      d.className = cls;
      d.style.setProperty("--cx", `${x}px`);
      d.style.setProperty("--cy", `${y}px`);
      d.style.setProperty("--k", `${size}`);
      if (delay) d.style.animationDelay = `${delay}ms`;
      if (cls === "cur-blot") {
        // زوايا غير متساوية = حافّةٌ لا تُقرأ دائرة؛ عشوائيّةُ كلّ بقعةٍ تمنع التكرار
        d.style.borderRadius = `${rnd(42, 62)}% ${rnd(38, 58)}% ${rnd(44, 64)}% ${rnd(40, 60)}% / ${rnd(40, 60)}% ${rnd(44, 64)}% ${rnd(38, 58)}% ${rnd(42, 62)}%`;
      }
      d.addEventListener("animationend", () => d.remove());
      root.appendChild(d);
    };

    const ink = (e: PointerEvent) => {
      if (reduce) return;
      if (variant === "quill" || variant === "tilt" || variant === "trail") {
        drop(e.clientX, e.clientY, "cur-ink");
      } else if (variant === "blot") {
        drop(e.clientX, e.clientY, "cur-blot", 0, 1);
        // رشقاتٌ حول البقعة — عددٌ فرديّ صغير فلا تُقرأ حلقةً منتظمة
        for (let i = 0; i < 3; i++) {
          drop(e.clientX + rnd(-26, 26), e.clientY + rnd(-26, 26), "cur-blot", rnd(20, 90), rnd(0.18, 0.4));
        }
      }
    };

    const frame = () => {
      const now = performance.now();
      /* الانجذاب: المؤشّرُ يُشدّ نحو أقرب هدفٍ **قبل بلوغه** — بقوّةٍ تشتدّ كلّما
         قرُب، وتنتهي عند 45% من المسافة فلا يفارق يدَ صاحبه. والنقرةُ تقع حيث
         الفأرةُ حقًّا لا حيث رُسم المؤشّر: الطبقةُ لا تُنقر أصلًا، فالجذبُ بصريٌّ
         محضٌ لا يخطف هدفًا لم يُقصَد. */
      let gx = tx, gy = ty;
      if (wantsMag && seen) {
        let best = 1e9, bx = 0, by = 0;
        for (const c of cands) {
          const d = Math.hypot(c.x - tx, c.y - ty);
          if (d < best) { best = d; bx = c.x; by = c.y; }
        }
        if (best < 130) {
          const pull = (1 - best / 130) * 0.45;
          gx = tx + (bx - tx) * pull; gy = ty + (by - ty) * pull;
        }
      }
      // الهالةُ تلحق النقطةَ ولا تلتصق بها (lerp) — وعند تقليل الحركة تلتصق.
      const k = reduce ? 1 : 0.18;
      hx += (gx - hx) * k; hy += (gy - hy) * k;
      root.style.setProperty("--cx", `${gx}px`);
      root.style.setProperty("--cy", `${gy}px`);
      root.style.setProperty("--hx", `${hx}px`);
      root.style.setProperty("--hy", `${hy}px`);

      // `seen` شرطٌ لازم: الريحُ حركةٌ دائمةٌ لا تنتهي، فلا تُحسَب لطبقةٍ مخفيّة
      if (wantsVel && seen) {
        // سرعةٌ ممهَّدة (لا خامّ) — الخامُّ يرتجف بكلّ إطارٍ فيرتجف الشكلُ معه
        vx += ((tx - px) - vx) * 0.25; vy += ((ty - py) - vy) * 0.25;
        px = tx; py = ty;
        const sp = Math.hypot(vx, vy);
        /* الشرطان **مستقلّان لا متبادلان**: `nibdrop` يقرأ السرعةَ قراءتَين معًا —
           تمطّطًا في هالته وميلًا في ريشته — فمن حسابٍ واحدٍ أثران. */
        if (variant === "liquid" || variant === "nibdrop") {
          // تمطّطٌ في اتّجاه الحركة وانضغاطٌ عموديٌّ عليه — حجمُ القطرة ثابتٌ كالسائل
          const s = Math.min(sp / 90, 0.6);
          root.style.setProperty("--ang", `${(Math.atan2(vy, vx) * 180) / Math.PI}deg`);
          root.style.setProperty("--stretch", `${1 + s}`);
          root.style.setProperty("--squash", `${1 - s * 0.55}`);
        }
        if (variant === "tilt" || variant === "nibdrop") {
          /* **الميلُ نابضٌ مُخمَّد لا قيمةٌ تُسنَد.** كان الميلُ يساوي السرعةَ لحظةً
             بلحظة، فللريشة عيبان عند الوقوف: تعود إلى وقفتها **انزلاقًا آليًّا**
             لا كجسمٍ له ثِقَل، و**لا تسكن أبدًا** — إذ تبقى للسرعة بقيّةٌ تتضاءل
             ولا تبلغ الصفر، فترتجف الريشةُ واقفةً بأجزاء الدرجة.
             فصار للزاوية **سرعتُها الخاصّة**: تُشدّ نحو ما تطلبه اليد ويُخمَد
             اندفاعُها، فترتدّ متمايلةً ثمّ تستقرّ — وهذه حركةُ جسمٍ حقيقيّ. */
          /* **الوقوفُ ليس تجمّدًا — ريشةٌ تلاعبها الريح** (طلب المالك ٢٠٢٦-٠٨-٠٣):
             حين تسكن اليدُ يتحوّل هدفُ النابض من السرعة إلى **دالّة ريح**، فيبقى
             النابضُ هو المحرّكَ الوحيد ولا تُضاف حركةٌ ثانيةٌ فوق الأولى — ولذلك
             ينساب الانتقالُ بين الحالين بلا قفزة.
             والريحُ ثلاثُ موجاتٍ بترددٍ غير متناسب (0.9 · 2.3 · 0.41) فلا تعود
             الدورةُ إلى أوّلها فتُكشَف؛ ومضروبةٌ في **غلافِ هبّة** أبطأَ منها
             (0.37) فتشتدّ وتخفت كما تفعل الريح. والعتبةُ ذاتُ حدَّين (0.12 دخولًا
             و0.5 خروجًا) فلا تتذبذب الحالُ عند الحافّة.
             و**تُستأنَف تدريجًا** (`idle` يتصاعد في 0.8 ثانية): الريشةُ تستقرّ أوّلًا
             ثمّ تأخذها الريح — لا تُنفَخ فيها لحظةَ توقّف اليد. */
          const moving = sp > (resting ? 0.5 : 0.12);
          const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0;
          lastT = now;
          let want: number;
          if (moving) {
            resting = false; idle = 0;
            want = Math.max(-20, Math.min(20, vx * -1.4));
          } else {
            resting = true;
            idle = Math.min(idle + dt, 1);
            const T = now / 1000;
            const gust = 0.55 + 0.45 * Math.sin(T * 0.37 + 1.3);
            want = (Math.sin(T * 0.9) * 3.2 + Math.sin(T * 2.3 + 2.1) * 1.1 + Math.sin(T * 0.41) * 1.6)
              * gust * Math.min(idle / 0.8, 1);
          }
          tv += (want - ta) * 0.22; tv *= 0.78; ta += tv;
          root.style.setProperty("--tilt", `${ta.toFixed(2)}deg`);
          // والضغطُ من اليد وحدها: الريحُ تُميل ولا تَضغط
          root.style.setProperty("--press", `${(moving ? 1 + Math.min(sp / 260, 0.14) : 1).toFixed(3)}`);
        }
      }

      if (wantsTrail) {
        /* **ما يُسجَّل ليس الفأرةَ بل يدًا تلاحقها:** موضعُ الفأرة يقفز بين إطارٍ
           وإطار (رعشةُ اليد ودقّةُ الجهاز)، فالمسارُ المبنيّ عليه مضلَّعٌ مكسور
           مهما نُعّم رسمُه. فتُسجَّل نقطةٌ ملاحِقةٌ تلحق الفأرةَ بنصف المسافة كلَّ
           إطار — مرشِّحٌ يمتصّ الرعشة ولا يُلمَس تأخّرُه (إطارٌ واحد). */
        sx += (tx - sx) * 0.5; sy += (ty - sy) * 0.5;
        // نقطةٌ تُسجَّل عند الحركة وحدها — السكونُ لا يكتب، وإلّا تجمّع الحبرُ بقعةً
        const last = pts[pts.length - 1];
        if (!last || Math.hypot(sx - last.x, sy - last.y) > 2.2) pts.push({ x: sx, y: sy, t: now });
        while (pts.length && now - pts[0].t > TRAIL_MS) pts.shift();
        while (pts.length > TRAIL) pts.shift();
        // سِمةٌ واحدة تُكتب في الإطار بدل ٤٨ — الشكلُ كلُّه في مسارٍ واحد
        if (pathRef.current) pathRef.current.setAttribute("d", ribbon(pts));
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    src.addEventListener("pointermove", move as EventListener);
    src.addEventListener("pointerdown", ink as EventListener);
    host.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    // التمريرُ يزحزح ما قيس: المستطيلُ الملبوس ومراكزُ الانجذاب معًا تُعاد قراءتُها
    if (wantsBox || wantsMag) window.addEventListener("scroll", scrolled, true);
    if (wantsMag) window.addEventListener("resize", survey);

    return () => {
      cancelAnimationFrame(raf);
      src.removeEventListener("pointermove", move as EventListener);
      src.removeEventListener("pointerdown", ink as EventListener);
      host.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      if (wantsBox || wantsMag) window.removeEventListener("scroll", scrolled, true);
      if (wantsMag) window.removeEventListener("resize", survey);
      host.classList.remove("cur-host");
      root.querySelectorAll(".cur-ink, .cur-blot").forEach((n) => n.remove());
    };
  }, [ready, variant, scopeRef]);

  if (!ready) return null;

  return (
    <div ref={rootRef} className={cn("cur", `cur-${variant}`, className)} data-on="false" data-mode="idle" aria-hidden>
      {/* الأثرُ **قبل** السنّ في الترتيب: الطبقتان بلا `z-index` فالمتأخّرُ يعلو —
          ولو تأخّر الأثرُ لغطّى رأسُه العريضُ السنَّ الذي يخرج منه. */}
      {(variant === "trail" || variant === "nibdrop") && (
        <svg className="cur-trail">
          <path ref={pathRef} />
        </svg>
      )}

      {NIB.has(variant) && (
        <svg className="cur-nib" viewBox="0 0 28 28" width="28" height="28">
          <defs>
            <linearGradient id={`cur-q-${uid}`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="var(--navy-800)" />
              <stop offset="1" stopColor="var(--steel-400)" />
            </linearGradient>
          </defs>
          {/* سنُّ الريشة: طرفُها عند (2,26) هو نقطةُ الإصابة، وجسمُها يمتدّ لأعلى اليمين */}
          <path
            d="M2 26 C4.4 18.4 7.6 12.4 12 7.8 C15 4.7 18.4 2.8 22.2 2 C21.4 5.8 19.5 9.2 16.4 12.2 C11.8 16.6 9 19.6 2 26 Z"
            fill={`url(#cur-q-${uid})`}
          />
          <path className="cur-rib" d="M2 26 C8 19.6 12 15.4 16.4 12.2" />
        </svg>
      )}

      {/* نقطةُ الإعجام: واحدةٌ في السكون، فإذا وقعت على هدفٍ صارت ثلاثًا — كما
          تفترق الباءُ عن الثاء بالنقط لا بالرسم. */}
      {variant === "dots" && (
        <span className="cur-nuqat">
          <i /><i /><i />
        </span>
      )}

      {/* الكشيدة: مدّةٌ تنزلق تحت الكلام، فإذا بلغت هدفًا امتدّت بعرضه تحته */}
      {variant === "kashida" && <span className="cur-kash" />}

      {/* القرصُ القالب: لا لونَ له — يقلب ما تحته (مزجٌ لا طلاء) */}
      {variant === "invert" && <span className="cur-disc" />}

      {/* مسطرةُ القراءة: شريطٌ يلزم سطرَك عبر الصفحة كلّها */}
      {variant === "ruler" && <span className="cur-band" />}

      {variant === "morph" && <span className="cur-box" />}
      {variant === "brackets" && (
        <span className="cur-box cur-brk">
          <i /><i /><i /><i />
        </span>
      )}

      {(variant === "tone" || variant === "liquid" || variant === "morph" || variant === "brackets"
        || variant === "magnet" || variant === "ruler") && <span className="cur-dot" />}
      {/* **الانجذابُ لا سطرَ تنسيقٍ له:** نقطةُ الأساس وهالتُه بعينهما — والفرقُ كلُّه
          في **أين** يكتب المحرّكُ إحداثيّتَهما. سلوكٌ محضٌ لا شكلٌ جديد. */}
      {/* و`nibdrop` هالةُ القطرة بعينها — بلا نقطةٍ في مركزها، فالريشةُ هي المركز */}
      {(variant === "tone" || variant === "liquid" || variant === "magnet" || variant === "nibdrop") && (
        <span className="cur-halo" />
      )}
    </div>
  );
}
