"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { cn } from "../lib/cn";

/**
 * **شعرةُ الكتابة — حرفٌ طباعيٌّ مقوَّسُ التَّرويسة** (اختير من أربعة تصاميمَ في
 * ٢٠٢٦-٠٨-٠٤، وأُعدم سواها: الرفيعُ والثقيلُ والخطّيّ).
 *
 * ويُنحت **مسارًا واحدًا** لا يُركَّب من مستطيلات: التَّرويسةُ في الخطّ ليست شريطًا
 * موضوعًا فوق ساق، بل حدٌّ متّصلٌ يلتفّ حولهما — ولذلك وحدَه المسارُ يقدر على
 * القوس الذي يصل الساقَ بترويستها. والمرسمُ 12×34 والساقُ في منتصفه، فالمقاسُ
 * يأتي من `--nib` وحدَه ولا رقمَ هنا يخصّ البكسل.
 *
 * **الثخانةُ رُفعت** (بأمر المالك: «نحيفٌ جدًّا»، ٢٠٢٦-٠٨-٠٤): كانت الساقُ 2.2
 * وحدةً في مرسمٍ عرضُه 12، والعنصرُ عرضُه 8.8px — فالوحدةُ 0.73px والساقُ **1.6px**.
 * فصارت الساقُ 3.4 وحدات والتَّرويسةُ 2.6، ومعها ارتفاعُ العنصر 68% من `--nib` بدل
 * 62% (فيتّسع المرسمُ كلُّه) — فالساقُ **2.7px** والتَّرويسةُ 7.6px عرضًا.
 */
const CARET_D =
  "M1.25 0H10.75V2.6C8.8 2.6 7.7 3.5 7.7 5.6V28.4C7.7 30.5 8.8 31.4 10.75 31.4V34H1.25V31.4C3.2 31.4 4.3 30.5 4.3 28.4V5.6C4.3 3.5 3.2 2.6 1.25 2.6Z";

export interface CursorProps {
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
 * كان الأثرُ قطعًا مستقلّةً لكلّ واحدةٍ عرضُها وشفافيّتُها ونهايتان مدوّرتان، فظهرت
 * فيه **نقاطٌ**: عند البطء تكون القطعةُ أقصرَ من عرضها فتُرسم قرصًا لا خطًّا، وحيث
 * تلتقي قطعتان مختلفتا العرض تبرز الدائرةُ الأعرضُ من تحت الأضيق وتتراكب
 * شفافيّتاهما فتغمق العقدة.
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

/**
 * مؤشّرُ أديب — ريشةٌ في قطرةٍ لزجة، يخرج من سنّها أثرُ حبرٍ يجفّ.
 *
 * **اختير من ثلاثة عشر توجّهًا** جُرّبت في `/ui/cursor` (٢٠٢٦-٠٨-٠٣)، وأُعدم ما
 * سواه فلم يبقَ منه سطر. وما بقي: **هالةٌ لزجة** من التوجّه الرابع — تلحق المؤشّرَ
 * بتأخّر، وتتمطّط في اتّجاه الاندفاع وتنضغط عموديًّا عليه فيثبت حجمُها كالسائل —
 * تحفّ **ريشةً** طرفُها نقطةُ الفأرة. واللزوجةُ صفةُ الهالة نفسِها، لا قطرةٌ تُضاف
 * في مركزها.
 *
 * **النغمة تُقرأ ولا تُخترع:** يأخذها المؤشّر من `--shadow-tone` الذي يعلنه العنصر
 * نفسه (ق٥)، فيحمرّ فوق «حذف» بلا أن يعرف أنّه حذف.
 *
 * **ولا ميلَ للريشة:** جُرّب فكان يهتزّ، وثلاثُ معالجاتٍ للحساب لم تُجدِ حتى أُطفئ
 * الميلُ نفسُه فسكنت. لا تُعِده إلّا ببناءٍ مختلفٍ كلّيًّا.
 *
 * ثلاثةُ حرّاس: الفأرةُ وحدها (`pointer: fine`)، وتقليلُ الحركة يُلغي التأخّر
 * والتمطّط والأثر، ودلالةُ النظام تبقى (كتابةٌ في الحقول · ممنوعٌ على المعطّل).
 * الأنماط في components.css تحت البادئة `.cur`.
 */
export function Cursor({ scopeRef, className }: CursorProps) {
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
    let tx = 0, ty = 0, hx = 0, hy = 0, px = 0, py = 0, vx = 0, vy = 0, sx = 0, sy = 0;
    let raf = 0, seen = false;
    // مقاسُ الضغط وهدفُه وسرعتُه — يُضرَب في مقاس الهالة الجاري فيتراكب مع اللزوجة
    let pk = 1, pkT = 1, pkv = 0;
    let lastHot: Element | null = null;
    const pts: { x: number; y: number; t: number }[] = [];

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
    };

    const move = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY;
      // كلُّ متتبّعٍ يبدأ من موضع الدخول لا من الصفر، وإلّا انطلق نحو المؤشّر عبر الشاشة
      // كلُّ متتبّعٍ يبدأ من موضع الدخول لا من الصفر، وإلّا انطلق نحو المؤشّر عبر الشاشة
      if (!seen) {
        hx = tx; hy = ty; px = tx; py = ty; sx = tx; sy = ty;
        seen = true; root.dataset.on = "true";
      }
      // الطبقةُ `pointer-events: none` فالهدفُ هو العنصرُ الحقيقيّ تحتها.
      const hot = (e.target as Element | null)?.closest?.(HOT) ?? null;
      // `getComputedStyle` عند **تبدّل** الهدف لا عند كلّ حركة.
      if (hot !== lastHot) { lastHot = hot; apply(hot); }
    };

    const leave = () => { root.dataset.on = "false"; seen = false; lastHot = null; pts.length = 0; apply(null); };

    /* **النقرُ تفاعلُ الهالة نفسِها — لا عنصرَ يُولَد عندها** (قرار المالك: أُزيلت
       نقطةُ الحبر): تنكمش الهالةُ تحت الضغط ثمّ **تتفتّح** عند الرفع فترتدّ إلى
       مقاسها. ومقدارُ الانكماش/التفتّح رمزٌ واحد (`--pk`) **يُضرَب** في مقاسها
       الجاري، فلا ينازع اللزوجةَ ولا يُلغيها: الاثنان يتراكبان في مقاسٍ واحد.
       وحركتُه في المحرّك لا في `transition` — لأنّ المقاس يُكتَب كلَّ إطار،
       فانتقالُ CSS يلاحق هدفًا متبدّلًا ويبتلع الذروة (كما وقع في اللزوجة). */
    const down = () => { root.dataset.press = "true"; pkT = 0.72; };
    // الرفعُ يُلتقط من النافذة لا من المضيف: قد تُرفع الفأرةُ خارجه فتبقى الهالةُ صغيرة
    const up = () => {
      root.dataset.press = "false";
      pkT = 1;
      /* **الرجوعُ بقوّةٍ لا بنعومة** (طلب المالك): دفعةٌ تُضاف إلى سرعة المقاس لحظةَ
         الرفع — كمن يُفلت زنبركًا مشدودًا. والنابضُ يحملها فيتجاوز الواحد ثمّ يرتدّ
         مرّةً أو مرّتين ويسكن. (والنابضُ هنا **لقطةٌ واحدةٌ لا قيادةٌ مستمرّة**،
         فرنينُه مطلوبٌ ومحدود — بخلاف ميل الريشة الذي كان يُقاد كلَّ إطارٍ فيرنّ
         بلا انقطاع، وذاك ما أُعدم.) */
      if (!reduce) pkv += 0.14;
    };

    const frame = () => {
      const now = performance.now();
      // الهالةُ تلحق النقطةَ ولا تلتصق بها (lerp) — وعند تقليل الحركة تلتصق.
      const k = reduce ? 1 : 0.18;
      hx += (tx - hx) * k; hy += (ty - hy) * k;
      root.style.setProperty("--cx", `${tx}px`);
      root.style.setProperty("--cy", `${ty}px`);
      root.style.setProperty("--hx", `${hx}px`);
      root.style.setProperty("--hy", `${hy}px`);
      /* مقاسُ الضغط نابضٌ **لقطةٌ واحدة**: يُشدّ نحو هدفه وتُخمَد سرعتُه، فيتجاوز
         الواحدَ عند الرفع ويرتدّ. تخميدُه ‎≈0.32 — أيْ ارتدادتان تُحسّان ثمّ سكون.
         وعند تقليل الحركة يُسنَد الهدفُ فورًا بلا سرعةٍ ولا تجاوز. */
      if (reduce) { pk = pkT; pkv = 0; }
      else { pkv += (pkT - pk) * 0.35; pkv *= 0.62; pk += pkv; }
      root.style.setProperty("--pk", pk.toFixed(3));

      if (!reduce) {
        // سرعةٌ ممهَّدة (لا خامّ) — الخامُّ يرتجف بكلّ إطارٍ فيرتجف الشكلُ معه
        vx += ((tx - px) - vx) * 0.25; vy += ((ty - py) - vy) * 0.25;
        px = tx; py = ty;
        /* تمطّطٌ في اتّجاه الحركة وانضغاطٌ عموديٌّ عليه — حجمُ السائل ثابت.
           **والاستجابةُ ضُوعفت** (بأمر المالك: «أين اللزوجة؟»): كانت `sp/90` بسقف
           0.6، وهي معايرةٌ وُضعت حين كانت **قطرةٌ مصمتة** تحمل اللزوجة — والكتلةُ
           المصمتة تُظهر استطالتَها بأدنى نسبة. أمّا الحلقةُ الرفيعة فتمطّطُها
           بنسبة 1.15 يزيد قطرَها خمسةَ بكسلات لا تكاد تُلمح. فصارت `sp/45` بسقف
           0.9، ثمّ إلى `sp/28` بسقف 1.3 (بأمره: «أوضح») — فالحركةُ المعتادة تُطيلها
           النصفَ والاندفاعةُ تزيد على الضِّعف. */
        const s = Math.min(Math.hypot(vx, vy) / 28, 1.3);
        root.style.setProperty("--ang", `${(Math.atan2(vy, vx) * 180) / Math.PI}deg`);
        root.style.setProperty("--stretch", `${1 + s}`);
        // والانضغاطُ يقابله: 0.6 لا 0.55 — كلّما زاد الطولُ نحف العرضُ أكثر
        root.style.setProperty("--squash", `${Math.max(0.25, 1 - s * 0.6)}`);

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
        // سِمةٌ واحدة تُكتب في الإطار — الشكلُ كلُّه في مسارٍ واحد
        if (pathRef.current) pathRef.current.setAttribute("d", ribbon(pts));
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    src.addEventListener("pointermove", move as EventListener);
    src.addEventListener("pointerdown", down as EventListener);
    window.addEventListener("pointerup", up);
    host.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);

    return () => {
      cancelAnimationFrame(raf);
      src.removeEventListener("pointermove", move as EventListener);
      src.removeEventListener("pointerdown", down as EventListener);
      window.removeEventListener("pointerup", up);
      host.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      host.classList.remove("cur-host");
    };
  }, [ready, scopeRef]);

  if (!ready) return null;

  return (
    <div ref={rootRef} className={cn("cur", className)} data-on="false" data-mode="idle" aria-hidden>
      {/* الأثرُ **قبل** السنّ في الترتيب: الطبقاتُ بلا `z-index` فالمتأخّرُ يعلو —
          ولو تأخّر الأثرُ لغطّى رأسُه العريضُ السنَّ الذي يخرج منه. */}
      <svg className="cur-trail">
        <path ref={pathRef} />
      </svg>

      {/* الغلافُ يحمل الموضعَ والمقاس، والريشةُ تحمل الرسم. (بُني للدوران ثمّ أُوقف
          الدورانُ نهائيًّا — انظر كتلةَ `.cur-pen` في components.css؛ وبقي الغلافُ
          لأنّه يحمل مقاسَ `--nib` ونقطةَ أصله ويضمن طبقةً واحدةً للانتقال.) */}
      <span className="cur-pen">
      <svg className="cur-nib" viewBox="0 0 28 28">
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
      </span>

      {/* **الهالةُ نفسُها لزجة** — لا قطرةَ في مركزها: الريشةُ هي ما تحفّه (قرار
          المالك صراحةً). واللزوجةُ صفةُ الهالة لا عنصرٌ يُضاف بجانبها. */}
      <span className="cur-halo" />

      {/* **شعرةُ الكتابة من الهوية لا من النظام:** فوق الحقول تنسحب الريشةُ وهالتُها
          وتحلّ محلَّهما هذه — فلا يبقى في الموقع شكلُ مؤشّرٍ يرسمه النظام. */}
      <svg className="cur-caret" viewBox="0 0 12 34">
        <path d={CARET_D} />
      </svg>
    </div>
  );
}
