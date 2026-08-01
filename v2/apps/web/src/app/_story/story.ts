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
import { AUDIO, AUDIO_KEY, fmtDigits, markStorySeen, STORY_ASSETS, STORY_CONFIG, TIME_MONTHS, WALL_SHOTS } from "./config";

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
  /* لا لوحة لجدار الذكريات: المشهد يجري كلّه على لوحة الهوية التي سلّمها
     الفصل الرابع، فلا تبديل ولا انقطاع لونيّ حتى تسليم الموقع نفسه. */
};

/* مسافات التثبيت (نسبة من ارتفاع الشاشة) — الجوال ×0.7، وتُعاد القراءة عند كل refresh.
   st1..st4 محطات الزمن بين الفصول، والخاتمة تسليمٌ وحده (بلا محطة تاريخ) فقَصُرت */
const PIN = { intro: 1.5, st1: 1.5, ch1: 3, st2: 1.2, ch2: 4, st3: 1.2, ch3: 3.5, st4: 1.2, ch4: 3.9, wall: 4.2, final: 1.7 };
const isMobile = () => window.matchMedia("(max-width: 767px)").matches;
const pinEnd = (factor: number) => () =>
  "+=" + Math.round(window.innerHeight * factor * (isMobile() ? 0.7 : 1));

/* عرض الشعار في مركز الشاشة — مصدرٌ واحد يحكم الشعارين معًا: الجديد (قياسه
   محسوبٌ من هدف الطيران) والقديم قبله (يقرؤه عبر --st-logo-w). فيقع التحوّل
   بين مقاسين متساويين لا بين كبيرٍ وصغير. */
const centerLogoW = () => Math.min(window.innerWidth * (isMobile() ? 0.72 : 0.55), 430);

/* حصرٌ في [٠،١] — يستعمله جدار الذكريات وبطل الوقت معًا (مصدرٌ واحد) */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

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

/* ---------- صور مرقّمة (بطاقات الفصل الثاني · صور جدار الذكريات) ----------
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
    void mountNumbered($$(".st-shot"), STORY_ASSETS.shotsDir, ".st-shot-img");
    /* محطات الزمن وصور الجدار: تظهر بتلاشٍ لطيف عند بلوغها — بلا تأرجح ولا تراجع كاميرا */
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("st-in")),
      { threshold: 0.35 }
    );
    $$(".st-station-static, .st-shot").forEach((b) => io.observe(b));
    return () => {
      io.disconnect();
      root.classList.remove("st-static");
    };
  }

  const header = document.querySelector<HTMLElement>("header");
  const headerLogo = header?.querySelector<HTMLElement>("img") ?? null;

  /* انتظار الخطوط والصور الحرجة قبل أي كشف — لا وميض */
  const fly = $(".st-newlogo") as HTMLImageElement;
  const shield = $(".st-shield") as HTMLImageElement;
  const oldLogo = await mountOldLogo($(".st-oldlogo")!);
  await Promise.allSettled([document.fonts.ready, fly.decode(), shield.decode()]);

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

    /* صور الجدار تُحمَّل وتُفكّ ترميزًا في وقت خامل أثناء هذا الفصل — مرة واحدة،
       فلا pop-in عند دخول مشهدها (والمشهد نفسه يستدعيها احتياطًا لدخولٍ عميق).
       ووصولُ الصور يغيّر مقاسات الأطر، فتُعاد هندسةُ الجدار بعده لا قبله. */
    let remeasureWall = () => {};
    const queueShots = idleOnce(() => {
      void mountNumbered($$(".st-shot"), STORY_ASSETS.shotsDir, ".st-shot-img").then(() => remeasureWall());
    });

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
       جدار الذكريات (pin +420%) — الكواليس تُعلَّق لحظةً لحظة على حائط
       عمودٌ واحد (.st-wall) يعلو بتقدّم التمرير، وفي نقطة تعليقٍ ثابتة أخفضَ
       قليلًا من وسط الشاشة تستقرّ كلُّ صورةٍ بحجمها الكامل: تدخل منزلقةً
       بميلانٍ من جهةٍ تعاكس سابقتها، ثم تتأرجح حول مسمارها بتخميدٍ سريع
       وتسكن. وحين تُعلَّق الثامنة تتراجع الكاميرا فتنكشف الثمان لوحةً واحدة.

       المشهد كلّه على لوحة الهوية الفاتحة التي سلّمها الفصل الرابع — لا
       setPalette هنا ولا تعتيم: القصة تبقى داخل الهوية حتى تسليم الموقع،
       فيصير التسليم امتدادًا لا قفزة. ولذلك سقط توأم الشعار الأبيض كلَّه.

       زمن التايملاين ١٠ وحدات = ١٠٠٪ من المقطع، فتُقرأ النبضات بالنسبة رأسًا:
         ٠–٠٫٦ الافتتاح · ٠٫٦–٦٫٢ التعليق (ثمان شرائح متساوية) ·
         ٦٫٢–٧٫٨ التراجع · ٧٫٨–٩ لحظة النصّ · ٩–١٠ الختام والتسليم.

       تقسيمُ الكتابة صارم فلا كاتبان على خاصيّةٍ واحدة:
         render()   يملك تحويلات ‎.st-wall‎ و‎.st-shot‎ كلَّها، وشفافيّةَ التعليق
                    — كلُّها دوالُّ صرفة في موضع التمرير، فالرجوع يعكس المشهد
                    حرفيًّا بلا حالةٍ داخلية.
         التايملاين يملك دخولَ كلّ صورة على ‎.st-frame‎ (عنصرٌ آخر)، وشفافيّةَ
                    الجدار وضبابيّته، والنصوص والشعار.
       ============================================================ */
    const wallScene = $(".st-wall-scene")!;
    const logoLayer = $(".st-logo-layer")!;
    const wall = $(".st-wall")!;
    const shots = $$(".st-shot");
    const frames = $$(".st-frame");
    const wallVeil = $(".st-wall-veil")!;
    const wallVeilB = $(".st-wall-veil-b")!;
    const wallKick = $(".st-wall-kicker")!;
    const wallCap = $(".st-wall-cap")!;
    const wallTrib = $(".st-wall-tribute")!;
    const wallTail = $(".st-wall-tail")!;
    const tribW = words(".st-wall-tribute");
    const tailW = words(".st-wall-tail");
    const N = WALL_SHOTS.length;

    /* --- هندسة الجدار: تُقاس ولا تُفترَض ---
       نقطة التعليق نفسها تُقرأ من CSS (‎--anchor‎ عبر offsetTop) فلا يتكرّر
       الرقم في ملفّين، والمقاسات من offsetWidth/Height (قيم تخطيطٍ لا تتأثر
       بالتحويلات الجارية) فتصحّ والصور مختلطة النِّسب. */
    /* قاع الشعار الراسي — مصدرٌ واحد يقرؤه رسوُّ الشعار وسقفُ اللوحة معًا:
       فوق الـkicker بـ١٫٥vh، ولا يعلو سقفَ الشاشة على النوافذ القصيرة */
    const logoCeil = () => Math.max(window.innerHeight * 0.06, wallKick.offsetTop - window.innerHeight * 0.015);

    /* حدود النبضات — نسبةً من المقطع (التايملاين يقرأ الأرقام نفسها ×١٠) */
    const HANG_A = 0.06;
    const HANG_B = 0.62;
    const BOARD_B = 0.78;
    const TEXT_B = 0.9;
    /* ركوبُ الصورة الحاضرة على حافّة سابقتها: رأسيًّا من ارتفاع الإطار،
       وأفقيًّا من عرضه — ولولا الثاني لما رُئي الأول، لأن الزجزاج يفصل
       الصورتين فتتقاطع صناديقُهما رأسيًّا ولا تتلامسان على الشاشة. */
    const OVERLAP = 0.075;
    const HOVERLAP = 0.22;
    const out2 = (v: number) => 1 - Math.pow(1 - v, 2); /* power2.out بلا تويـن */
    /* منظورٌ بسيط: ما علا في العمود صغر — ولم يخفت. الصورة تبقى بلونها
       وحدّتها كاملةً حتى آخر بكسل، والاختفاء كلُّه على الحدّ لا في الكرت
       (فلا شفافيةَ صاعدةٍ ولا ضبابية على أي بطاقة في أي إطار). */
    const depth = (d: number) => ({ s: 1 - 0.055 * Math.min(Math.max(d, 0), 3.2) });

    const G = {
      step: 0,
      anchor: 0,
      comp: 0, /* معامل انضغاط المنظور فوق نقطة التعليق (منه يقع التراكب) */
      col: [] as Array<{ x: number; y: number }>,
      end: [] as number[], /* إزاحةُ كلّ صورةٍ لحظةَ انتهاء التعليق — مبدأ التراجع */
      board: [] as Array<{ x: number; y: number; s: number }>,
      zoom: 0.4, /* مقاس اللوحة الوسطيّ — إليه تتراجع الكاميرا قبل انسياب الخانات */
    };

    /* --- منظورُ العمود: ما نزل عن نقطة التعليق تباعدَ كاملًا (فتبقى القادمة
           تحت الشاشة يسترها الحجاب السفليّ)، وما علاها انضغط تدريجيًّا فركبت
           الصورةُ الحاضرة حافّةَ سابقتها بالنسبة المطلوبة — كجدارٍ حقيقيّ
           تُعلَّق فيه الصورة على طرف التي قبلها.
             m(d) = d                       عند d ≤ 0  (أسفل النقطة: تباعدٌ كامل)
             m(d) = d(1−r) + r(1−e^−d)      عند d > 0  (أعلاها: انضغاط)
           والدالّة C¹ عند الصفر (المشتقّة ١ من الطرفين) فلا انكسارَ سرعةٍ حين
           تعبر صورةٌ النقطة، ومشتقّتها موجبةٌ دومًا فلا انعكاسَ ترتيب. */
    const mOf = (d: number) => (d <= 0 ? d : d * (1 - G.comp) + G.comp * (1 - Math.exp(-d)));
    /* تصحيحُ الانضغاط عن الموضع الخطّيّ — صفرٌ لكل ما لم يعلُ النقطة بعد،
       فتبقى الحركة الكبرى على ‎.st-wall‎ وحده (عنصرٌ واحد) */
    const compOf = (d: number) => (d <= 0 ? 0 : -G.step * (mOf(d) - d));

    const measureWall = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const m = isMobile();
      G.anchor = wall.offsetTop;
      /* المسافة الأصليّة بين خانتين — تُقاس أسفلَ نقطة التعليق حيث لا انضغاط:
         أكبرُ من ارتفاع الصورة لزامًا، فتبقى القادمةُ كلُّها تحت الشاشة
         يسترها الحجاب السفليّ ولا تنازع الحاضرةَ لحظتَها. */
      G.step = vh * (m ? 0.42 : 0.54);
      const fhMax = Math.max(...frames.map((f) => f.offsetHeight), 1);
      const fwMax = Math.max(...frames.map((f) => f.offsetWidth), 1);
      /* الإزاحة الجانبيّة: قدرُها ما يترك بين الصورتين تراكبًا أفقيًّا بـ
         HOVERLAP من العرض — ومحدودةٌ بهامشٍ يكفي شرطاتِ الفصول على الحافّة
         (٢٦px مطلقة) فلا تلامسها الصورة على الشاشات الضيّقة */
      const offset = Math.min(
        (fwMax * (1 - HOVERLAP)) / 2,
        Math.max(0, (vw - fwMax) / 2 - Math.max(vw * 0.03, 26))
      );
      G.col = WALL_SHOTS.map((s, i) => ({ x: s.side * offset, y: i * G.step }));

      /* معامل الانضغاط يُشتقّ من نسبة التراكب المطلوبة، فتصحّ على كل مقاسٍ
         ومع أيّ ارتفاعِ صورة: تركب الحاضرةُ حافّةَ سابقتها بـOVERLAP من
         ارتفاع الإطار. (والسابقة أصغرُ بمقدار depth(1) فيدخل في الحساب) */
      const m1 = (fhMax * ((1 + depth(1).s) / 2 - OVERLAP)) / G.step;
      G.comp = Math.min(0.9, Math.max(0, (1 - m1) * Math.E));
      G.end = WALL_SHOTS.map((_, i) => -G.step * mOf(N - 1 - i));

      /* مدى الذوبان على الحدّين — واحدٌ لهما فيُقرآن أثرًا واحدًا لا أثرين.
         سقفُه الفراغُ الحقيقيّ أسفل الصورة الحاضرة قبل سقف الخانة القادمة
         (G.step − ارتفاع الإطار)، وهو أضيق الفراغين؛ فلو تجاوزه لظهر من
         القادمة خيطٌ فوق الحدّ. يكتبه JS لأن هندسة العمود ملكه، وCSS يقرأ. */
      wallScene.style.setProperty("--edge-fade", Math.round(Math.max(28, G.step - fhMax - 20)) + "px");

      /* اللوحة: أربعة أعمدة × صفّين (الجوال عمودان × أربعة صفوف).
         سقفُها حدّان لا واحد: أسفلَ قاع الشعار بصندوق أمانٍ ٥vh، وأسفلَ آخر
         التدرّج (وإلّا غسل الحجابُ صفَّها العلويّ وهو مستقرّ). ومقاسُ كلّ
         صورةٍ يُشتقّ من مقاسها التخطيطيّ الفعليّ فتملأ خانتها بلا قصّ. */
      const cols = m ? 2 : 4;
      const rows = Math.ceil(N / cols);
      const padX = vw * (m ? 0.07 : 0.12);
      const gapX = vw * (m ? 0.045 : 0.024);
      const gapY = vh * (m ? 0.022 : 0.04);
      const ceil = logoCeil(); /* قاع الشعار الراسي — المصدر نفسه الذي يقرؤه logoGeom */
      const top = Math.max(ceil + vh * 0.05, wallVeil.offsetHeight + vh * 0.01);
      /* ٩٠٪ لا ٩٦٪: تحت اللوحة يبقى مقدارُ نزولها في لحظة النصّ (٦vh)، فلا
         يخرج صفُّها الأخير عن الشاشة وهي تهدأ وتنسحب */
      const bottom = vh * 0.9;
      const cellW = (vw - padX * 2 - gapX * (cols - 1)) / cols;
      const cellH = (bottom - top - gapY * (rows - 1)) / rows;
      const size = WALL_SHOTS.map((_, i) => {
        const fw = frames[i].offsetWidth || 1;
        const fh = frames[i].offsetHeight || 1;
        const s = Math.min(cellW / fw, cellH / fh);
        return { s, h: fh * s };
      });
      /* ارتفاع كل صفٍّ بأطول صورةٍ فيه، ثم تُمركز اللوحة في الفراغ الفعليّ
         (بين قاع الشعار وقاع الشاشة) لا في إطارها — فيتساوى الفراغ فوقها
         وتحتها بدل أن تجلس ثقيلةً في نصفٍ ويخلو النصف الآخر. */
      const rowH: number[] = [];
      for (let r = 0; r < rows; r++)
        rowH.push(Math.max(...size.slice(r * cols, (r + 1) * cols).map((z) => z.h)));
      const boardH = rowH.reduce((a, b) => a + b, 0) + gapY * (rows - 1);
      const cTop = Math.max(top, Math.min((ceil + vh) / 2 - boardH / 2, bottom - boardH));
      const rowY: number[] = [];
      for (let r = 0, acc = cTop; r < rows; r++) {
        rowY.push(acc + rowH[r] / 2 - G.anchor);
        acc += rowH[r] + gapY;
      }
      G.board = WALL_SHOTS.map((_, i) => ({
        /* الخانة الأولى يمينًا: اللوحة تُقرأ كما تُقرأ الصفحة */
        x: ((cols - 1) / 2 - (i % cols)) * (cellW + gapX),
        y: rowY[Math.floor(i / cols)],
        s: size[i].s,
      }));
      G.zoom = G.board.reduce((a, b) => a + b.s, 0) / N;
    };

    /* التمركز بيد GSAP وحده (كبطل الوقت) — لا translate في CSS كي لا يتصارع الكاتبان */
    gsap.set(wall, { force3D: true });
    gsap.set(shots, { xPercent: -50, yPercent: -50, force3D: true });
    measureWall();
    remeasureWall = () => {
      measureWall();
      render(tlWall.scrollTrigger?.progress ?? 0);
    };

    const setWallY = gsap.quickSetter(wall, "y", "px");
    const setCapA = gsap.quickSetter(wallCap, "opacity");
    const sX = shots.map((el) => gsap.quickSetter(el, "x", "px"));
    const sY = shots.map((el) => gsap.quickSetter(el, "y", "px"));
    /* scaleX/scaleY لا «scale»: المختصر يتوسّع في CSSPlugin ولا يمرّ بمسار
       quickSetter السريع، فيخرج نداؤه بلا أثر (كتابةٌ صامتة لا تُرى) */
    const sS = shots.map((el) => {
      const x = gsap.quickSetter(el, "scaleX");
      const y = gsap.quickSetter(el, "scaleY");
      return (v: number) => {
        x(v);
        y(v);
      };
    });

    /* --- إيقاع العمود: يتمهّل عند كلّ صورة ولا يتجمّد أبدًا ---
       الحركة المتقطّعة (وقفةٌ تامّة ثم قفزة) تُقرأ تحت التمرير المربوط
       «قفزة» لا إيقاعًا: التمريرُ داخل الوقفة لا يحرّك شيئًا ثم يقفز الجدارُ
       خطوةً كاملة. فبديلُها موجةٌ ناعمة مشتقّتها موجبةٌ دومًا — أبطأُ ما تكون
       عند الصورة (فتُقرأ مُهلةً) وأسرعُ ما تكون بين صورتين، بلا صفرٍ ولا
       انكسار. LINGER يضبط عمق المُهلة: ٠ إيقاعٌ خطّيّ · ١ وقفةٌ تامّة. */
    const LINGER = 0.72;
    const glide = (f: number) => f - (LINGER / (2 * Math.PI)) * Math.sin(2 * Math.PI * f);
    const shown = { idx: -1 };

    /* --- نبضة التعليق: العمود يسير متمهّلًا عند كلّ صورة، ويقود الصورَ
           فوقه منظورٌ ينضغط فتركب الحاضرةُ حافّةَ سابقتها --- */
    const renderHang = (p: number) => {
      /* سبعُ نقلاتٍ لا ثمانٍ: من الخانة ٠ إلى الخانة ٧ */
      const t = clamp01((p - HANG_A) / (HANG_B - HANG_A)) * (N - 1);
      const i = Math.min(N - 2, Math.floor(t));
      const u = i + glide(Math.min(1, t - i)); /* فهرسٌ متّصل يقود العمود */
      const wy = -u * G.step;
      setWallY(wy);
      for (let k = 0; k < N; k++) {
        sX[k](G.col[k].x);
        sY[k](G.col[k].y + compOf(u - k));
        sS[k](depth(u - k).s);
      }
      /* الحاضرة هي أقربُ خانةٍ إلى نقطة التعليق، والتعليق يظهر كلّما اقتربت
         منها ويخفت بين الاثنتين — فالتبديل لا يقع إلا وشفافيّته صفر */
      const near = Math.round(u);
      const off = Math.abs(u - near);
      if (near !== shown.idx) {
        shown.idx = near;
        wallCap.textContent = WALL_SHOTS[near].cap;
        wallCap.dataset.side = String(WALL_SHOTS[near].side);
      }
      setCapA(clamp01((0.34 - off) / 0.16));
    };

    /* --- نبضة التراجع: كاميرا تنكمش حقًّا حول نقطة التعليق، ثم ينساب العمود
           المنكمش إلى خاناته لوحةً. عمودٌ من ثمانٍ لا يصير لوحةً متوازنة
           بانكماشٍ وحده مهما صغر (شريطٌ رفيع لا لوحة)، فالانكماش يحمل إحساس
           التراجع والانسياب يحمل معناه — والمرحلتان متداخلتان فلا تُقرآن اثنتين.
           والجدار عند هذه النبضة في ‎y = 0‎ وإزاحةُ العمود مطويّةٌ في مواضع
           الصور، فالانتقال من نبضة التعليق متّصلٌ إطارًا بإطار. --- */
    const renderBoard = (p: number) => {
      const q = clamp01((p - HANG_B) / (BOARD_B - HANG_B));
      const z = 1 - (1 - G.zoom) * out2(Math.min(1, q / 0.62));
      const w = out2(clamp01((q - 0.3) / 0.7));
      /* لحظة النصّ: اللوحة تنزل قليلًا وتنسحب أثرًا بعيدًا (الضبابية والشفافية
         على التايملاين — هذه إزاحةٌ لا غير) */
      setWallY(window.innerHeight * 0.06 * out2(clamp01((p - BOARD_B) / (TEXT_B - BOARD_B))));
      for (let k = 0; k < N; k++) {
        const c = G.col[k];
        const b = G.board[k];
        const d = depth(N - 1 - k);
        /* المبدأ هو حالُ العمود المنضغط لحظةَ انتهاء التعليق (G.end) — فيلتحم
           الطرفان إطارًا بإطار مهما تغيّر المنظور */
        sX[k](c.x * z * (1 - w) + b.x * w);
        sY[k](G.end[k] * z * (1 - w) + b.y * w);
        sS[k](d.s * z * (1 - w) + b.s * w);
      }
      setCapA(0);
    };

    const render = (p: number) => {
      if (!G.col.length) return;
      if (p < HANG_B) renderHang(p);
      else renderBoard(p);
    };

    const tlWall = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: wallScene,
        start: "top top",
        end: pinEnd(PIN.wall),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        /* will-change لا يعيش إلا داخل المشهد */
        onToggle(self) {
          wallScene.classList.toggle("st-wall-active", self.isActive);
          if (self.isActive) queueShots(); /* دخولٌ عميق لم يمرّ بالفصل الثالث */
        },
        onRefresh(self) {
          /* الهندسة تُقاس بعد كل تغيّر مقاس، ثم يُعاد الرسم على الموضع الحالي
             فورًا — فلا إطارٌ واحد بقياسٍ قديم */
          measureWall();
          render(self.progress);
          wallScene.classList.toggle("st-wall-active", self.isActive);
        },
        onUpdate(self) {
          render(self.progress);
        },
      },
    });

    /* --- ٠) الافتتاح (٠→٦٪): يرسو الشعار أعلى الشاشة على حجابه، ويظهر
           الـkicker تحته خارج مسار العمود --- */
    /* رفعة الشعار ومقاسه يُحسبان ولا يُقدَّران، من موضع الـkicker الفعليّ
       (offsetTop — قيمة تخطيطٍ لا تتأثر بتحويلات الدخول): قاعُ الشعار يقف
       فوقه، والـkicker نفسه داخل المنطقة الصمّاء من الحجاب — فلا يمرّ خلف
       أيّهما شيءٌ من العمود، ولا يتقاطع الاثنان على نافذةٍ قصيرة (landscape
       الجوال) لأن المقاس ينكمش بدل أن يفيض عن الشاشة.
       ومنشأ تحويل الطبقة عند ٤٢٪ (CSS) — وهو ارتفاع مركز الشعار نفسه — فلا
       يزحف الانكماشُ بالمركز ويكذّب الحساب. */
    const logoGeom = () => {
      const vh = window.innerHeight;
      const ratio = fly.naturalWidth ? fly.naturalHeight / fly.naturalWidth : 0.35;
      const natural = centerLogoW() * ratio; /* ارتفاعه بحجمه المركزيّ */
      const ceil = logoCeil();
      const s = Math.max(0.12, Math.min(0.5, (ceil - vh * 0.02) / natural));
      /* مركزه قبل الرفع عند ٤٢٪ من الشاشة (من هندسة الطيران) */
      return { s, y: Math.min(0, ceil - (natural * s) / 2 - vh * 0.42) };
    };

    /* تثبيتُ اللوحة على الهوية: في التصفّح الطبيعيّ تويـنٌ من الهوية إلى
       الهوية — لا أثر له البتّة. وفي الدخول العميق (إعادة تحميلٍ في منتصف
       القصة، أو استرجاع المتصفّح لموضع التمرير) قد يكون آخرُ من كتب اللوحة
       محطةَ التجدّد لا الفصل الرابع، فيستردّها المشهد في أول ٤٪ بدل أن يجري
       على لوحةٍ لا يملكها. */
    setPalette(tlWall, identity, 0, 0.4);
    tlWall
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
      .fromTo(wallVeil, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, immediateRender: false }, 0)
      .fromTo(wallVeilB, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, immediateRender: false }, 0)
      .fromTo(
        wallKick,
        { autoAlpha: 0, y: -12 },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", immediateRender: false },
        0.15
      );

    /* --- ١) التعليق (٦→٦٢٪): سبعُ نقلاتٍ متساوية (٨٪ من المقطع لكلٍّ) —
           صعودُ العمود يقوده render أعلاه، وهذه حركةُ دخولٍ واحدة على
           ‎.st-frame‎ وحده، **أحاديّة الاتجاه لا تعكس نفسها في أي إطار**:
           ميلانٌ يقلّ، وإزاحةٌ تقصر، ومقاسٌ يكبر، وضبابيةٌ تزول — كلُّها
           power3.out. لا back ولا elastic ولا bounce ولا تجاوزَ البتّة:
           تحت التمرير المربوط يملك الزائرُ الزمن، فكلُّ ارتدادٍ يُقرأ
           ارتجاجًا لا نعومة.

           والنافذة قدرُها نقلةٌ كاملة تنتهي قُبيل بلوغ الصورةِ نقطةَ التعليق:
           فتصل مستقرّةً تمامًا ثم تتمهّل عندها، ولا تبدأ التالية دخولها إلا
           بعد استقرار سابقتها. وهذا سقفُ ما تحتمله سبعُ نقلات: أيّ نافذةٍ
           أوسع من النقلة تجعل بطاقتين داخلتين معًا — والشرطان لا يجتمعان. --- */
    const STRIDE = ((HANG_B - HANG_A) * 10) / (N - 1);
    shots.forEach((_, i) => {
      const s = WALL_SHOTS[i];
      const fr = frames[i];
      /* لحظةُ بلوغ الصورة i نقطةَ التعليق، والدخول ينتهي قبلها بهامشٍ صغير */
      const arrive = HANG_A * 10 + i * STRIDE - 0.05;
      const at = Math.max(0, arrive - STRIDE);
      const dur = Math.max(0.2, arrive - at);
      tlWall
        .fromTo(
          fr,
          {
            x: () => s.side * window.innerWidth * 0.4,
            rotation: s.rotIn,
            scale: 0.96,
            filter: "blur(5px)",
          },
          {
            x: 0,
            rotation: s.rot,
            scale: 1,
            filter: "blur(0px)",
            duration: dur,
            ease: "power3.out",
            immediateRender: false,
          },
          at
        )
        /* الظهور تدريجيّ على أول ٦٠٪ من النافذة — لا قفزةَ شفافية */
        .fromTo(
          fr,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: dur * 0.6, ease: "power2.out", immediateRender: false },
          at
        );
    });

    /* --- ٢) التراجع (٦٢→٧٨٪): الهندسة كلّها في render — وهنا انسحابُ ما
           لا يخدم اللوحة: الـkicker وحدُّ الأسفل (والتعليق شفافيّته في render).
           وحدُّ الأعلى يبقى: اللوحة تنحدر من فوقه فتخرج منه ذوبانًا. --- */
    tlWall
      .fromTo(wallKick, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.4, immediateRender: false }, 6.25)
      .fromTo(wallVeilB, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.4, immediateRender: false }, 6.25);

    /* --- ٣) لحظة النصّ (٧٨→٩٠٪): اللوحة تهدأ وتنسحب أثرًا بعيدًا، وعلى خلفيةٍ
           فاتحةٍ خالية يُقرأ السطر التكريميّ كلمةً-كلمةً. التباين هنا مضمونٌ
           بطبيعته (حبرٌ داكن على خلفية الهوية) — فلا طبقة تعتيم البتّة. --- */
    tlWall
      .fromTo(
        wall,
        { opacity: 1, filter: "blur(0px)" },
        { opacity: 0.1, filter: "blur(6px)", duration: 0.55, ease: "power2.out", immediateRender: false },
        7.8
      )
      .fromTo(wallTrib, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, immediateRender: false }, 8.05)
      .fromTo(tribW, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.07, ease: "power3.out" }, 8.15);

    /* --- ٤) الختام (٩٠→١٠٠٪): يخلو المسرح تمامًا، فيدخل السطر الخاتم ويعود
           الشعار إلى المركز ليتسلّم بقيّة الخاتمة. لا معالجة انتقالٍ لونيّ:
           الخلفية أصلًا لون الموقع، فتسليم Flip يجد اللون ذاته. --- */
    tlWall
      .fromTo(wallTrib, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.2, immediateRender: false }, 8.95)
      .to(wall, { opacity: 0, duration: 0.25 }, 8.95)
      .fromTo(wallVeil, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25, immediateRender: false }, 8.95)
      .fromTo(wallTail, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, 9.2)
      .fromTo(tailW, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06, ease: "power3.out" }, 9.23)
      .fromTo(
        logoLayer,
        { y: () => logoGeom().y, scale: () => logoGeom().s },
        { y: 0, scale: 1, duration: 0.55, ease: "power2.inOut", immediateRender: false },
        9.25
      )
      /* ختام المشهد كختام الفصل الرابع: مُهلةُ قراءةٍ ثم يصعد السطر ويخفت
         داخل التثبيت. طبقة الشعار ثابتة (fixed) لا تسير مع المشهد؛ فلو بقي
         السطر ظاهرًا حين يُفلت التثبيت لعبر من خلف الشعار وهو يصعد. */
      .to(wallTail, { y: -34, autoAlpha: 0, duration: 0.18, ease: "power2.in" }, 9.82);

    /* ============================================================
       الخلفية الصوتية
       نسختان من الملفّ تتبادلان الدور: تصعد الثانية في آخر AUDIO.crossfade
       ثانية من الأولى بمزجٍ متساوي القدرة (جذر الوزن) فلا تُسمَع وصلةُ
       التكرار — والمقطوعة كاملةٌ تنتهي بتلاشٍ، فعودتُها من الصفر بلا مزجٍ
       تُسمَع انقطاعًا. والمستويات تُحسب في تكّة GSAP نفسها (لا مؤقّت ثانٍ
       ولا timeupdate الخشن) فتتبع تلاشي الخاتمة إطارًا بإطار.

       التشغيل يبدأ من أوّل تفاعلٍ حقيقيّ لأن المتصفّح يمنع ما قبله، والزرّ
       مخرجُ من رفَضه المتصفّحُ ومَخرجُ من أراد الصمت — واختيارُه يُحفظ للجلسة.
       والملفّ يُجلَب في وقتٍ خامل مبكّر لا عند النقرة، فلا يبدأ متأخّرًا.
       ============================================================ */
    const soundBtn = $(".st-sound") as HTMLButtonElement;
    /* المشغّلان في شجرة القصة لا معلَّقَين في الهواء: عنصر ‎audio‎ بلا ‎controls‎
       لا يرسم شيئًا ولا يشغل مقاسًا، ووجوده في الشجرة يجعله يزول معها إن رُفعت
       ويجعل حالته مقروءةً للفحص. */
    const theme = [0, 1].map(() => {
      const a = new Audio();
      a.className = "st-audio"; /* display:none — وإلّا فتح عنصرٌ سطريٌّ صندوقَ
                                   سطرٍ مجهولًا داخل الجذر فأزاح التخطيط */
      a.src = STORY_ASSETS.theme;
      a.preload = "none";
      a.volume = 0;
      root.appendChild(a);
      return a;
    });
    /* حالة الصوت — عاملان مستقلّان لا يتصارعان على قيمةٍ واحدة:
         inFade تلاشي الدخول (one-shot عند أوّل تشغيل)
         exit   تلاشي الخروج (يقوده تمريرُ الخاتمة)
       والمستوى حاصلُ ضربهما، فلو وقع أوّل تفاعلٍ أثناء الخاتمة لم يُلغِ
       أحدُهما الآخر. on رغبة الزائر · started أُذن له فعلًا. */
    const snd = { inFade: 1, exit: 1, gain: 0, on: false, started: false, cur: 0 };
    try {
      snd.on = sessionStorage.getItem(AUDIO_KEY) !== "off";
    } catch {
      snd.on = true; /* تخزين محظور — الافتراض التشغيل */
    }
    const paintSound = () => {
      const live = snd.on && snd.started;
      soundBtn.dataset.on = live ? "1" : "0";
      soundBtn.setAttribute("aria-pressed", snd.on ? "true" : "false");
      /* سطرُ الافتتاحية المعرّف بالخلفية يزول متى صارت مسموعة — لا يبقى يدعو
         إلى ما وقع (مصدرٌ واحد للحالة: هذه الدالّة وحدها تكتبها) */
      root.classList.toggle("st-sound-live", live);
    };
    paintSound();

    /* الجلب المبكّر: بعد الكشف بوقتٍ خامل — لا ينافس المحتوى الحرج ولا ينتظر
       النقرة، فيكون مخزَّنًا حين يُؤذَن بالتشغيل */
    const loadTheme = idleOnce(() => {
      theme[0].preload = "auto";
      theme[0].load();
    });
    loadTheme();

    const tickAudio = (_t: number, dt: number) => {
      const a = theme[snd.cur];
      const b = theme[1 - snd.cur];
      /* الكسب المطلوب: تربيعُ العاملين لا حاصلُهما — الأذن لوغاريتميّة، فالهبوط
         الخطّيّ يُبقي الصوت عاليًا ثم يهوي في آخره (يُسمَع قطعًا). التربيع يجعل
         النزول متساويًا بالديسيبل تقريبًا: نصفُ الطريق = ‎−١٢dB‎ لا ‎−٦‎. */
      const p = snd.on && snd.started ? snd.inFade * snd.exit : 0;
      const want = AUDIO.volume * p * p;
      /* مُنعِّم زمنيّ (مرشّح أُسّيّ): سقفٌ لسرعة تغيّر الكسب مهما قفز التمرير —
         بلا هذا يصير تلاشي الخاتمة قطعًا لمن يمرّ بها بسرعة. */
      snd.gain += (want - snd.gain) * (1 - Math.exp(-Math.min(dt, 100) / (AUDIO.smooth * 1000)));
      if (want === 0 && snd.gain < 0.0004) snd.gain = 0;
      const vol = snd.gain;
      /* الصمت التامّ يُوقف المشغّلين، وعودةُ الكسب تُعيدهما — فالرجوع بالتمرير
         يُرجع الصوت كما يُرجع الصورة */
      if (vol === 0) {
        theme.forEach((x) => !x.paused && x.pause());
        a.volume = 0;
        b.volume = 0;
        return;
      }
      if (a.paused && snd.on && snd.started) void a.play().catch(() => {});
      const d = a.duration;
      let w = 1; /* وزن المقطوعة الحاضرة: ١ ما لم تدخل نافذة المزج */
      if (Number.isFinite(d) && d > AUDIO.crossfade && d - a.currentTime <= AUDIO.crossfade) {
        w = Math.max(0, (d - a.currentTime) / AUDIO.crossfade);
        if (b.paused && vol > 0) {
          b.preload = "auto";
          b.currentTime = 0;
          void b.play().catch(() => {});
        }
      }
      /* مزجٌ متساوي القدرة: مجموع مربّعي الوزنين واحد، فلا هبوطَ مستوى وسطه */
      a.volume = Math.min(1, vol * Math.sqrt(w));
      b.volume = Math.min(1, b.paused ? 0 : vol * Math.sqrt(1 - w));
      if (w <= 0 && !b.paused) {
        a.pause();
        a.currentTime = 0;
        snd.cur = 1 - snd.cur;
      }
    };
    gsap.ticker.add(tickAudio);

    /* ============================================================
       دعوةُ الصوت — دعوةٌ لا تشغيل
       التمرير لا يفتح الصوت في أيّ متصفّح (ليس من الأحداث المانحة للإذن)، لكنّه
       دليلُ زائرٍ حاضر: فعند أوّل تمريرٍ حقيقيّ ينبض المفتاح نبضتين ومعه تلميحةٌ
       تعرّف بالخلفية، ثمّ يهدأ ولا يعود. ومن سمِع أو نقر لم يُدعَ أصلًا.
       ============================================================ */
    let hudShown = false; /* كُشف المفتاح (بعد ثانيتين) — لا تنبض على خفيّ */
    let hintDue = false; /* جاء التمرير قبل الكشف — تنتظر الدعوةُ ظهورَه */
    let hinted = false;
    const endHint = () => {
      hinted = true;
      delete soundBtn.dataset.hint;
    };
    const showHint = () => {
      if (hinted || snd.started || !snd.on) return;
      hinted = true;
      soundBtn.dataset.hint = "1";
      gsap.delayedCall(6, endHint);
    };
    const onFirstScroll = () => {
      if (window.scrollY < 60) return; /* استعادةُ موضعٍ أو ارتجاجة — ليست تمريرًا */
      lenis.off("scroll", onFirstScroll);
      if (hudShown) showHint();
      else hintDue = true;
    };
    lenis.on("scroll", onFirstScroll);

    /* الأحداث المانحة للإذن ليست كلَّ تفاعل: المواصفة تعدّ منها ضغطةَ المفتاح
       ورفعَ الإصبع والنقرة — لا التمرير ولا مجرّدَ ملامسة الشاشة. ولذلك لا
       ‎once‎ هنا: سحبةُ التمرير على الجوّال تلمس ولا تنقر، فلو نزعت المستمعَ
       ضاعت الخلفية بقيّة الزيارة. النزع عند نجاح ‎play‎ وحده. */
    const GESTURES = ["pointerup", "touchend", "keydown", "click"] as const;
    let trying = false; /* وعدُ play معلّق */
    let again = false; /* جاءت لفتةٌ أثناءه — أعِد المحاولة عند حسمه */
    const startAudio = () => {
      if (!snd.on) return;
      if (snd.started) {
        /* لفتةٌ أثناء محاولةٍ معلّقة: قد تكون هي المانحةَ للإذن والمعلّقةُ سبقته */
        if (trying) again = true;
        return;
      }
      trying = true;
      /* رفعُ started قبل play متفائلًا: تكّة الصوت تُوقف كلّ مشغّلٍ ليس started
         فتقطع التشغيل قبل أن يُحسم الوعد */
      snd.started = true;
      paintSound();
      /* تلاشي الدخول: على inFade فيمرّ عبر tickAudio كسائر المستويات */
      snd.inFade = 0;
      gsap.to(snd, { inFade: 1, duration: AUDIO.fadeIn, ease: "none", overwrite: "auto" });
      const a = theme[snd.cur];
      a.preload = "auto";
      void Promise.resolve(a.play()).then(
        () => {
          trying = false;
          again = false;
          disarm(); /* اشتغل فعلًا — لا حاجة إلى لفتةٍ بعده */
          endHint();
        },
        () => {
          /* رفض المتصفّح — الزرّ يبقى المخرج، والمستمعون يبقون مسلَّحين */
          trying = false;
          snd.started = false;
          paintSound();
          if (again) {
            again = false;
            startAudio();
          }
        }
      );
    };
    /* capture كي يسبق أي مستهلكٍ يوقف الانتشار — ولأنّه يسبق، يُستثنى زرّان:
       مفتاحُ الصوت (وإلّا شغّلَتْه اللفتةُ ثمّ أطفأه مستمعُ الزرّ في النقرة
       نفسها) وزرُّ التخطّي (القصة تُطوى بعده، فلا معنى لخلفيةٍ تصعد لتصمت). */
    const firstGesture = (e: Event) => {
      if ((e.target as Element | null)?.closest?.(".st-sound, .st-skip")) return;
      startAudio();
    };
    const disarm = () => GESTURES.forEach((e) => window.removeEventListener(e, firstGesture, { capture: true }));
    GESTURES.forEach((e) => window.addEventListener(e, firstGesture, { capture: true, passive: true }));

    const onSound = () => {
      endHint(); /* وجد المفتاح بنفسه — لا دعوةَ بعد اليوم */
      /* الزرّ يقلب ما يُرى لا ما يُنوى: قبل أوّل تشغيلٍ يبدو مكتومًا (data-on
         يقرأ started لا on)، فنقرتُه طلبُ تشغيلٍ لا إسكات — ولولا هذا لأطفأ
         أوّلُ نقرٍ عليه رغبةً هي أصلًا قائمة فبدا الزرّ معطّلًا. */
      snd.on = !(snd.on && snd.started && !trying);
      try {
        sessionStorage.setItem(AUDIO_KEY, snd.on ? "on" : "off");
      } catch {
        /* تخزين محظور */
      }
      /* التشغيل من داخل معالج النقرة نفسها — هنا الإذن مضمون. والاستئنافُ بعد
         إسكاتٍ يتكفّل به tickAudio (يعيد المشغّل متى عاد الكسب)، فلا يُصفَّر
         started ولا تُستأنف المقطوعة من أوّلها. */
      if (snd.on) startAudio();
      /* الإيقاف يتركه للمُنعِّم في tickAudio: يهبط الكسب ثمّ يقف — لا قطعَ فجّ */
      else paintSound();
    };
    soundBtn.addEventListener("click", onSound);

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
      gsap.set(fly, { left: tLeft, top: tTop, width: tW });
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
          markStorySeen(); /* بلغت الخاتمة — لا تُعاد في هذه الجلسة */
        },
      },
    });

    /* نفَسٌ قصير (الشعار مركزيّ والـHUD يخفت) ثم الانتقال — مسافةُ كل نبضة
       من التمرير كما كانت، وإنما حُذف نصفُ المحطة الميت من أول الخاتمة */
    tlFinal
      .to(hud, { autoAlpha: 0, duration: 1.5 }, 0)
      .fromTo(
        fly,
        { x: () => flyState.x, y: () => flyState.y, scale: () => flyState.scale },
        { x: 0, y: 0, scale: 1, duration: 3.4, ease: "power3.inOut" },
        1.2
      )
      .to(bg, { autoAlpha: 0, duration: 3.2 }, 1.8)
      .to(grain, { autoAlpha: 0, duration: 2 }, 2);
    if (header) tlFinal.to(header, { autoAlpha: 1, duration: 2.6 }, 2.8);
    /* عند اكتمال المطابقة (±2px) يحلّ شعار الهيدر الحقيقي محلّ الطائر بلا وميض */
    tlFinal.to(fly, { autoAlpha: 0, duration: 0.3 }, 5.3);
    /* الخلفية الصوتية تخفت مع الخشبة نفسها وتصمت عند اكتمال التسليم — فالموقع
       يُستلَم في سكون. مربوطٌ بالتمرير كسائر النبضات، فالرجوع يعيد الصوت.
       والقائد خطّيّ: منحنى السمع مطبَّقٌ مرّةً واحدة على الكسب في tickAudio،
       فلو أضيف هنا ease لتضاعف الانحناء وعاد الهبوط متأخّرًا فجًّا. */
    tlFinal.to(snd, { exit: 0, duration: 3.4, ease: "none" }, 1.8);

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
    gsap.delayedCall(2, () => {
      gsap.to([skipBtn, soundBtn], { autoAlpha: 1, duration: 0.6 });
      hudShown = true;
      if (hintDue) showHint(); /* مرّر قبل الكشف — تنبض الآن وقد صارت مرئيّة */
    });
    let skipping = false;
    const onSkip = () => {
      if (skipping) return;
      skipping = true;
      /* التخطّي صمتٌ فوريّ: تلاشٍ قصيرٌ مع تلاشي القصة نفسها لا قطعٌ فجّ */
      gsap.to(snd, { exit: 0, duration: 0.45, ease: "none", overwrite: "auto" });
      markStorySeen(); /* التخطّي رؤيةٌ أيضًا — لا تُعاد في هذه الجلسة */
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
      soundBtn.removeEventListener("click", onSound);
      disarm();
      lenis.off("scroll", onFirstScroll);
      root.classList.remove("st-sound-live");
      /* المشغّلان يدويّان فلا يرفعهما ctx.revert — يُوقفان ويُفرَّغان */
      gsap.ticker.remove(tickAudio);
      theme.forEach((a) => {
        a.pause();
        a.removeAttribute("src");
        a.remove();
      });
      tiltOff?.();
      /* الأصناف يدويّة فلا يرفعها ctx.revert */
      wallScene.classList.remove("st-wall-active");
      particles.stop();
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
