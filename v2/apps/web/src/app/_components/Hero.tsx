"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { MeBrief } from "@/app/api/me/brief/route";

/**
 * **صدرُ الهبوط** — تخطيطُ المالك مُنفَّذًا بلغة أدِيب (٢٠٢٦-٠٩-٠٧).
 *
 * ══ البنية ══
 * قسمةٌ **مائلة**: صورةٌ يسارًا هي العارضُ وتعليقُها داخلها، وبياضُ الهويّة يمينًا
 * (لوحُ التدرّج) عليه الجملةُ في ثلاثة أسطرٍ ممدودةٍ بالكشيدة، والريشةُ جسمٌ
 * يعبر الحروف. وكلُّ مقاسٍ في الكتلة بالـ`em` من `--hro-t`، فالحبرُ والريشةُ
 * يكبران معًا ولا ينفكّ ترتيبُهما.
 *
 * ══ ولمَ الجملةُ هذه ══
 * افتتاحيّةُ الموقع تقول «اجتمع شغفٌ بالحرف وإيمانٌ بالكلمة.. فكان أدِيب» ثمّ
 * «حكايةٌ تجاوزت الأسوار» وتُختم بـ«وما زالت الحكاية تُكتب» — فالصدرُ يجمع
 * الثلاثةَ في نفَسٍ واحد، فتُقرأ الصفحةُ والقصّةُ نصًّا واحدًا لا نصَّين.
 *
 * ══ والخطابُ يتبدّل بمنزلة الزائر ══
 * كما يفعل الرأسُ منذ ٢٠٢٦-٠٨-٢٥: الصفحةُ ساكنةٌ للجميع (`revalidate`)، والمنزلةُ
 * تُقرأ في المتصفّح من `/api/me/brief` بعد الترطيب. والعنوانُ **لا يتبدّل**: هو
 * هويّةُ النادي لا تحيّةَ زائر. والمتبدّلُ سطرُ الشرح وزرُّ الفعل.
 */

/* ══ المنازل وخطابُها ═══════════════════════════════════════════════ */

export type Standing = "guest" | "account" | "member";

const SPEECH: Record<Standing, { deck: string; cta: string; href: string }> = {
  guest: {
    deck: "اجتمع شغفٌ بالحرف وإيمانٌ بالكلمة في جامعة الملك فيصل، فكان أدِيب. حكايةٌ تجاوزت الأسوار، وما زالت تُكتب.",
    cta: "انضمّ لعائلة أَدِيب",
    href: "/join",
  },
  account: {
    deck: "حسابُك جاهز، وبقيت خطوةٌ واحدة: رتّب رغباتك في اللجان فتصير من متطوّعي أَدِيب.",
    /* **وصاحبُ الحساب يرى البوّابةَ لا الانضمام** (المالك ٢٠٢٦-٠٩-١٢): «زرُّ بوّابة
       أدِيب لمن يمتلك حسابًا أيًّا يكن». والوجهةُ تتبع مفاتيحَه كما يفعل الرأس:
       من له غرفةٌ في اللوحة يقصدها، ومن لا فبيتُ حسابه — وبابُ الانضمام يبقى
       في الرأس وفي قسم الدعوة، فلا يُحجَب عنه. */
    cta: "بوّابة أَدِيب",
    href: "/me",
  },
  member: {
    deck: "بوّابتُك مفتوحةٌ ومهامُّك تنتظرك، وما يجري في أَدِيب تجده في لوحتك.",
    cta: "بوّابة أَدِيب",
    href: "/dashboard",
  },
};

/* ══ الحروف: أجزاءُ كلّ سطرٍ ومواضعُ مدّه ══════════════════════════
   **المدُّ محرفُ التطويل ‎U+0640 لا تباعدُ حروف:** التطويلُ يمدّ وصلةَ الحرف
   فيبقى الخطُّ موصولًا، و`letter-spacing` يفكّ الوصلَ ويكسر الكلمة.
   والأعدادُ ضبطها المالكُ بيده في `/ui/hero` (٢٠٢٦-٠٩-٠٧). */

const T = (n: number) => "ـ".repeat(n);

/** أجزاءُ كلّ سطرٍ عند **مواضع الوصل وحدَها** (المدُّ يقع بين كلّ جزأين).
    ومُصدَّرةٌ كي يبنيَ المعرضُ الحروفَ من هنا، فلا تُكتب الجملةُ مرّتين. */
export const HERO_PARTS: string[][] = [
  ["ح", "ي", "ث"],
  ["ت", "ول", "د"],
  ["ال", "ك", "لمة"],
];

/** المدُّ الذي ضبطه المالكُ بيده وأقرّه (٢٠٢٦-٠٩-٠٧). */
const HERO_KASH: number[][] = [
  [1, 9],
  [2, 22],
  [5, 2],
];

/** نصُّ السطر بعد حشو المدّ في مواضعه. */
export const heroLineText = (parts: string[], kash: number[]) =>
  parts.map((part, i) => part + (i < parts.length - 1 ? T(kash[i] ?? 0) : "")).join("");

export const HERO_LINES: { text: string; grad?: boolean }[] = HERO_PARTS.map((parts, i) => ({
  text: heroLineText(parts, HERO_KASH[i]),
  grad: i === HERO_PARTS.length - 1,
}));

/** جملُ الشريط الجاري: **من حكاية الموقع نفسِها** لا كلامٌ يُخترع للزينة.
    ومُصدَّرةٌ كي يقرأها معرضُ `/ui/hero` من هنا، فلا تُكتب الجملُ مرّتين. */
export const TICKER = [
  "كلُّ حكايةٍ عظيمة تبدأ بحرف",
  "اجتمع شغفٌ بالحرف وإيمانٌ بالكلمة، فكان أدِيب",
  "حكايةٌ تجاوزت الأسوار",
  "خلف كلّ إنجازٍ أُدباء صنعوه",
  "وما زالت الحكاية تُكتب",
];

/** ريشةُ المالك: PNG بخلفيّةٍ شفّافة، سنُّها في أسفل اليسار. */
const QUILL = "/brand/quill.png";

/* ══ مقابضُ المعرض ═════════════════════════════════════════════════
   **الصدرُ واحدٌ والمعرضُ يزيد عليه مقابضَه** (قرارُ المالك ٢٠٢٦-٠٩-١٢ بعد أن
   رأى الشريطَ في الصفحة وغائبًا عن المعاينة): كانت البنيةُ مكتوبةً مرّتين —
   هنا وفي `/ui/hero` — فكلُّ عنصرٍ يُضاف في إحداهما يغيب عن الأخرى حتّى يُنقَل
   بيد. فصار المعرضُ يستدعي **هذا** المكوّنَ نفسَه، ويمرّر `lab` فيصير الحرفُ
   مسحوبًا والمدُّ مزلاجًا. وبلا `lab` هو صدرُ الإنتاج كما كان، حرفًا بحرف. */
export type HeroLineTweak = {
  /** طولُ المدّ عند كلّ موضعِ وصل */
  kash: number[];
  /** إزاحةُ السطر بالـem من مقاس الحبر */
  x: number;
  y: number;
  /** أفوق الريشة هو؟ */
  over: boolean;
};

/** تفاعلُ الريشة مع المؤشّر: ساكنة · تميل مع حركته · تتوجّه إليه. */
export type HeroMotion = "off" | "tilt" | "aim";

export type HeroLab = {
  /** الريشةُ ومقاسُ الكتلة وتفاعلُها */
  tw: { qx: number; qy: number; qw: number; qrot: number; k: number; motion: HeroMotion; power: number };
  /** ضبطُ كلّ سطرٍ: مدُّه وإزاحتُه وطبقتُه */
  lines: HeroLineTweak[];
  /** معالجةُ الحرف المعروضة (`.hro-t-*`) */
  cls?: string;
  /** مقبضُ السحب: الريشةُ أو رقمُ السطر */
  onDrag?: (k: "quill" | number, dx: number, dy: number) => void;
};

export type HeroSlide = {
  /** «خبر» أو «إنجاز» — يُعرَض شارةً فوق الصورة */
  tag: string;
  title: string;
  img: string;
  href: string;
};

/* ══ الصدر ═════════════════════════════════════════════════════════ */

export function Hero({
  slides,
  standing: forced,
  lab,
}: {
  slides: HeroSlide[];
  /** يفرضه المعرضُ لعرض المنازل؛ وفي الإنتاج تُقرأ الجلسةُ نفسُها. */
  standing?: Standing;
  /** مقابضُ المعرض؛ لا تُمرَّر في الإنتاج فيبقى الصدرُ كما هو. */
  lab?: HeroLab;
}) {
  const [i, setI] = useState(0);
  const [viewer, setViewer] = useState<MeBrief | null>(null);
  const secRef = useRef<HTMLElement>(null);
  const quillRef = useRef<HTMLSpanElement>(null);

  /** أرُطِّبت الصفحة؟ لقطةُ الخادم `false` فيُرسَم ما أُرسل ثمّ يُبدَّل بلا تحذير. */
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  /* منزلةُ الزائر: تُقرأ في المتصفّح كي تبقى الصفحةُ ساكنةً للجميع. */
  useEffect(() => {
    if (forced) return;
    let alive = true;
    fetch("/api/me/brief", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { viewer: null }))
      .then((d: { viewer: MeBrief | null }) => {
        if (alive) setViewer(d.viewer);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [forced]);

  const standing: Standing =
    forced ?? (!viewer ? "guest" : viewer.isMember || viewer.hasPortal ? "member" : "account");
  const sp = SPEECH[standing];

  /* العارضُ يمشي وحدَه، ونقرةُ نقطةٍ تُعيد المهلةَ من أوّلها (المفتاحُ `i`). */
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setTimeout(() => setI((n) => (n + 1) % slides.length), 5200);
    return () => clearTimeout(t);
  }, [i, slides.length]);

  /* ══ تفاعلُ الريشة مع المؤشّر ══════════════════════════════════════
     **بلا إعادة رسمٍ لريأكت:** الحركةُ تُكتب رموزًا على العنصر في `rAF`، فلو
     ضُبطت حالةٌ مع كلّ حركةِ مؤشّرٍ لَأعادت الصفحةُ رسمَ نفسها ستّين مرّةً في
     الثانية. والتنعيمُ ملاحقةٌ خطّيّة فتلحق الريشةُ المؤشّرَ ولا تقفز معه.
     ومَن كره الحركةَ لم يرَها. */
  const motion: HeroMotion = lab?.tw.motion ?? "tilt";
  const power = lab?.tw.power ?? 1;
  useEffect(() => {
    const sec = secRef.current;
    const q = quillRef.current;
    if (!sec || !q || motion === "off") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0, r: 0 };
    const now = { x: 0, y: 0, r: 0 };
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const b = sec.getBoundingClientRect();
      const nx = ((e.clientX - b.left) / b.width) * 2 - 1;
      const ny = ((e.clientY - b.top) / b.height) * 2 - 1;
      if (motion === "tilt") {
        target.x = -nx * 14 * power;
        target.y = -ny * 10 * power;
        target.r = nx * 5 * power;
      } else {
        /* التوجيه: السنُّ ثابتٌ والريشةُ تدور نحو المؤشّر بمدًى محدود */
        const qb = q.getBoundingClientRect();
        const nib = { x: qb.left + qb.width * 0.15, y: qb.bottom - qb.height * 0.05 };
        const ang = (Math.atan2(e.clientY - nib.y, e.clientX - nib.x) * 180) / Math.PI;
        target.r = Math.max(-18, Math.min(18, (ang + 90) * 0.25 * power));
        target.x = 0;
        target.y = 0;
      }
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      target.r = 0;
    };
    const tick = () => {
      now.x += (target.x - now.x) * 0.12;
      now.y += (target.y - now.y) * 0.12;
      now.r += (target.r - now.r) * 0.12;
      q.style.setProperty("--qi-x", `${now.x.toFixed(2)}px`);
      q.style.setProperty("--qi-y", `${now.y.toFixed(2)}px`);
      q.style.setProperty("--qi-r", `${now.r.toFixed(2)}deg`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    sec.addEventListener("pointermove", onMove);
    sec.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      sec.removeEventListener("pointermove", onMove);
      sec.removeEventListener("pointerleave", onLeave);
      q.style.removeProperty("--qi-x");
      q.style.removeProperty("--qi-y");
      q.style.removeProperty("--qi-r");
    };
  }, [motion, power]);

  /* زاويةُ الشريط تتبع الحدَّ المائل: ميلُه بالبكسل وارتفاعُ الصدر متغيّر،
     فالزاويةُ تُحسَب عند كلّ تبدّلِ مقاس. ورقمٌ ثابتٌ مكانَها يفارق الحدَّ. */
  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;
    const fit = () => {
      const cs = getComputedStyle(sec);
      const lean = parseFloat(cs.getPropertyValue("--hro-lean")) || 0;
      const h = sec.getBoundingClientRect().height || 1;
      const deg = 90 + (Math.atan(lean / h) * 180) / Math.PI;
      sec.style.setProperty("--hro-ang", `${deg.toFixed(2)}deg`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(sec);
    return () => ro.disconnect();
  }, []);

  /** مقبضُ السحب: يُمسك العنصرَ ويُبلّغ الفرقَ بالبكسل، والمعرضُ يحوّله.
      **والالتقاطُ تحسينٌ لا شرط:** يرمي في بعض الأحوال، ولو رمى قبل تسجيل
      المستمعين لَما تحرّك شيء. */
  const grab = (k: "quill" | number) => (e: React.PointerEvent) => {
    const drag = lab?.onDrag;
    if (!drag) return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    let x = e.clientX;
    let y = e.clientY;
    const move = (ev: PointerEvent) => {
      drag(k, ev.clientX - x, ev.clientY - y);
      x = ev.clientX;
      y = ev.clientY;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const slide = slides[i];
  const editing = !!lab?.onDrag;
  /** أسطرُ الحرف: من ضبط المعرض إن كان، وإلّا من المُقَرّ في هذه الورقة. */
  const drawn = lab
    ? lab.lines.map((l, n) => ({
        text: heroLineText(HERO_PARTS[n], l.kash),
        grad: n === HERO_PARTS.length - 1,
        style: { transform: `translate(${l.x}em, ${l.y}em)`, zIndex: l.over ? 6 : 2 },
      }))
    : HERO_LINES.map((l) => ({ text: l.text, grad: !!l.grad, style: undefined }));

  return (
    <section
      ref={secRef}
      className="hro"
      /* رموزُ الريشة والكتلة تُكتب سطريًّا في المعرض وحدَه؛ وفي الإنتاج
         تُقرأ من الورقة فلا سطرَ هنا. */
      style={
        lab
          ? ({
              "--hro-k": lab.tw.k,
              "--q-x": `${lab.tw.qx}em`,
              "--q-y": `${lab.tw.qy}em`,
              "--q-w": `${lab.tw.qw}em`,
              "--q-rot": `${lab.tw.qrot}deg`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <span className="hro-ink" aria-hidden />

      {/* الشريطُ الجاري على الحدّ: نسختان من الجمل تجريان معًا فلا فجوةَ عند
          الإعادة. وهو `aria-hidden` لأنّه زينةٌ تتكرّر، وكلامُه مقروءٌ في
          القصّة الافتتاحيّة نفسِها. */}
      <div className="hro-ribbon" aria-hidden>
        <div className="hro-ribbon-track">
          {[0, 1].map((copy) => (
            <div key={copy} style={{ display: "flex" }}>
              {/* الجملُ مرّتين في النسخة الواحدة: النسخةُ يجب أن تفوق الشريطَ
                  طولًا وإلّا انكشف طرفُها قبل أن تلحقها أختُها. */}
              {[0, 1].map((rep) =>
                TICKER.map((m) => (
                  <span key={`${rep}-${m}`} className="hro-ticker-i">
                    {m}
                  </span>
                )),
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="hro-media">
        <div className="hro-slides">
          {slides.map((sl, n) => (
            <div key={sl.title} className={"hro-slide" + (n === i ? " on" : "")} aria-hidden={n !== i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sl.img} alt="" />
            </div>
          ))}
        </div>
        {slide ? (
          <Link href={slide.href} className="hro-cap">
            <span className="hro-cap-k">{slide.tag}</span>
            <span className="hro-cap-t">{slide.title}</span>
          </Link>
        ) : null}
        {slides.length > 1 ? (
          <div className="hro-dots">
            {slides.map((sl, n) => (
              <button
                key={sl.title}
                type="button"
                aria-current={n === i}
                aria-label={`الشريحة ${n + 1}`}
                onClick={() => setI(n)}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="hro-say">
        <div className="hro-word">
          <span
            ref={quillRef}
            className="hro-quill"
            aria-hidden
            onPointerDown={editing ? grab("quill") : undefined}
            style={editing ? { pointerEvents: "auto", cursor: "grab", touchAction: "none" } : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={QUILL} alt="" draggable={false} />
          </span>
          <h1 className={"hro-title" + (lab?.cls ? " " + lab.cls : "")}>
            {drawn.map((l, n) => (
              <span
                key={n}
                className={l.grad ? "hro-grad" : undefined}
                onPointerDown={editing ? grab(n) : undefined}
                style={
                  editing
                    ? { ...l.style, cursor: "grab", touchAction: "none", userSelect: "none" }
                    : l.style
                }
              >
                {l.text}
              </span>
            ))}
          </h1>
        </div>

        {/* السطرُ والزرُّ يتبدّلان بالمنزلة، ولا يُرسمان قبل الترطيب بخطابٍ قد
            يُبدَّل بعد جزءٍ من الثانية: يبدأ بخطاب الزائر وهو الأغلب. */}
        <p className="hro-deck">{hydrated ? sp.deck : SPEECH.guest.deck}</p>
        <div className="hro-acts btn-row">
          <Link href={hydrated ? sp.href : SPEECH.guest.href} className="abtn abtn-inverse abtn-lg">
            {hydrated ? sp.cta : SPEECH.guest.cta}
          </Link>
          <Link href="/works" className="abtn abtn-inverse-ghost abtn-lg">
            تصفّح الأعمال
          </Link>
        </div>

        {/* دليلُ النزول: كلمةٌ وقطرةُ مدادٍ على خيط، ورابطٌ يقصد أوّلَ الأقسام */}
        <a className="hro-more" href="#works">
          <span className="hro-more-t">{`تابِع الحكـ${T(6)}اية`}</span>
          <span className="hro-more-rail" aria-hidden />
        </a>
      </div>
    </section>
  );
}
