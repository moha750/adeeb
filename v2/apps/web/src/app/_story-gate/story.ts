/* ============================================================
   قصة أديب الافتتاحية — منطق الحركة كاملًا (GSAP + ScrollTrigger + Lenis)
   كل مشهد أساسيّ pinned + scrubbed؛ الاستثناءان الوحيدان one-shots
   موصوفان في موضعيهما: نبضة التتويج عند 55%، ودخول السطر الأول عند
   التحميل (كي لا تُفتح الشاشة الأولى فارغة — التمرير يملك كل ما بعده).
   ============================================================ */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { DUST_SEEDS, fmtDigits, GATE_FRAMES, SESSION_KEY, STORY_ASSETS, STORY_CONFIG, TIME_MONTHS } from "./config";

gsap.registerPlugin(ScrollTrigger, SplitText);

/* لوحات الفصول — مشتقّة من ألوان الشعار القديم الحقيقية (حبر كحليّ قديم + ذهب + ورق عتيق)،
   ولوحة الفصل الرابع تُقرأ من رموز هوية الموقع وقتَ التهيئة (استثناء التسليم المقصود) */
const PALETTES = {
  ch1: { bg: "#101c27", ink: "#e9dfc9", accent: "#ffc60a" },
  ch2: { bg: "#24455e", ink: "#f2ecd9", accent: "#ffc60a" },
  /* التتويج على الحبر الكحليّ الداكن نفسه (لا الأسود الدافئ) */
  ch3: { bg: "#101c27", ink: "#f5ecd8", accent: "#e2bc55" },
  /* مدخل الفصل الرابع: يعود الأزرق الفولاذيّ فيجلس عليه الشعار القديم قبل
     تحوّله — ثم تتدرّج اللوحة إلى هوية الموقع داخل الفصل نفسه */
  ch4: { bg: "#24455e", ink: "#f2ecd9", accent: "#ffc60a" },
  /* غرفة العرض: كحليّ الهوية العميق كما هو (navy-900) — لا سوادَ محايدًا
     يمحو إنجاز الفصل الرابع اللونيّ. لا يُعتَّم أكثر: ما دون هذا يقرأه
     البصر أسودَ لا كحليًّا (‎#080e18‎ كانت إضاءته ٠٫٦٪ — سوادٌ عمليًّا).
     والضوء نفسه ذهبُ أدِيب (شعاعًا وحافّةً وغبارًا). */
  gate: { bg: "#16263a", ink: "#eee7d7", accent: "#e6c168" },
};

/* مسافات التثبيت (نسبة من ارتفاع الشاشة) — الجوال ×0.7، وتُعاد القراءة عند كل refresh.
   st1..st4 محطات الزمن بين الفصول، والخاتمة تسليمٌ وحده (بلا محطة تاريخ) فقَصُرت */
const PIN = { intro: 1.5, st1: 1.5, ch1: 3, st2: 1.2, ch2: 4, st3: 1.2, ch3: 3.5, st4: 1.2, ch4: 3.9, gate: 4.2, final: 1.7 };
const isMobile = () => window.matchMedia("(max-width: 767px)").matches;
const pinEnd = (factor: number) => () =>
  "+=" + Math.round(window.innerHeight * factor * (isMobile() ? 0.7 : 1));

/* عرض الشعار في مركز الشاشة — مصدرٌ واحد يحكم الشعارين معًا: الجديد (قياسه
   محسوبٌ من هدف الطيران) والقديم قبله (يقرؤه عبر --st-logo-w). فيقع التحوّل
   بين مقاسين متساويين لا بين كبيرٍ وصغير. */
const centerLogoW = () => Math.min(window.innerWidth * (isMobile() ? 0.72 : 0.55), 430);

/* ---------- جسيمات ذهبية (canvas واحد — الفصل الثالث) ---------- */
type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; tw: number; life: number };

class GoldParticles {
  private ctx: CanvasRenderingContext2D | null;
  private ps: P[] = [];
  private raf = 0;
  private running = false;
  private w = 0;
  private h = 0;

  constructor(private canvas: HTMLCanvasElement, private count: number) {
    this.ctx = canvas.getContext("2d");
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private spawn(burst = false): P {
    return burst
      ? {
          x: this.w / 2 + (Math.random() - 0.5) * this.w * 0.3,
          y: this.h * 0.45 + (Math.random() - 0.5) * this.h * 0.2,
          r: 0.9 + Math.random() * 1.8,
          vx: (Math.random() - 0.5) * 1.6,
          vy: -(1.2 + Math.random() * 2.4),
          a: 0.9,
          tw: Math.random() * Math.PI * 2,
          life: 60 + Math.random() * 40,
        }
      : {
          x: Math.random() * this.w,
          y: this.h * (0.15 + Math.random() * 0.95),
          r: 0.7 + Math.random() * 1.6,
          vx: (Math.random() - 0.5) * 0.18,
          vy: -(0.25 + Math.random() * 0.5),
          a: 0.25 + Math.random() * 0.5,
          tw: Math.random() * Math.PI * 2,
          life: Infinity,
        };
  }

  burst(n: number) {
    for (let i = 0; i < n; i++) this.ps.push(this.spawn(true));
  }

  start() {
    if (this.running || !this.ctx) return;
    this.running = true;
    if (!this.ps.length) for (let i = 0; i < this.count; i++) this.ps.push(this.spawn());
    const step = () => {
      if (!this.running) return;
      const c = this.ctx!;
      c.clearRect(0, 0, this.w, this.h);
      for (let i = this.ps.length - 1; i >= 0; i--) {
        const p = this.ps[i];
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.05;
        if (p.life !== Infinity && --p.life <= 0) {
          this.ps.splice(i, 1);
          continue;
        }
        if (p.y < -12) {
          Object.assign(p, this.spawn(), { y: this.h + 10 });
          continue;
        }
        const tw = 0.65 + 0.35 * Math.sin(p.tw);
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fillStyle = `rgba(230, 196, 106, ${(p.life === Infinity ? p.a : Math.min(p.a, p.life / 60)) * tw})`;
        c.fill();
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}

/* ---------- غبار شعاع العارض (canvas واحد — مشهد البوابة) ----------
   حتميّ بالكامل: كل ذرّة بذرةٌ مكتوبة يدويًّا في DUST_SEEDS (لا Math.random).
   المخروط ثابتٌ والذرّة تنجرف داخله انجرافًا أفقيًّا بطيئًا بتمايلٍ رأسيّ
   محدود — لا صعودَ ولا إشعاعَ دوّار (ذاك للفصل الثالث وحده). ولأن موضعها
   يُحسب نسبةً إلى عرض المخروط عند عمقها، فلا ذرّة تُهدر خارجه. */
class DustMotes {
  private ctx: CanvasRenderingContext2D | null;
  private raf = 0;
  private running = false;
  private t = 0;
  private w = 0;
  private h = 0;

  constructor(private canvas: HTMLCanvasElement, private count: number) {
    this.ctx = canvas.getContext("2d");
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running || !this.ctx) return;
    this.running = true;
    const step = () => {
      if (!this.running) return;
      const c = this.ctx!;
      this.t += 1;
      c.clearRect(0, 0, this.w, this.h);
      for (let i = 0; i < Math.min(this.count, DUST_SEEDS.length); i++) {
        const [sx, sy, r, v, ph] = DUST_SEEDS[i];
        /* عمقُ الذرّة في المخروط ثابتٌ (٠ عند رأسه عند قاع البوابة · ١ عند
           قاعه أسفل الشاشة) — والمخروط نفسه لا يدور ولا يتّسع بالزمن */
        const d = (sy / 100 - 0.6) / 0.4;
        const y = this.h * (0.78 + 0.2 * d);
        const spread = 0.18 + 0.96 * Math.max(0, y / this.h - 0.76); /* نصف عرضه عند هذا العمق */
        /* انجرافٌ أفقيّ بطيء داخل عرض المخروط، يلتفّ عند حافّته */
        let k = ((sx / 100) * 2 - 1 + this.t * v * 0.0006 + 1) % 2;
        k = (k + 2) % 2 - 1;
        const a = 0.2 + 0.16 * Math.sin(this.t * 0.02 + ph);
        c.beginPath();
        c.arc(
          this.w * (0.5 + k * spread),
          y + Math.sin(this.t * 0.006 + ph) * this.h * 0.006,
          r,
          0,
          Math.PI * 2
        );
        /* ذهب أدِيب: الغبار من ضوء المصباح نفسه لا من ضوءٍ باردٍ غريب */
        c.fillStyle = `rgba(240, 214, 150, ${a.toFixed(3)})`;
        c.fill();
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}

/* ---------- الشعار القديم: SVG يُضمَّن ويُرسم مسارًا-مسارًا، وإلا صورة بقناع متسع ---------- */
type OldLogo = { mode: "svg" | "raster"; draws: SVGGeometryElement[]; fills: Element[] };

async function mountOldLogo(fig: HTMLElement): Promise<OldLogo> {
  const src = fig.dataset.src || "";
  if (/\.svg(\?.*)?$/.test(src)) {
    try {
      const res = await fetch(src);
      if (res.ok) {
        const svgDoc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
        const svg = svgDoc.querySelector("svg");
        if (svg && !svgDoc.querySelector("parsererror")) {
          const live = document.importNode(svg, true);
          fig.appendChild(live);
          const fills = Array.from(live.children).filter((el) => el.tagName !== "defs");
          const geoms = Array.from(
            live.querySelectorAll<SVGGeometryElement>("path, circle, rect, ellipse, polygon, polyline, line")
          );
          const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
          layer.setAttribute("class", "st-draw-layer");
          const draws: SVGGeometryElement[] = [];
          for (const g of geoms) {
            const clone = g.cloneNode(false) as SVGGeometryElement;
            clone.removeAttribute("fill");
            clone.removeAttribute("opacity");
            layer.appendChild(clone);
            draws.push(clone);
          }
          live.appendChild(layer);
          /* الأطوال تُقاس بعد الإدراج في DOM حيّ */
          for (const d of draws) {
            let len = 300;
            try {
              len = d.getTotalLength();
            } catch {
              /* عنصر بلا طول — يبقى الافتراض */
            }
            d.style.strokeDasharray = `${len}`;
            d.style.strokeDashoffset = `${len}`;
          }
          return { mode: "svg", draws, fills };
        }
      }
    } catch {
      /* يسقط إلى صورة */
    }
  }
  const img = new Image();
  img.src = src;
  img.alt = "";
  fig.classList.add("st-oldlogo-raster");
  fig.appendChild(img);
  try {
    await img.decode();
  } catch {
    /* حتى لو تعذّر فكّ الترميز نكمل */
  }
  return { mode: "raster", draws: [], fills: [] };
}

/* ---------- صور مرقّمة (بطاقات الفصل الثاني · كواليس الحكاية) ----------
   الرقم من ترتيب العنصر (01, 02, …) والامتداد يُجرَّب لا يُفترَض. الغياب ليس
   عطلًا: الصورة الغائبة تُبقي الـplaceholder المرسوم فيبدو المشهد مكتملًا.
   تُستدعى في وقت خامل قبل مشهدها بمسافة فلا pop-in ولا فكّ ترميز متأخر. */
const IMG_EXT = ["webp", "jpg", "png"];

async function mountNumbered(
  slots: HTMLElement[],
  dir: string,
  hole: string | null, /* حاضنة الصورة داخل العنصر (null ⇒ العنصر نفسه) */
  cls?: string
): Promise<void> {
  await Promise.allSettled(
    slots.map(async (slot, i) => {
      if (slot.dataset.loaded) return;
      const host = hole ? slot.querySelector(hole) : slot;
      if (!host) return;
      const base = dir + String(i + 1).padStart(2, "0") + ".";
      for (const ext of IMG_EXT) {
        const img = new Image();
        img.src = base + ext;
        img.alt = "";
        if (cls) img.className = cls;
        try {
          await img.decode();
        } catch {
          continue; /* الامتداد غير موجود — التالي */
        }
        host.appendChild(img);
        slot.dataset.loaded = "1";
        return;
      }
    })
  );
}

/* ============================================================
   التهيئة — تُستدعى بعد window.load من StoryOpening
   ============================================================ */
export async function initStory(root: HTMLElement): Promise<() => void> {
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T | null;
  const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll(sel)) as T[];

  /* نسخة ساكنة كاملة لمن يفضّل تقليل الحركة: فصول متتالية مقروءة بلا تثبيت */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("st-static");
    const fig = $(".st-oldlogo");
    if (fig?.dataset.src && !fig.firstChild) {
      const img = new Image();
      img.src = fig.dataset.src;
      img.alt = "الشعار القديم";
      fig.appendChild(img);
    }
    /* الصور المرقّمة تُعرض كما هي في النسخة الساكنة (والغائبة تبقى placeholder) */
    void mountNumbered($$(".st-card"), STORY_ASSETS.cardsDir, null, "st-card-img");
    void mountNumbered($$(".st-cell"), STORY_ASSETS.shotsDir, ".st-cell-img");
    /* محطات الزمن وكوادر البوابة: تظهر بتلاشٍ لطيف عند بلوغها — بلا شريط ولا انفلات */
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("st-in")),
      { threshold: 0.35 }
    );
    $$(".st-station-static, .st-cell").forEach((b) => io.observe(b));
    return () => {
      io.disconnect();
      root.classList.remove("st-static");
    };
  }

  const header = document.querySelector<HTMLElement>("header");
  const headerLogo = header?.querySelector<HTMLElement>("img") ?? null;

  /* انتظار الخطوط والصور الحرجة قبل أي كشف — لا وميض */
  const fly = $(".st-newlogo") as HTMLImageElement;
  /* توأم الشعار الأبيض: هندسته وتحويلاته نسخةٌ طبق الأصل (تُطبَّق على الاثنين
     معًا)، وشفافيته وحدها مستقلّة — بها يقع التبادل في سواد غرفة العرض */
  const flyAlt = $(".st-newlogo-alt") as HTMLImageElement;
  const shield = $(".st-shield") as HTMLImageElement;
  const oldLogo = await mountOldLogo($(".st-oldlogo")!);
  await Promise.allSettled([document.fonts.ready, fly.decode(), flyAlt.decode(), shield.decode()]);

  root.classList.add("st-live");

  /* صور بطاقات الفصل الثاني: تُحمَّل في أول وقتٍ خامل بعد الكشف — الفصل الثاني
     يبعد نحو خمس شاشات، فيصل كلٌّ منها قبل ظهوره بمسافةٍ مطمئنة */
  const idleOnce = (fn: () => void) => {
    let done = false;
    return () => {
      if (done) return;
      done = true;
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback;
      if (idle) idle(fn, { timeout: 1500 });
      else setTimeout(fn, 400); /* سفاري: لا وقت خامل مُعلَن */
    };
  };
  idleOnce(() => void mountNumbered($$(".st-card"), STORY_ASSETS.cardsDir, null, "st-card-img"))();

  /* لوحة الفصل الرابع = هوية الموقع الحالية — تُقرأ من رموز tokens.css مرة واحدة
     (الاستثناء الوحيد المقصود في عزل القصة: لحظة تسليم الهوية) */
  const cs = getComputedStyle(document.documentElement);
  const identity = {
    bg: cs.getPropertyValue("--color-bg").trim() || "#f5f7fa",
    ink: cs.getPropertyValue("--color-text").trim() || "#182031",
    accent: cs.getPropertyValue("--color-primary").trim() || "#274060",
  };

  /* ---------- Lenis — الربط المنصوص عليه (النداء مغلَّف بسهم كي لا يصل وسيط
     حدث Lenis إلى ScrollTrigger.update بوصفه راية reset) ---------- */
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on("scroll", () => ScrollTrigger.update());
  const tickerFn = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tickerFn);
  gsap.ticker.lagSmoothing(0);

  let extraCleanup: (() => void) | undefined;
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    extraCleanup?.();
    ctx.revert(); /* يقتل التايملاينات والـtriggers ويسترد أنماط الهيدر وكل inline styles */
    gsap.ticker.remove(tickerFn);
    lenis.destroy();
    root.classList.remove("st-live");
  };

  const ctx = gsap.context(() => {
    const splits: SplitText[] = [];
    const words = (sel: string) => {
      const el = $(sel);
      if (!el) return [];
      const s = new SplitText(el, { type: "words", wordsClass: "st-w" });
      splits.push(s);
      return s.words;
    };

    /* إخفاء هيدر الموقع طوال القصة (أنماط وقت تشغيل فقط — كوده لا يُمَسّ) */
    if (header) gsap.set(header, { autoAlpha: 0 });

    const setPalette = (
      tl: gsap.core.Timeline,
      p: { bg: string; ink: string; accent: string },
      pos: number,
      dur: number
    ) => tl.to(root, { "--st-bg": p.bg, "--st-ink": p.ink, "--st-accent": p.accent, duration: dur, ease: "none" }, pos);

    const dashes = $$(".st-chap-dash i");
    const dashSet = dashes.map((d) => gsap.quickSetter(d, "scaleY"));

    /* ---------- محطات الزمن: مقاطع مثبتة بين الفصول ----------
       المقطع نفسه فارغ (بطل الوقت يملأه من طبقته الثابتة)؛ وظيفتاه:
       مسافة تمرير لدوران التاريخ + جسر الألوان من لوحة الفصل المنتهي
       إلى لوحة القادم على امتداد المحطة كلّها */
    const stationEls = $$(".st-station");
    const STATION_PIN = [PIN.st1, PIN.st2, PIN.st3, PIN.st4];
    const stTrigs: ScrollTrigger[] = [];
    const makeStation = (i: number, palette: { bg: string; ink: string; accent: string }) => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stationEls[i],
          start: "top top",
          end: pinEnd(STATION_PIN[i]),
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      setPalette(tl, palette, 0, 1);
      stTrigs.push(tl.scrollTrigger!);
    };

    /* ============================================================
       المشهد 0 — الافتتاح (pin +150%)
       ============================================================ */
    const introScene = $(".st-intro")!;
    const l1 = $(".st-intro-l1")!;
    const l1w = words(".st-intro-l1");
    const l2 = $(".st-intro-l2")!;
    const cue = $(".st-cue")!;

    /* one-shot التحميل: دخول السطر الأول — ومن رجع إلى الصفر وجده ظاهرًا كما دخل */
    gsap.set(l1, { autoAlpha: 1 });
    gsap.fromTo(
      l1w,
      { y: 40, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.06, ease: "power3.out", delay: 0.15 }
    );

    const tlIntro = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: introScene,
        start: "top top",
        end: pinEnd(PIN.intro),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    tlIntro
      .to(cue, { autoAlpha: 0, duration: 1 }, 0.4)
      /* خروج السطر الأول كلمةً-كلمةً بتدرّج واضح:
         stagger = الفاصل بين كل كلمة والتي تليها (كبّره ليشتد التدرج، صغّره ليتقارب)
         duration = زمن اختفاء الكلمة الواحدة · y = مسافة صعودها وهي تختفي */
      .fromTo(
        l1w,
        { y: 0, autoAlpha: 1 },
        { y: -33, autoAlpha: 0, duration: 1.3, stagger: 0.24, ease: "power2.in", immediateRender: false },
        1
      )
      .fromTo(
        l2,
        { autoAlpha: 0, scale: 0.96, wordSpacing: "0.02em" },
        /* «الاتساع البطيء» بمسافة الكلمات لا الحروف — تباعُد الحروف يقطع وصل العربية */
        { autoAlpha: 1, scale: 1, wordSpacing: "0.28em", duration: 2.6, ease: "expo.out" },
        3.4
      )
      .to({}, { duration: 1.4 }); /* سكون قبل محطة البداية */

    /* محطة البداية: من يوم الزائر عودًا إلى التأسيس — تجسر إلى لوحة الفصل الأول */
    makeStation(0, PALETTES.ch1);

    /* ============================================================
       الفصل الأول — البذرة (pin +300%)
       ============================================================ */
    const ch1 = $(".st-ch1")!;
    const letters = $$(".st-ltr");
    const depths = letters.map((l) => parseFloat(l.dataset.depth || "1"));
    const oldLogoFig = $(".st-oldlogo")!;
    const ch1copy = $(".st-ch1-copy")!;
    const ch1words = words(".st-ch1 .st-ch-text");

    const tlCh1 = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ch1,
        start: "top top",
        end: pinEnd(PIN.ch1),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          dashSet[0](self.progress);
        },
      },
    });

    /* (لوحة الفصل تصل مكتملة من جسر محطة البداية — لا setPalette هنا) */
    tlCh1
      /* Beat 1 (0–25%): حروف تطفو بأعماق parallax مختلفة */
      .fromTo(
        letters,
        { autoAlpha: 0, y: (i: number) => 70 * depths[i] },
        { autoAlpha: 0.85, y: 0, duration: 1.4, stagger: 0.07, ease: "power3.out" },
        0
      )
      .to(letters, { y: (i: number) => -46 * depths[i], duration: 1.1 }, 1.4)
      /* Beat 2 (25–50%): الانجذاب إلى نقطة المركز والانصهار فيها
         (الهدف = الإزاحة الحالية + المسافة إلى المركز، لأن للحرف تحويلات جارية) */
      .to(
        letters,
        {
          x: (i: number, t: Element) => {
            const r = t.getBoundingClientRect();
            return Number(gsap.getProperty(t, "x")) + (window.innerWidth / 2 - (r.left + r.width / 2));
          },
          y: (i: number, t: Element) => {
            const r = t.getBoundingClientRect();
            return Number(gsap.getProperty(t, "y")) + (window.innerHeight / 2 - (r.top + r.height / 2));
          },
          rotate: 0,
          scale: 0.3,
          duration: 2.2,
          stagger: 0.05,
          ease: "power2.in",
        },
        2.5
      )
      .to(letters, { autoAlpha: 0, duration: 0.7, stagger: 0.05 }, 4.1)
      /* Beat 3 (50–80%): من نقطة الانصهار يُرسم الشعار القديم */
      .fromTo(oldLogoFig, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power2.out" }, 5);
    if (oldLogo.mode === "svg") {
      gsap.set(oldLogo.fills, { opacity: 0 });
      tlCh1
        /* تتابع بميزانية زمنية ثابتة (amount) — لا يتمدد مهما بلغ عدد مسارات الشعار */
        .to(oldLogo.draws, { strokeDashoffset: 0, duration: 1.6, stagger: { amount: 1.2 }, ease: "power1.inOut" }, 5.2)
        .to(oldLogo.fills, { opacity: 1, duration: 1, stagger: { amount: 0.5 } }, 7)
        .to(oldLogo.draws, { opacity: 0, duration: 0.6 }, 7.6);
    } else {
      tlCh1.fromTo(
        oldLogoFig,
        { "--st-or": "0%", filter: "sepia(.18) blur(14px)" },
        { "--st-or": "78%", filter: "sepia(.18) blur(0px)", duration: 2.6, ease: "power2.inOut" },
        5.2
      );
    }
    tlCh1
      /* Beat 4 (80–100%): نص التأسيس، والعدّاد يتدحرج إلى سنة التأسيس (onUpdate أعلاه) */
      .fromTo(ch1copy, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 8)
      .fromTo(
        ch1words,
        { y: 22, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.07, ease: "power3.out" },
        8.2
      );

    /* محطة الأثر: من التأسيس إلى تاريخ الأثر — تجسر إلى لوحة الفصل الثاني */
    makeStation(1, PALETTES.ch2);

    /* ============================================================
       الفصل الثاني — الأثر: مسار أفقي RTL (pin +400%)
       ============================================================ */
    const ch2 = $(".st-ch2")!;
    const wrap = $(".st-trackwrap")!;
    const track = $(".st-track")!;
    const cards = $$(".st-card");
    const ch2head = $(".st-ch2-head")!;
    const ch2words = words(".st-ch2 .st-ch-text");
    const skewTo = gsap.quickTo(track, "skewX", { duration: 0.3, ease: "power3" });

    /* الاتجاه يُقاس ولا يُفترَض: في RTL يفيض المسار يسارًا فتكون الحركة موجبة */
    const trackShift = () => {
      const delta = track.scrollWidth - wrap.clientWidth;
      if (delta <= 0) return 0;
      const overflowsLeft = track.getBoundingClientRect().left < wrap.getBoundingClientRect().left - 1;
      return overflowsLeft ? delta : -delta;
    };

    /* مراكز البطاقات (بلا إزاحة المسار) تُحسَب عند كل refresh — للتوقف البصري للبطلتين */
    let cardCenters: number[] = [];
    const cacheCenters = () => {
      const x = Number(gsap.getProperty(track, "x")) || 0;
      cardCenters = cards.map((c) => {
        const r = c.getBoundingClientRect();
        return r.left + r.width / 2 - x;
      });
    };

    const tlCh2 = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ch2,
        start: "top top",
        end: pinEnd(PIN.ch2),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: cacheCenters,
        onUpdate(self) {
          dashSet[1](self.progress);
          /* skew خفيف يتبع سرعة التمرير ويعود بمرونة (لمسة الإبهار) */
          skewTo(gsap.utils.clamp(-6, 6, self.getVelocity() / -350));
          /* عمقٌ متّصل بموضع كل بطاقة على الشاشة — لا ظهورَ ولا اختفاء:
             البطاقة تصل من الحافة خافتةً منخفضةً فتقترب وتوضح كلّما قاربت
             المنتصف (والبطلتان تتوسّعان فوق ذلك). كل القيم دوالُّ الموضع،
             فالرجوع بالتمرير يعكسها حرفيًّا ولا تقفز واحدةٌ منها. */
          const x = Number(gsap.getProperty(track, "x")) || 0;
          const mid = window.innerWidth / 2;
          const range = window.innerWidth * 0.45;
          cards.forEach((c, i) => {
            const d = Math.abs(cardCenters[i] + x - mid) / range; /* 0 مركز · 1 حافة */
            const near = Math.max(0, 1 - d);
            const far = Math.min(1, Math.max(0, (d - 0.5) / 0.8)); /* البُعد يبدأ متأخّرًا */
            const hero = c.classList.contains("st-card-hero");
            gsap.set(c, {
              scale: 1 + (hero ? 0.07 : 0.025) * near - 0.07 * far,
              y: -(hero ? 18 : 7) * near + 12 * far,
              opacity: 1 - 0.55 * far,
            });
          });
        },
        onScrubComplete: () => skewTo(0),
        onLeave: () => skewTo(0),
        onLeaveBack: () => skewTo(0),
      },
    });

    tlCh2
      .fromTo(ch2head, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 0)
      .fromTo(
        ch2words,
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1, stagger: 0.06, ease: "power3.out" },
        0.15
      )
      /* المسار يُكشف حركةً واحدة هادئة (لا عشرَ حركات): يصعد الرصيف كلّه
         ويتّضح على مهل — والعمق أعلاه يتولّى فرز البطاقات قربًا وبُعدًا */
      .fromTo(
        track,
        { autoAlpha: 0, y: 44 },
        { autoAlpha: 1, y: 0, duration: 1.9, ease: "power2.out" },
        0.4
      )
      /* الانزلاق يبدأ والرصيف لم يستقرّ بعد — فلا لحظة سكونٍ بين الكشف والحركة */
      .to(track, { x: trackShift, duration: 8.4 }, 1.2);

    /* محطة التتويج: هبوط slot-machine على يوم المركز الأول — تجسر إلى لوحة التتويج */
    makeStation(2, PALETTES.ch3);

    /* ============================================================
       الفصل الثالث — التتويج: الذروة (pin +350%)
       ============================================================ */
    const ch3 = $(".st-ch3")!;
    const rays = $(".st-rays")!;
    const sweepBand = $(".st-sweep-band")!;
    const flash = $(".st-flash")!;
    const shieldWrap = $(".st-shield-wrap")!;
    const crownTitle = $(".st-crown-title")!;
    const crownSub = $(".st-crown-sub")!;
    const crownTail = $(".st-crown-tail")!;
    const countEl = $(".st-count")!;
    const canvas = $(".st-canvas") as HTMLCanvasElement;
    const particles = new GoldParticles(canvas, isMobile() ? 24 : 48);
    let flashFired = false;

    /* كوادر البوابة تُحمَّل وتُفكّ ترميزًا في وقت خامل أثناء هذا الفصل — مرة واحدة،
       فلا pop-in عند دخول مشهدها (والمشهد نفسه يستدعيها احتياطًا لدخولٍ عميق) */
    const queueShots = idleOnce(() => void mountNumbered($$(".st-cell"), STORY_ASSETS.shotsDir, ".st-cell-img"));

    gsap.set(rays, { autoAlpha: 0 });
    gsap.set(sweepBand, { xPercent: -140 });
    gsap.set(shieldWrap, { transformPerspective: 900 });

    const count = { n: 0 };
    const tlCh3 = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ch3,
        start: "top top",
        end: pinEnd(PIN.ch3),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          if (self.isActive) {
            particles.resize();
            particles.start();
            queueShots();
          } else {
            particles.stop();
          }
        },
        onUpdate(self) {
          dashSet[2](self.progress);
          /* one-shot عند 55%: نبضة ضوء + دفعة جسيمات — مرة واحدة، لا scrub */
          if (!flashFired && self.progress >= 0.55 && self.direction > 0) {
            flashFired = true;
            gsap
              .timeline()
              .to(flash, { autoAlpha: 0.12, duration: 0.22, ease: "power2.out" })
              .to(flash, { autoAlpha: 0, duration: 0.38, ease: "power2.in" });
            particles.burst(isMobile() ? 20 : 40);
          }
        },
      },
    });

    tlCh3
      .to(rays, { autoAlpha: 0.9, duration: 1.2 }, 0.2)
      .fromTo(rays, { rotate: 0 }, { rotate: 40, duration: 10 }, 0)
      /* الدرع يدخل من العمق بطلًا مطلقًا للمشهد */
      .fromTo(
        shield,
        { autoAlpha: 0, scale: 0.55, yPercent: 12, filter: "blur(12px)" },
        { autoAlpha: 1, scale: 1, yPercent: 0, filter: "blur(0px)", duration: 3.4, ease: "power2.out" },
        0.4
      )
      /* لمعان sweep: الشريط يتحرّك داخل حاضنةٍ ثابتةٍ مقنَّعةٍ بصورة الدرع —
         فلا يظهر البريق إلا على الدرع نفسه. يبدأ مع كلمة «المركز الأول»
         بالضبط (ومعهما نبضة الضوء عند 55%) فتكون اللحظة واحدةً لا لحظتين،
         ويمتدّ بطيئًا (٢.٤ وحدة) لا خطفةً سريعة. */
      .to(sweepBand, { xPercent: 140, duration: 2.4, ease: "power1.inOut" }, 5.4)
      .fromTo(
        crownTitle,
        { autoAlpha: 0, y: 34, scale: 0.92 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 1.4, ease: "expo.out" },
        5.4
      )
      .fromTo(crownSub, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" }, 6.4)
      .to(
        count,
        {
          n: 60,
          duration: 2,
          onUpdate() {
            const v = Math.round(count.n);
            countEl.textContent = v >= 60 ? "60+" : String(v);
          },
        },
        6.4
      )
      .fromTo(crownTail, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" }, 8.6);

    /* إمالة 3D خفيفة للدرع تتبع الماوس — Desktop فقط (pointer: fine) */
    let tiltOff: (() => void) | undefined;
    if (window.matchMedia("(pointer: fine)").matches && !isMobile()) {
      const rx = gsap.quickTo(shieldWrap, "rotationX", { duration: 0.5, ease: "power2" });
      const ry = gsap.quickTo(shieldWrap, "rotationY", { duration: 0.5, ease: "power2" });
      const onMove = (e: PointerEvent) => {
        if (!tlCh3.scrollTrigger?.isActive) return;
        ry(((e.clientX / window.innerWidth) * 2 - 1) * 6);
        rx(-((e.clientY / window.innerHeight) * 2 - 1) * 6);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      tiltOff = () => window.removeEventListener("pointermove", onMove);
    }

    /* محطة التجدّد: إلى يوم الهوية الجديدة — تجسر عائدةً إلى الأزرق الفولاذيّ
       الذي يستقبل الشعار القديم في مدخل الفصل الرابع */
    makeStation(3, PALETTES.ch4);

    /* ============================================================
       الفصل الرابع — التجدّد (pin +300%)
       ============================================================ */
    const ch4 = $(".st-ch4")!;
    const old2 = $(".st-oldlogo2")!;
    const ch4copy = $(".st-ch4-copy")!;
    const renew1w = words(".st-renew-l1");

    const tlCh4 = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ch4,
        start: "top top",
        end: pinEnd(PIN.ch4),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          dashSet[3](self.progress);
        },
      },
    });

    tlCh4
      /* يعود الشعار القديم إلى المركز بحجم متوسط */
      .fromTo(old2, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 1.3, ease: "power3.out" }, 0)
      /* تحلّل وتشكّل: القديم يتفكك بقناعٍ متسع بينما يتكوّن الجديد مكانه — لا لحظة فراغ */
      .to(old2, { "--st-mr": "150%", scale: 1.06, filter: "blur(8px)", duration: 3, ease: "power2.in" }, 2.6)
      .to(old2, { autoAlpha: 0, duration: 0.8 }, 4.9)
      .fromTo(fly, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.8, ease: "power2.out" }, 4.4);
    /* بالتوازي وبنفس الـscrub: تسليم الهوية — التدرّج إلى ألوان الموقع الحالية */
    setPalette(tlCh4, identity, 3, 4.5);
    tlCh4
      .fromTo(ch4copy, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 6.8)
      .fromTo(
        renew1w,
        { y: 22, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.07, ease: "power3.out" },
        7
      )
      /* ختام الفصل: مُهلةُ قراءةٍ ثم يصعد النصّ ويخفت — داخل التثبيت لا بعده.
         طبقة الشعار ثابتة (fixed) لا تسير مع المشهد؛ فلو بقي النصّ ظاهرًا حين
         يُفلت التثبيت لعبر من خلف الشعار وهو يصعد. الفصل يُسلّم شعارًا وحده على
         خشبةٍ خالية، وامتدّ تثبيته (٣ → ٣٫٩) كي تبقى سرعة كلّ نبضةٍ كما كانت. */
      .to(ch4copy, { y: -34, autoAlpha: 0, duration: 1.1, ease: "power2.in" }, 9.3);

    /* ============================================================
       بوابة العارض (pin +460%) — المشهد كلّه جهاز عرضٍ سينمائيّ واحد
       شريط فيلمٍ متّصل (.st-film) يُسحب أفقيًّا بتقدّم التمرير، وفي منتصف
       الشاشة بوابةٌ مضاءة: كل كادرٍ يمرّ بها يقف ويُضاء فتُقرأ تفاصيله، ثم
       يواصل الشريط سحبه. الزائر هو من يدير البكرة — والكواليس ما خلف الكاميرا.

       زمن التايملاين ١٠ وحدات = ١٠٠٪ من المقطع، فتُقرأ النبضات بالنسبة رأسًا:
         ٠٫٠–٠٫٨  تشغيل العارض   · ٠٫٨–٧٫٢ سحب الشريط (يقوده onUpdate)
         ٧٫٢–٨٫٥  إطفاء البوابة   · ٨٫٥–١٠  انفلات الكوادر والعبور

       الحركة الأساسية جسمٌ واحد بـtransform؛ ولا يُحرَّك ثمانية عناصر منفصلة
       إلا في الانفلات وحده (خروجٌ عابرٌ مضبَّب لا حالة عرض).
       الشعار الجديد حاضر بلا انقطاع: تُحرَّك طبقته (لا تحويله) فيرتفع وينكمش
       أعلى المسرح بصندوق أمانٍ محسوبٍ عن البوابة، وتوأمه الأبيض يحلّ محلّه
       على السواد — وبذلك يبقى تحويل الشعار نفسه حكرًا على تسليم الخاتمة.
       ============================================================ */
    const gateScene = $(".st-gate")!;
    const logoLayer = $(".st-logo-layer")!;
    const film = $(".st-film")!;
    const frameCells = $$(".st-cell");
    const frameEls = $$(".st-cell-in");
    const gateEdge = $(".st-gate-edge")!;
    const gateIgnite = $(".st-gate-ignite")!;
    const gateDim = $(".st-gate-dim")!;
    const gateShade = $(".st-gate-shade")!;
    const beam = $(".st-gate-beam")!;
    const dustCanvas = $(".st-dust") as HTMLCanvasElement;
    const gateKick = $(".st-gate-kicker")!;
    const frameCount = $(".st-gate-count")!;
    const frameCap = $(".st-gate-cap")!;
    const gateTrib = $(".st-gate-tribute")!;
    const gateTail = $(".st-gate-tail")!;
    const tribW = words(".st-gate-tribute");
    const tailW = words(".st-gate-tail");
    const dust = new DustMotes(dustCanvas, isMobile() ? 12 : 26);
    const N = GATE_FRAMES.length;

    /* --- هندسة الشريط: تُقاس ولا تُفترَض ---
       offs[i] = إزاحةُ الشريط التي تُمركز الكادر i في البوابة. تُحسب من
       offsetLeft (قيم تخطيطٍ لا تتأثر بالتحويلات الجارية)، فتصحّ في RTL
       وLTR معًا بلا افتراض إشارة: في RTL يخرج offs[0] سالبًا وoffs[7]
       موجبًا — أي أن الشريط يُسحب يمينًا، فالكوادر تدخل من اليسار وتخرج
       من اليمين. لا رقم اتجاهٍ مكتوب في الكود. */
    let offs: number[] = [];
    const measureFilm = () => {
      const half = film.offsetWidth / 2;
      offs = frameCells.map((c) => half - (c.offsetLeft + c.offsetWidth / 2));
    };

    /* مجموعات العمق في الانفلات: قياس × ضبابية × مسافة اندفاع.
       الجوال: مجموعتان فقط وضبابية أخفّ (الثالثة تندمج في الوسطى) */
    const DEPTH_D = [
      { s: 3.2, b: 8, d: 85 },
      { s: 2.2, b: 4, d: 65 },
      { s: 1.6, b: 2, d: 48 },
    ];
    const DEPTH_M = [
      { s: 2.8, b: 5, d: 80 },
      { s: 1.8, b: 3, d: 58 },
    ];
    const depthOf = (i: number) =>
      isMobile() ? DEPTH_M[Math.min(GATE_FRAMES[i].depth, 1)] : DEPTH_D[GATE_FRAMES[i].depth];
    /* موضع انفلات الكادر (٪ من الشاشة) — جدولان مستقلّان: مكتبيّ وجوّاليّ */
    const scatter = (i: number) => {
      const s = GATE_FRAMES[i];
      return isMobile() ? { cx: s.mx, cy: s.my } : { cx: s.cx, cy: s.cy };
    };
    /* إزاحة الكادر من موضعه على الشريط (وقد وقف الشريط عند آخر كادر) إلى
       نقطة انفلاته — حسابٌ صرفٌ من offs، فالشريط ساكنٌ حينها والقيمة ثابتة */
    const relX = (i: number) =>
      ((scatter(i).cx - 50) / 100) * window.innerWidth - (offs[N - 1] - offs[i]);
    const relY = (i: number) => ((scatter(i).cy - 50) / 100) * window.innerHeight;
    /* الاندفاع نحو الكاميرا: على امتداد متجه نقطة الانفلات من مركز الشاشة */
    const drift = (i: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = scatter(i);
      const vx = ((s.cx - 50) / 100) * vw;
      const vy = ((s.cy - 50) / 100) * vh;
      const len = Math.hypot(vx, vy) || 1;
      const dist = (depthOf(i).d / 100) * Math.max(vw, vh);
      return { x: (vx / len) * dist, y: (vy / len) * dist };
    };

    /* التمركز بيد GSAP وحده (كبطل الوقت) — لا translate في CSS كي لا يتصارع الكاتبان */
    gsap.set(film, { xPercent: -50, yPercent: -50, force3D: true });
    gsap.set(frameCells, { force3D: true });
    measureFilm();

    /* --- الحركة المتقطّعة: انسلالٌ سريع بين الكوادر ثم شبه تجمّدٍ ما دام
           الكادر في البوابة — خريطةُ مراحل على إزاحةٍ واحدة، لا ثمانية
           تحريكات منفصلة. TRAVEL حصّة الانسلال من نافذة الكادر. --- */
    const TRAVEL = 0.35;
    const easeSnap = (q: number) => (q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2);
    /* العارض يتسارع: نوافذ الكوادر متناقصة — الأولان وقفتهما أطول (تعريفٌ
       بالإيقاع)، ثم تقصر النوافذ حتى يُسلّم الأخيران المشهدَ إلى الانفلات
       بطاقةٍ صاعدة. أوزانٌ نسبيّة لا أزمنة: تُطبَّع على نافذة السحب كلّها،
       فلا يمسّها تغيّر طول المقطع. وحصّة الانسلال (TRAVEL) نسبةٌ من النافذة،
       فالانسلال يتسارع مع الوقفة — والحركة تبقى متقطّعة شدّةً ووقفة. */
    const FRAME_W = [1.5, 1.32, 1.12, 0.98, 0.86, 0.76, 0.68, 0.62];
    const FRAME_BOUNDS = ((): number[] => {
      const ws = FRAME_W.slice(0, N);
      while (ws.length < N) ws.push(ws[ws.length - 1] ?? 1); /* جدولٌ أقصر من الكوادر: يمتدّ بآخر وزن */
      const total = ws.reduce((a, b) => a + b, 0);
      const out = [0];
      let acc = 0;
      for (const w of ws) out.push((acc += w / total));
      out[out.length - 1] = 1;
      return out;
    })();
    const setFilmX = gsap.quickSetter(film, "x", "px");
    const setGateDim = gsap.quickSetter(gateDim, "opacity");
    const popSet = frameEls.map((el) => gsap.quickSetter(el, "scale"));
    const shownFrame = { idx: -1, pop: -1 };

    const renderFilm = (u: number) => {
      if (!offs.length) return;
      const p = Math.min(1 - 1e-6, Math.max(0, u));
      let i = 0;
      while (i < N - 1 && p >= FRAME_BOUNDS[i + 1]) i++;
      const f = (p - FRAME_BOUNDS[i]) / (FRAME_BOUNDS[i + 1] - FRAME_BOUNDS[i] || 1);
      /* q: ٠ في عزّ الانسلال · ١ عند الاستقرار الكامل داخل البوابة */
      const q = i === 0 ? 1 : Math.min(1, f / TRAVEL);
      setFilmX(i === 0 ? offs[0] : offs[i - 1] + (offs[i] - offs[i - 1]) * easeSnap(q));
      /* الإضاءة والتشبّع يكتملان عند الاستقرار — بطبقةٍ واحدة داخل البوابة
         لا بمرشّحٍ على كل كادر */
      setGateDim(0.5 * (1 - q));
      if (i !== shownFrame.idx) {
        if (shownFrame.idx >= 0) popSet[shownFrame.idx](1);
        shownFrame.idx = i;
        shownFrame.pop = -1;
        /* العدّاد والتعليق يتبدّلان مع كل كادر — خارج البوابة دائمًا */
        frameCount.textContent = `${fmtDigits(i + 1)} / ${fmtDigits(N)}`;
        frameCap.textContent = GATE_FRAMES[i].cap;
      }
      /* نبضة «انغلاق البوابة على الكادر»: كتابةٌ واحدة على الكادر الحاضر */
      const pop = 1 + 0.02 * q;
      if (Math.abs(pop - shownFrame.pop) > 0.0004) {
        popSet[i](pop);
        shownFrame.pop = pop;
      }
    };

    /* نافذة السحب من تقدّم المقطع مباشرةً (لا تويـن وسيط): دالّةٌ صرفة في
       موضع التمرير، فالرجوع يعكس المشهد حرفيًّا بلا حالةٍ داخلية */
    const PULL_A = 0.08;
    const PULL_B = 0.72;
    let ignited = false;

    const tlGate = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: gateScene,
        start: "top top",
        end: pinEnd(PIN.gate),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        /* will-change والخفقان لا يعيشان إلا داخل المشهد */
        onToggle(self) {
          gateScene.classList.toggle("st-gate-active", self.isActive);
          if (self.isActive) {
            dust.resize();
            dust.start();
            queueShots(); /* دخولٌ عميق لم يمرّ بالفصل الثالث */
          } else {
            dust.stop();
          }
        },
        onRefresh(self) {
          /* الهندسة تُقاس بعد كل تغيّر مقاس، ثم يُعاد رسم الشريط على الموضع
             الحالي فورًا — فلا إطارٌ واحد بقياسٍ قديم */
          measureFilm();
          renderFilm((self.progress - PULL_A) / (PULL_B - PULL_A));
          gateScene.classList.toggle("st-gate-active", self.isActive);
          gateScene.classList.toggle("st-gate-release", self.progress >= 0.85);
          if (self.isActive) dust.resize();
        },
        onUpdate(self) {
          const p = self.progress;
          renderFilm((p - PULL_A) / (PULL_B - PULL_A));
          /* وضع الانفلات مفتاحٌ يتبع الموضع — فينعكس بالرجوع من نفسه */
          gateScene.classList.toggle("st-gate-release", p >= 0.85);
          /* ومضة تشغيل العارض: one-shot عند عتبة لا scrub، داخل البوابة
             وحدها لا على الشاشة، وتعود قابلةً للاشتعال بالرجوع قبلها */
          if (!ignited && p >= 0.055 && self.direction > 0) {
            ignited = true;
            gsap
              .timeline()
              .to(gateIgnite, { autoAlpha: 0.5, duration: 0.14, ease: "power2.out" })
              .to(gateIgnite, { autoAlpha: 0, duration: 0.5, ease: "power2.in" });
          } else if (p < 0.03) {
            ignited = false;
          }
        },
      },
    });

    /* --- ٠) تشغيل العارض (٠→٨٪): سوادُ غرفة العرض، ثم يشتعل الشعاع
           وتضيء البوابة، ويحلّ الشعار الأبيض محلّ الملوّن على السواد --- */
    /* رفعة الشعار ومقاسه يُحسبان ولا يُقدَّران، من موضع الـkicker الفعليّ
       (offsetTop — قيمة تخطيطٍ لا تتأثر بتحويلات الدخول): قاعُ الشعار يقف
       فوقه، والـkicker نفسه فوق البوابة بمسافةٍ مضمونة في CSS — فصندوق
       الأمان عن البوابة أوسعُ من ٥vh لزامًا، ولا يتقاطع الثلاثة على نافذةٍ
       قصيرة (landscape الجوال) لأن المقاس ينكمش بدل أن يفيض عن الشاشة. */
    const logoGeom = () => {
      const vh = window.innerHeight;
      const ratio = fly.naturalWidth ? fly.naturalHeight / fly.naturalWidth : 0.35;
      const natural = centerLogoW() * ratio; /* ارتفاعه بحجمه المركزيّ */
      const ceil = Math.max(vh * 0.06, gateKick.offsetTop - vh * 0.015);
      const s = Math.max(0.12, Math.min(0.5, (ceil - vh * 0.02) / natural));
      /* مركزه قبل الرفع عند ٤٢٪ من الشاشة (من هندسة الطيران) */
      return { s, y: Math.min(0, ceil - (natural * s) / 2 - vh * 0.42) };
    };

    setPalette(tlGate, PALETTES.gate, 0, 0.6);
    tlGate
      .fromTo(
        logoLayer,
        { y: 0, scale: 1 },
        {
          y: () => logoGeom().y,
          scale: () => logoGeom().s,
          duration: 0.7,
          ease: "power2.inOut",
          immediateRender: false,
        },
        0
      )
      /* القناع يعتم على مهلٍ مع اللوحة نفسها — لا صدمةَ سوادٍ عند التسليم */
      .fromTo(gateShade, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, immediateRender: false }, 0)
      .fromTo(beam, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.55, ease: "power2.out", immediateRender: false }, 0.25)
      .fromTo(dustCanvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.55, immediateRender: false }, 0.3)
      .fromTo(gateEdge, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: "power2.out", immediateRender: false }, 0.35)
      .fromTo(film, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: "power2.out", immediateRender: false }, 0.35)
      /* التبادل يقع والمسرح قد أوغل في السواد — فلا لحظةَ شعارٍ ضائع */
      .fromTo(fly, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.35, immediateRender: false }, 0.45)
      .fromTo(flyAlt, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, immediateRender: false }, 0.45)
      .fromTo(gateKick, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", immediateRender: false }, 0.45)
      .fromTo(frameCount, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, 0.6)
      .fromTo(frameCap, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, 0.6);

    /* --- ١) سحب الشريط (٨→٧٢٪): لا تويـن هنا — renderFilm أعلاه يقوده من
           تقدّم المقطع نفسه، فالحركة المتقطّعة دالّة تمريرٍ صرفة --- */

    /* --- ٢) إطفاء البوابة (٧٢→٨٥٪): يتوقف الشريط ويخفت الشعاع وتغيب
           البوابة، ثم على سوادٍ نظيفٍ تام يظهر سطر التكريم --- */
    tlGate
      .fromTo(beam, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.55, immediateRender: false }, 7.2)
      .fromTo(dustCanvas, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.5, immediateRender: false }, 7.2)
      .fromTo(frameCount, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.35, immediateRender: false }, 7.2)
      .fromTo(frameCap, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.35, immediateRender: false }, 7.2)
      .fromTo(gateKick, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.4, immediateRender: false }, 7.2)
      .fromTo(gateEdge, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.5, immediateRender: false }, 7.25)
      .fromTo(film, { autoAlpha: 1 }, { autoAlpha: 0.04, duration: 0.55, immediateRender: false }, 7.25)
      .fromTo(gateShade, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.5, immediateRender: false }, 7.3)
      .fromTo(gateTrib, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, immediateRender: false }, 7.75)
      .fromTo(tribW, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.07, ease: "power3.out" }, 7.85);

    /* --- ٣) الانفلات والعبور (٨٥→١٠٠٪) ---
       تُتّخذ مواضع الانفلات والكوادر مطفأةٌ على سواد (شفافية ٤٪) فلا تُرى
       قفزة، ثم يعود الضوء بفيضٍ زائد — والعالم معه إلى لوحة الهوية. */
    frameCells.forEach((el, i) => {
      tlGate.fromTo(
        el,
        { x: 0, y: 0 },
        { x: () => relX(i), y: () => relY(i), duration: 0.02, immediateRender: false },
        8.5
      );
    });
    /* الفجر — بديلُ الومضة: الخلفية تسطع بالتمرير نفسه على امتداد النبضة
       كلّها حتى تُطابق خلفية الموقع عند آخر إطارٍ من المقطع تمامًا، فيصير
       الخروج فجرًا متّصلًا لا قطعًا، ويجد تسليمُ Flip بعده اللونَ ذاته.
       التدرّج مؤخَّرُ الثقل (power2.in) كي تبقى الخشبة كحليّةً ما دام السطر
       الخاتم يُقرأ، فلا يمرّ بلحظة تباينٍ منخفض في منتصف التدرّج. */
    tlGate.to(root, { "--st-bg": identity.bg, duration: 1.5, ease: "power2.in" }, 8.5);
    /* الحبر والنغمة يعبران متأخّرَين وسريعًا — بعد أن يشتدّ ضوء الخلفية */
    tlGate.to(root, { "--st-ink": identity.ink, "--st-accent": identity.accent, duration: 0.35, ease: "power2.inOut" }, 9.6);
    tlGate
      .fromTo(gateTrib, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.14, immediateRender: false }, 8.5)
      .fromTo(film, { autoAlpha: 0.04 }, { autoAlpha: 1, duration: 0.14, immediateRender: false }, 8.52)
      /* الشعار يعود ملوّنًا مع الحبر لا قبله — الكحليّ لا يُقرأ إلا وقد أضاء الفجر */
      .fromTo(flyAlt, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.35, immediateRender: false }, 9.6)
      .fromTo(fly, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, immediateRender: false }, 9.6);

    /* القريبة تتضخّم وتعبر الحواف أولًا، ثم الوسطى، ثم البعيدة */
    frameCells.forEach((el, i) => {
      const at = 8.55 + GATE_FRAMES[i].depth * 0.06;
      const dur = 0.32;
      tlGate
        .fromTo(
          el,
          { x: () => relX(i), y: () => relY(i), scale: 1 },
          {
            x: () => relX(i) + drift(i).x,
            y: () => relY(i) + drift(i).y,
            scale: () => depthOf(i).s,
            duration: dur,
            ease: "power2.in",
            immediateRender: false,
          },
          at
        )
        .fromTo(
          el,
          { "--pb": "0px" },
          { "--pb": () => depthOf(i).b + "px", duration: dur, ease: "power2.in", immediateRender: false },
          at
        )
        .fromTo(el, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.12, ease: "power1.in", immediateRender: false }, at + dur - 0.12);
    });

    /* --- خشبةٌ نظيفة: آخر كادرٍ تنطفئ شفافيته عند ٨٫٩٩ تمامًا، والسطر يدخل
           على فراغٍ فعلًا (كلمةً-كلمةً كسائر نصوص القصة)، ثم يعود الشعار
           إلى المركز بحجمه ليتسلّم بقيّة الخاتمة --- */
    tlGate
      .fromTo(gateTail, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, 9.0)
      .fromTo(tailW, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06, ease: "power3.out" }, 9.03)
      .fromTo(
        logoLayer,
        { y: () => logoGeom().y, scale: () => logoGeom().s },
        { y: 0, scale: 1, duration: 0.55, ease: "power2.inOut", immediateRender: false },
        9.05
      )
      /* ختام المشهد كختام الفصل الرابع: مُهلةُ قراءةٍ ثم يصعد السطر ويخفت
         داخل التثبيت. طبقة الشعار ثابتة (fixed) لا تسير مع المشهد؛ فلو بقي
         السطر ظاهرًا حين يُفلت التثبيت لعبر من خلف الشعار وهو يصعد. */
      .to(gateTail, { y: -34, autoAlpha: 0, duration: 0.22, ease: "power2.in" }, 9.78);

    /* ============================================================
       الخاتمة — التسليم وحده (pin +170%): نفَسٌ قصير ثم يطير الشعار إلى
       موضعه في الهيدر. لا محطة تاريخ هنا: يوم الزيارة لا يقول شيئًا،
       فآخر ظهور للتاريخ هو شبح محطة التجدّد.
       ============================================================ */
    const finalScene = $(".st-final")!;
    const hud = $(".st-hud")!;
    const bg = $(".st-bg")!;
    const grain = $(".st-grain")!;

    /* هندسة الطيران تُحسب من موضع شعار الهيدر الحقيقي وتُعاد عند كل refresh.
       الهدف = موضع الشعار حين يلتصق الهيدر بأعلى الشاشة (sticky top: 0). */
    const flyState = { x: 0, y: 0, scale: 1 };
    const computeFly = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let tLeft = vw / 2 - 90;
      let tTop = 18;
      let tW = 180;
      if (header && headerLogo) {
        const hr = header.getBoundingClientRect();
        const lr = headerLogo.getBoundingClientRect();
        tLeft = lr.left;
        tTop = lr.top - hr.top;
        tW = lr.width;
      }
      const ratio = fly.naturalWidth ? fly.naturalHeight / fly.naturalWidth : 0.35;
      /* التوأمان في هندسةٍ واحدة دائمًا — الشفافية وحدها تفرّق بينهما */
      gsap.set([fly, flyAlt], { left: tLeft, top: tTop, width: tW });
      const cW = centerLogoW();
      /* المقاس نفسه يُنشر للشعار القديم (يقرؤه CSS) — يُضبط قبل قياسات
         refresh فتبنى مسافات التثبيت على الارتفاع الصحيح */
      root.style.setProperty("--st-logo-w", cW + "px");
      flyState.scale = cW / tW;
      flyState.x = vw / 2 - (tLeft + tW / 2);
      flyState.y = vh * 0.42 - (tTop + (tW * ratio) / 2);
    };
    computeFly();
    ScrollTrigger.addEventListener("refreshInit", computeFly);
    const onRefreshResize = () => particles.resize();
    ScrollTrigger.addEventListener("refresh", onRefreshResize);

    const tlFinal = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: finalScene,
        start: "top top",
        end: pinEnd(PIN.final),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onLeave() {
          if (STORY_CONFIG.showOncePerSession) {
            try {
              sessionStorage.setItem(SESSION_KEY, "1");
            } catch {
              /* تخزين محظور — لا شيء يعتمد عليه */
            }
          }
        },
      },
    });

    /* نفَسٌ قصير (الشعار مركزيّ والـHUD يخفت) ثم الانتقال — مسافةُ كل نبضة
       من التمرير كما كانت، وإنما حُذف نصفُ المحطة الميت من أول الخاتمة */
    tlFinal
      .to(hud, { autoAlpha: 0, duration: 1.5 }, 0)
      .fromTo(
        [fly, flyAlt],
        { x: () => flyState.x, y: () => flyState.y, scale: () => flyState.scale },
        { x: 0, y: 0, scale: 1, duration: 3.4, ease: "power3.inOut" },
        1.2
      )
      .to(bg, { autoAlpha: 0, duration: 3.2 }, 1.8)
      .to(grain, { autoAlpha: 0, duration: 2 }, 2);
    if (header) tlFinal.to(header, { autoAlpha: 1, duration: 2.6 }, 2.8);
    /* عند اكتمال المطابقة (±2px) يحلّ شعار الهيدر الحقيقي محلّ الطائر بلا وميض */
    tlFinal.to(fly, { autoAlpha: 0, duration: 0.3 }, 5.3);

    /* ============================================================
       بطل الوقت (#time-hero) — عنصر تاريخ واحد دائم يقوده منسّق واحد
       آلة الحالات: غياب → ظهور → دوران → استقرار → انطفاء → غياب … ×٤
       التاريخ حكرٌ على محطته: ينطفئ مع بداية الفصل ولا يبقى خلفه أثر
       (لا شبح سنةٍ عملاقة — أُزيلت بميكانيكاها كلها).
       المحطات أربع، ويوم الزيارة أصلُ أول بكرة لا محطةً ولا خاتمة.
       كل القيم دوالّ صرفة في موضع التمرير المُنعَّم الواحد — لا حالة
       زمنية داخلية، فالرجوع بالتمرير يُرجع الزمن للخلف حرفيًّا،
       ولا عدّادات متعددة تتبادل الظهور (منبع القفزات المحظور).
       ============================================================ */
    const TH = STORY_CONFIG.timeHero;
    const timeEl = $(".st-time")!;
    const kickEl = $(".st-time-kicker")!;
    const reelWin = {
      day: $(".st-reel-day")!,
      month: $(".st-reel-month")!,
      year: $(".st-reel-year")!,
    };
    const reelStrip = {
      day: reelWin.day.firstElementChild as HTMLElement,
      month: reelWin.month.firstElementChild as HTMLElement,
      year: reelWin.year.firstElementChild as HTMLElement,
    };

    /* --- محور الزمن: فهرس يوم متصل (أيام منذ Epoch بإحداثيات UTC) --- */
    const DAY_MS = 86400000;
    const dayIdx = (y: number, m0: number, d: number) => Math.round(Date.UTC(y, m0, d) / DAY_MS);
    const nowD = new Date(); /* يوم الزائر الحقيقي لحظة الزيارة — حيّ يتغير كل يوم */
    const todayIdx = dayIdx(nowD.getFullYear(), nowD.getMonth(), nowD.getDate());

    type TimeStation = { idx: number; hasDay: boolean; kicker: string };
    const stations: TimeStation[] = TH.stations.map((s) => {
      if (s.date === "live") return { idx: todayIdx, hasDay: true, kicker: s.kicker };
      const [y, m, d] = s.date.split("-").map(Number);
      /* تاريخ بلا يوم: يرسو منتصف الشهر وتُطوى بكرة اليوم لتلك المحطة */
      return { idx: dayIdx(y, (m || 1) - 1, d || 15), hasDay: !!d, kicker: s.kicker };
    });

    /* عرض (يوم/شهر/سنة) لكل فهرس: ميلاديًّا حسابًا مباشرًا، وهجريًّا عبر
       Intl أم القرى — لا حساب هجريّ يدويّ (التوجيه نصًّا) */
    const latinize = (s: string) => s.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
    const hijriFmt =
      TH.calendar === "hijri"
        ? new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
            timeZone: "UTC",
          })
        : null;
    const rawDay = (i: number): { dom: number; mon: number; year: number } => {
      const dt = new Date(i * DAY_MS);
      if (hijriFmt) {
        const g: Record<string, number> = {};
        for (const p of hijriFmt.formatToParts(dt)) if (p.type !== "literal") g[p.type] = Number(latinize(p.value));
        return { dom: g.day, mon: g.month - 1, year: g.year };
      }
      return { dom: dt.getUTCDate(), mon: dt.getUTCMonth(), year: dt.getUTCFullYear() };
    };

    /* جدول خلايا مدى الحكاية: أساس صفوف البكرات + عتبتا «تكّة» الشهر/السنة
       (آخر يوم فيهما) — فالشهر والسنة يتكّان كعجلة تاريخ ميكانيكية لا ينزلقان.
       المدى يضمّ يوم الزيارة صراحةً لأنه أصل أول بكرة وإن لم يكن محطة */
    const spanIdx = [todayIdx, ...stations.map((s) => s.idx)];
    const loIdx = Math.min(...spanIdx) - 1;
    const hiIdx = Math.max(...spanIdx) + 1;
    const YEAR0 = rawDay(loIdx).year;
    type DayCell = { day: number; mon: number; yearRow: number; mTick: number; yTick: number };
    const cells: DayCell[] = [];
    {
      let r = rawDay(loIdx);
      for (let i = loIdx; i <= hiIdx; i++) {
        const n = rawDay(i + 1);
        cells.push({
          day: r.dom - 1,
          mon: r.mon,
          yearRow: r.year - YEAR0,
          mTick: n.mon !== r.mon ? 1 : 0,
          yTick: n.year !== r.year ? 1 : 0,
        });
        r = n;
      }
    }
    const YEARS_N = cells[cells.length - 1].yearRow + 1;

    /* مواضع البكرات لقيمة زمن متصلة: اليوم يدور مع كل يوم (الأسرع)،
       والشهر يتكّ عند حدّه والسنة عند رأسها (الأبطأ) */
    const reelPos = (t: number) => {
      const i = Math.floor(t);
      const f = t - i;
      const c = cells[Math.min(Math.max(i - loIdx, 0), cells.length - 1)];
      return {
        day: (c.day + f) % 31,
        month: (c.mon + c.mTick * f) % 12,
        year: c.yearRow + c.yTick * f,
      };
    };

    /* --- صفوف البكرات (صف عودة مكرر يُخفي التفاف اليوم والشهر) --- */
    const fillStrip = (el: HTMLElement, labels: string[]) => {
      el.textContent = "";
      for (const l of labels) {
        const s = document.createElement("span");
        s.textContent = l;
        el.appendChild(s);
      }
    };
    const monthNames = TIME_MONTHS[TH.calendar];
    const dayLabels = Array.from({ length: 31 }, (_, i) => fmtDigits(i + 1));
    fillStrip(reelStrip.day, [...dayLabels, dayLabels[0]]); /* 32 صفًّا */
    fillStrip(reelStrip.month, [...monthNames, monthNames[0]]); /* 13 صفًّا */
    fillStrip(reelStrip.year, Array.from({ length: YEARS_N }, (_, i) => fmtDigits(YEAR0 + i)));
    const ROWS = { day: 32, month: 13, year: YEARS_N };

    /* --- معايرة الحركة --- */
    const FADE = 0.12; /* حصة أول الفصل لانطفاء التاريخ (أسرع من دخوله) */

    /* إيقاع المحطات: تسارع فاستقرار — والتتويج slot-machine:
       أول 60% دوران سريع ثم تباطؤ درامي متدرج حتى الرسوّ بثقل */
    const EASES: Record<string, (p: number) => number> = {
      founding: (p) => 1 - Math.pow(1 - p, 2.4),
      impact: (p) => 1 - Math.pow(1 - p, 1.9),
      crowning: (p) => (p < 0.6 ? p * (0.93 / 0.6) : 0.93 + 0.07 * (1 - Math.pow(1 - (p - 0.6) / 0.4, 4))),
      renewal: (p) => 1 - Math.pow(1 - p, 2.1),
    };
    const easeOf = (i: number) => EASES[TH.stations[i].id] ?? EASES.founding;

    /* --- كتّاب سريعون: transform/opacity حصرًا، وwill-change على العنصر وحده --- */
    gsap.set(timeEl, { xPercent: -50, yPercent: -50, force3D: true });
    const setTy = gsap.quickSetter(timeEl, "y", "px");
    const setTs = gsap.quickSetter(timeEl, "scale");
    const setTa = gsap.quickSetter(timeEl, "opacity");
    const setDayY = gsap.quickSetter(reelStrip.day, "y", "px");
    const setMonY = gsap.quickSetter(reelStrip.month, "y", "px");
    const setYrY = gsap.quickSetter(reelStrip.year, "y", "px");
    const setDayA = gsap.quickSetter(reelWin.day, "opacity");
    const setKickA = gsap.quickSetter(kickEl, "opacity");
    const setBlur = gsap.quickSetter(reelStrip.day, "filter") as (v: string) => void;

    /* مقاييس تُلتقط عند كل refresh (rect يتبع الـscale المطبق فيُعوَّض به) */
    const M = { rowD: 48, rowM: 48, rowY: 48, lift: 22 };
    const applied = { scale: 1, kick: -1 };
    const blurSt = { last: -1, cur: 0, shown: -1 };
    const measure = () => {
      const s = applied.scale || 1;
      M.rowD = reelStrip.day.getBoundingClientRect().height / ROWS.day / s;
      M.rowM = reelStrip.month.getBoundingClientRect().height / ROWS.month / s;
      M.rowY = reelStrip.year.getBoundingClientRect().height / ROWS.year / s;
      M.lift = window.innerHeight * 0.028;
    };

    /* --- مخرجات المنسق (تُملأ كل تحديث ثم تُطبَّق دفعة) --- */
    const out = { day: todayIdx, gate: 0, kick: 0, kickA: 0, preS: 1, preY: 0, st: 0 };
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    type TimeSeg = { a: number; b: number; run: (q: number) => void };
    let segs: TimeSeg[] = [];
    const buildSegs = () => {
      const c0 = coordTrig.start;
      const cL = coordTrig.end - coordTrig.start || 1;
      const F = (y: number) => (y - c0) / cL;
      const chT = [tlCh1, tlCh2, tlCh3, tlCh4].map((t) => t.scrollTrigger!);
      segs = [];
      let a = 0;
      const add = (b: number, run: (q: number) => void) => {
        if (b > a) segs.push({ a, b, run });
        a = Math.max(a, b);
      };

      /* hidden: طوال الافتتاح — القيمة مجهزة سلفًا على يوم الزائر */
      add(F(tlIntro.scrollTrigger!.end), () => {
        out.day = todayIdx;
        out.gate = 0;
        out.st = 0;
        out.kick = 0;
      });

      for (let i = 0; i < 4; i++) {
        const st = stTrigs[i];
        const ch = chT[i];
        /* أول محطة تنطلق من يوم الزيارة عودًا إلى التأسيس */
        const from = i === 0 ? todayIdx : stations[i - 1].idx;
        const to = stations[i].idx;
        const ez = easeOf(i);
        /* انبثاق: من الغياب إلى التاريخ كاملًا — في الممر الحر قبل كل محطة،
           صاعدًا قليلًا ومتّسعًا (والانطفاء أدناه صورتُه المعكوسة) */
        add(F(st.start), (q) => {
          out.day = from;
          out.st = i;
          out.kick = i;
          out.gate = Math.pow(q, 1.2);
          out.preS = 0.965 + 0.035 * q;
          out.preY = (1 - q) * M.lift;
          out.kickA = q;
        });
        /* قلب المحطة: الدوران المثبت نحو تاريخها */
        add(F(st.end), (q) => {
          out.day = from + (to - from) * ez(q);
          out.st = i;
          out.kick = i;
          out.kickA = 1;
        });
        /* سكون الاستقرار حتى باب الفصل */
        add(F(ch.start), () => {
          out.day = to;
          out.st = i;
          out.kick = i;
          out.kickA = 1;
        });
        /* انطفاء: أول ١٢٪ من الفصل — التاريخ يخفت صاعدًا ومنكمشًا قليلًا،
           فتخلو الخشبة للفصل نفسه (لا شبح سنةٍ خلفه) */
        add(F(ch.start + FADE * (ch.end - ch.start)), (q) => {
          out.day = to;
          out.st = i;
          out.kick = i;
          out.gate = Math.pow(1 - q, 1.2);
          out.preS = 1 - 0.035 * q;
          out.preY = -q * M.lift;
          out.kickA = Math.pow(1 - q, 3);
        });
        /* جسد الفصل: غيابٌ تام */
        add(F(ch.end), () => {
          out.day = to;
          out.st = i;
          out.kick = i;
          out.gate = 0;
        });
      }

      /* الكواليس والخاتمة: غيابٌ متّصل — آخر ظهورٍ للتاريخ محطةُ التجدّد،
         ولا تاريخ في الخاتمة (يوم الزيارة لا يقول شيئًا) */
      add(1, () => {
        out.day = stations[3].idx;
        out.st = 3;
        out.kick = 3;
        out.gate = 0;
      });
    };

    /* --- التطبيق: تحويلات وشفافية فقط --- */
    const apply = () => {
      setTs(out.preS);
      setTa(out.gate);
      setTy(out.preY);
      /* تاريخٌ بلا يوم (محطةٌ بشهر وسنة فقط): بكرة اليوم تُطوى */
      setDayA(stations[out.st].hasDay ? 1 : 0);
      setKickA(out.kickA);
      /* تبديل نص الـkicker لا يقع إلا والشفافية صفر — لا وميض نصي */
      if (out.kick !== applied.kick && out.kickA < 0.04) {
        kickEl.textContent = stations[out.kick].kicker;
        applied.kick = out.kick;
      }
      applied.scale = out.preS;
      /* البكرات تتموضع دومًا (حتى مطموسةً) كي لا يفاجئ أول ظهور بموضع فجّ */
      const p = reelPos(out.day);
      setDayY(-p.day * M.rowD);
      setMonY(-p.month * M.rowM);
      setYrY(-Math.min(Math.max(p.year, 0), ROWS.year - 1) * M.rowY);
      /* motion blur خفيف على بكرة اليوم وحدها (الأسرع) — سطح المكتب فقط */
      if (out.gate < 0.003) {
        blurSt.last = -1; /* مطموس: صفّر أساس السرعة كي لا يقفز الطمس عند العودة */
      } else if (!isMobile()) {
        let d = blurSt.last < 0 ? 0 : Math.abs(p.day - blurSt.last);
        d = Math.min(d, 31 - d);
        blurSt.last = p.day;
        const target = Math.min(2.4, Math.max(0, (d - 0.14) * 9));
        blurSt.cur += (target - blurSt.cur) * 0.28;
        if (target === 0 && blurSt.cur < 0.22) blurSt.cur = 0;
        if (Math.abs(blurSt.cur - blurSt.shown) > 0.06) {
          blurSt.shown = blurSt.cur;
          setBlur(blurSt.cur > 0 ? `blur(${blurSt.cur.toFixed(2)}px)` : "none");
        }
      }
    };

    /* --- المنسق الواحد: موضع التمرير الكلي ← (قيمة التاريخ، الحالة، التحويلات) --- */
    const coordinate = (t: number) => {
      out.gate = 1;
      out.kickA = 0;
      out.preS = 1;
      out.preY = 0;
      const g = segs.find((s) => t < s.b) ?? segs[segs.length - 1];
      if (!g) return;
      g.run(clamp01((t - g.a) / (g.b - g.a || 1)));
      apply();
    };

    /* تويـن وحيد 0→1 على امتداد القصة كلها بنفس تنعيم الفصول (scrub) —
       فيتحرك البطل وذيول الفصول بطور واحد بلا انزياح */
    const timeScroll = { t: 0 };
    const tlTime = gsap.timeline({
      scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 1, invalidateOnRefresh: true },
    });
    tlTime.to(timeScroll, { t: 1, duration: 1, ease: "none", onUpdate: () => coordinate(timeScroll.t) });
    const coordTrig = tlTime.scrollTrigger!;

    /* حدود المقاطع تُبنى بعد كل refresh (كل مواضع الـtriggers تكون قد استقرت) */
    const rebuildTime = () => {
      measure();
      buildSegs();
      coordinate(timeScroll.t);
    };
    ScrollTrigger.addEventListener("refresh", rebuildTime);

    /* ---------- زر التخطي: يظهر بعد ثانيتين ويعمل من أي نقطة ---------- */
    const skipBtn = $(".st-skip") as HTMLButtonElement;
    gsap.delayedCall(2, () => gsap.to(skipBtn, { autoAlpha: 1, duration: 0.6 }));
    let skipping = false;
    const onSkip = () => {
      if (skipping) return;
      skipping = true;
      if (STORY_CONFIG.showOncePerSession) {
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* تخزين محظور */
        }
      }
      gsap.to(root, {
        autoAlpha: 0,
        duration: 0.5,
        ease: "power2.in",
        onComplete() {
          destroy();
          root.style.display = "none";
          window.scrollTo(0, 0);
          ScrollTrigger.refresh();
        },
      });
    };
    skipBtn.addEventListener("click", onSkip);

    extraCleanup = () => {
      skipBtn.removeEventListener("click", onSkip);
      tiltOff?.();
      /* الأصناف يدويّة فلا يرفعها ctx.revert */
      gateScene.classList.remove("st-gate-active", "st-gate-release");
      particles.stop();
      dust.stop();
      splits.forEach((s) => s.revert());
      ScrollTrigger.removeEventListener("refreshInit", computeFly);
      ScrollTrigger.removeEventListener("refresh", onRefreshResize);
      ScrollTrigger.removeEventListener("refresh", rebuildTime);
    };
  }, root);

  /* بعد بناء المشاهد كلها: قياسات نهائية */
  ScrollTrigger.refresh();

  return destroy;
}
