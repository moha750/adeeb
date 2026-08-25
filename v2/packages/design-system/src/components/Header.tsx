"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnchoredPopover } from "./AnchoredPopover";
import { BurgerIcon } from "./BurgerIcon";
import { Container } from "./Container";
import { siteNav, type NavItem } from "../lib/nav";
import { cn } from "../lib/cn";

/* أيقونات الرأس مرسومةٌ هنا كسائر أيقونات المكتبة (`CarouselNav` · `Select`):
   المكتبةُ بلا تبعيّة أيقونات، والرسمُ بـ`currentColor` فيتبع لونَ محيطه.
   وأيقونةُ البرغر وحدَها خرجت إلى ملفٍّ مستقلّ (`BurgerIcon`) لأنّ اللوحة تستعملها
   أيضًا — فالحركةُ مصدرٌ واحد لا نسختان تفترقان. */

const IconChevron = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/* أيقوناتُ منسدلة الهويّة — على منوال الشيفرون: خطٌّ بـ`currentColor` بلا تبعيّة. */
const IconPortal = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
  </svg>
);
const IconAccount = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
  </svg>
);
const IconExit = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14.5 4.5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3.5" />
    <path d="M10 8l-4 4 4 4" />
    <path d="M6 12h8.5" />
  </svg>
);

/* القائمةُ خرجت إلى `lib/nav` يوم صار للتذييل روابطُ — مصدرٌ واحدٌ يقرؤه الاثنان،
   فلا نسختان تفترقان يومَ يُضاف رابط. وتسميتُها هنا `defaultNav` كما كانت: هي
   **افتراضُ** الرأس، ويبقى للمستهلك أن يمرّر غيرها. */
const defaultNav = siteNav;

/** فجوةُ الروابط (`.shdr-nav` gap) وفجوةُ أقسام الصفّ (`.shdr-bar` gap) وحشوُ الكبسولة. */
const LINK_GAP = 2;
const BAR_GAP = 18;
const BAR_PAD = 20;

/**
 * أقربُ سلفٍ يُمرَّر فيه — النافذةُ في الموقع الحيّ، وإطارُ المعرض في `/ui/header`.
 * بلا هذا لا يشتعل `[data-stuck]` داخل الإطار، فلا تُرى حالةُ «بعد النزول».
 */
function scrollParentOf(el: HTMLElement): HTMLElement | Window {
  let node = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return window;
}

/** هيدر الموقع: الشعار + التنقّل + الأفعال — كبسولةٌ عائمة (انظر `.shdr` بالمكتبة). */
export function Header({
  logoSrc,
  nav = defaultNav,
  cta = "انضمّ إلينا",
  ctaHref,
  onCta,
  loginHref = "/login",
  loginLabel = "بوّابة أَدِيب",
  moreLabel = "المزيد",
  activeHref,
  className,
  viewer,
  portalHref = "/dashboard",
  accountHref = "/me",
  onSignOut,
}: {
  logoSrc?: string;
  nav?: NavItem[];
  /** الفعلُ الأوّل — لا ينزوي أبدًا: الأفعالُ أولى من الروابط حين يضيق الصفّ. */
  cta?: string;
  /** وِجهةُ الفعل حين يكون رابطًا. ولا افتراضَ لها: بابُ التسجيل نُحر ٢٠٢٦-٠٨-٠٤، فلم يبقَ
   *  للرأس وِجهةٌ يعرفها بنفسه — يعطيها المستهلك أو يعطي {@link onCta} بدلها. */
  ctaHref?: string;
  /** فعلٌ يجري مكان الانتقال — إن مُرّر رُسم الفعلُ زرًّا لا رابطًا (وهو ما يفتح نافذة «التسجيل مغلق»). */
  onCta?: () => void;
  loginHref?: string;
  /** مدخلُ الحساب — «بوّابة أَدِيب» بقرار المالك ٢٠٢٦-٠٨-٠٢ (كان «دخول»). */
  loginLabel?: string;
  moreLabel?: string;
  /** الرابطُ المطابق للصفحة الحاليّة — يلبس `aria-current` فيظهر أثرُ التظليل. */
  activeHref?: string;
  className?: string;
  /**
   * **صاحبُ الجلسة إن عُرف.** حين يُمرَّر تبدّلت أفعالُ الرأس: «بوّابة أَدِيب» لا معنى
   * لها لمن هو داخلها، و«انضمّ إلينا» لا معنى لها لمن انضمّ — فتُستبدل الهويّةُ بها،
   * ويبقى الفعلُ الذي ما زال يعنيه (الانضمام لصاحب حسابٍ ليس عضوًا).
   * والأفتارُ يُمرَّر **عقدةً** لا رابطًا: رسمُه في التطبيق (`Avatar`) بأيقونة الجنس
   * والأحرف، فلا تُنسَخ قواعدُه في المكتبة.
   */
  viewer?: {
    name: string;
    avatar?: React.ReactNode;
    isMember?: boolean;
    /**
     * سطرُ الهويّة الثاني — **مسمّى منصبه** كما يُقرأ («قائد لجنة التصميم»)، يُركَّب في
     * `positionLabel` لا هنا. وحين لا منصبَ له تُقال منزلتُه العامّة.
     */
    standing?: string | null;
    /**
     * جنسُه — ولا يُستعمل إلّا في منزلةِ **صاحب الحساب**: «صاحبُ حساب» تُقال للمرأة
     * «صاحبةُ حساب»، ولا ثالثَ في الرأس يتبدّل به. وحين يُجهَل فالمذكَّرُ أصلٌ.
     */
    gender?: "male" | "female" | null;
  };
  portalHref?: string;
  accountHref?: string;
  /** الخروجُ فعلٌ لا وِجهة — يمرّره المستهلك لأنّ المكتبة لا تعرف Supabase. */
  onSignOut?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLAnchorElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const meRef = useRef<HTMLButtonElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [meOpen, setMeOpen] = useState(false);
  /** كم رابطًا يتّسع له الصفّ الآن — يبدأ بالكلّ ثمّ يصحّحه القياسُ قبل الرسم. */
  const [fit, setFit] = useState(nav.length);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const host = scrollParentOf(el);
    const read = () => setStuck((host === window ? window.scrollY : (host as HTMLElement).scrollTop) > 8);
    read();
    host.addEventListener("scroll", read, { passive: true });
    return () => host.removeEventListener("scroll", read);
  }, []);

  /**
   * **مخارجُ اللوح — لأنّه صار يطفو فوق المحتوى.** ما دام يغطّي المتنَ فالمتوقَّعُ
   * أن تُغلقه ضغطةٌ خارجه، لا زرُّه وحده. ثلاثةُ مخارجَ لا واحد:
   * ١) **ضغطةٌ خارج الرأس** — في **مرحلة الالتقاط** كي تُغلق ولو ابتلع المستهلكُ
   *    الحدثَ في طريقه (وحارسُ المعرض يفعل ذلك فعلًا).
   * ٢) **Escape** — ومعه **إعادةُ التركيز إلى الزرّ**: من فتح بلوحة المفاتيح لا
   *    يُترك تركيزُه في العدم.
   * ٣) وثالثُها في القياس أدناه: إن عاد الشريطُ (اتّسع الرأس) أُغلق اللوحُ من نفسه.
   * ولا يُربط شيءٌ ما دام مغلقًا — الشرطُ في أوّل الأثر لا في داخل المستمع.
   */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      burgerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /**
   * **سعةُ الرأس تُقاس ولا تُقدَّر.** المطلوبُ ألّا يزدحم الصفُّ أبدًا: فإذا لم يبقَ
   * للرابط موضعُه كاملًا **لم يُقبَل في الصفّ** وانتقل إلى «المزيد» — لا ضغطَ ولا
   * قصَّ ولا التفافَ سطرٍ ثانٍ.
   *
   * **الأفعالُ أولى من الروابط:** «انضمّ» و«دخول» لا تنزوي أبدًا (هي غايةُ الرأس)،
   * فتُطرح عرضًا كاملًا ثمّ يُقسَّم الباقي على الروابط. وهذا معنى «لا يقبل»: زرٌّ
   * جديدٌ يُضاف ← تضيق حصّةُ الروابط ← تنسحب أواخرُها إلى المنسدلة **تلقائيًّا**،
   * بلا قرارٍ منك ولا نقطةِ انكسارٍ محفورة.
   *
   * **طبقةُ قياسٍ خفيّة** (`.shdr-measure`) تحمل النسخةَ الكاملة دائمًا: لو قِسنا من
   * الشريط المرئيّ لقِسنا ما أخفيناه بأنفسنا — فيدخل الرأسُ حلقةً لا تستقرّ (يُخفي
   * فيتّسع فيُظهر فيضيق). القياسُ من نسخةٍ ثابتةٍ يقطع الحلقة من أصلها.
   */
  const measure = useCallback(() => {
    const bar = barRef.current, meas = measureRef.current, acts = actionsRef.current, logo = markRef.current;
    if (!bar || !meas || !acts || !logo) return;
    /* دون 900px لا شريطَ أصلًا (لوحُ الجوّال يحمل الكلّ) فلا معنى للقياس */
    if (getComputedStyle(meas).display === "none") return;
    /* وفوقها: الشريطُ عاد، فلوحُ الجوّال بلا معنًى — يُغلق من نفسه بدل أن يبقى
       مفتوحًا خلف شريطٍ ظاهر، فيرجع القارئُ من التوسيع إلى قائمةٍ معلّقة. */
    setOpen(false);

    const kids = Array.from(meas.children) as HTMLElement[];
    /* آخرُ عنصرٍ في طبقة القياس هو زرّ «المزيد» — يُقاس ليُحجَز له موضعُه عند اللزوم */
    const moreW = kids.length > nav.length ? kids[nav.length].offsetWidth + LINK_GAP : 0;
    const widths = kids.slice(0, nav.length).map((k) => k.offsetWidth + LINK_GAP);

    const avail = bar.clientWidth - BAR_PAD - logo.offsetWidth - acts.offsetWidth - BAR_GAP * 2;

    const countIn = (budget: number) => {
      let used = 0, n = 0;
      for (const w of widths) {
        if (used + w > budget) break;
        used += w;
        n += 1;
      }
      return n;
    };

    let n = countIn(avail);
    /* لو انسحب واحدٌ فأكثر، لزم زرُّ «المزيد» موضعَه — فيُعاد الحساب بميزانيّةٍ أقلّ */
    if (n < nav.length) n = countIn(avail - moreW);
    setFit((prev) => (prev === n ? prev : n));
  }, [nav.length]);

  useLayoutEffect(() => {
    measure();
    const bar = barRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    /* عرضُ الكلمة يتبدّل حين يصل خطُّ الهوية، فيُعاد القياسُ عندها لا قبلها */
    if (typeof document !== "undefined" && "fonts" in document) void document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  const src = logoSrc ?? "/brand/logo-horizontal.svg";
  const shown = nav.slice(0, fit);
  const hidden = nav.slice(fit);

  const link = (n: NavItem, onClick?: () => void) => (
    <a
      key={n.href}
      href={n.href}
      className="shdr-link"
      aria-current={activeHref === n.href ? "page" : undefined}
      onClick={onClick}
    >
      {/* التسميةُ في عنصرٍ سطريّ: بعضُ التوجّهات تُظلِّل **الكلمة** لا الصفّ، وخلفيّةُ
          الرابط تملأ صندوقَه كاملًا — فيلزم جسمٌ بعرض النصّ يحمل الأثر. */}
      <span className="shdr-lbl">{n.label}</span>
    </a>
  );

  /**
   * الفعلُ الأوّل — يُرسَم مرّتين (الشريط واللوح) بصنفين مختلفين، فيُبنى ههنا مرّةً واحدة:
   * زرًّا إن كان له {@link onCta}، ورابطًا إن كانت له وِجهة. و`after` إغلاقُ اللوح بعد النقر.
   */
  const ctaEl = (className: string, after?: () => void) =>
    onCta ? (
      <button type="button" className={className} onClick={() => { after?.(); onCta(); }}>
        {cta}
      </button>
    ) : (
      <a href={ctaHref} className={className} onClick={after}>
        {cta}
      </a>
    );

  /* ── هويّةُ صاحب الجلسة ───────────────────────────────────────────────────
     الاسمُ الأوّل وحدَه في الشريط: الرأسُ صفٌّ ضيّقٌ يتنازع عليه الشعارُ والتوجّهات،
     والاسمُ الكاملُ يُقصّ بنقاطٍ فيبدو عطبًا — وهو كاملٌ في رأس المنسدلة.
     والمنسدلةُ تقول **المنزلة** تحت الاسم، فيعرف صاحبُ الحساب لمَ لا يرى البوّابة. */
  const first = viewer ? (viewer.name.trim().split(/\s+/)[0] ?? viewer.name) : "";

  const meTrigger = (
    <button
      ref={meRef}
      type="button"
      className="shdr-me"
      aria-expanded={meOpen}
      aria-haspopup="menu"
      /* الاسمُ يختفي في الضيّق فيبقى الزرُّ صورةً بلا كلمة — والتسميةُ تُقال دائمًا لقارئ الشاشة */
      aria-label={`حسابك، ${viewer?.name ?? ""}`}
      onClick={() => setMeOpen((v) => !v)}
    >
      {viewer?.avatar}
      <span className="shdr-me-tx">{first}</span>
      {IconChevron}
    </button>
  );

  const meItem = (href: string, label: string, icon: React.ReactNode) => (
    <a href={href} role="menuitem" className="dm-item" onClick={() => setMeOpen(false)}>
      <span className="dm-ic">{icon}</span>
      {label}
    </a>
  );

  const meMenu = viewer ? (
    <AnchoredPopover
      open={meOpen}
      anchorRef={meRef}
      onDismiss={() => setMeOpen(false)}
      align="end"
      className="dm-menu shdr-me-menu"
      role="menu"
    >
      <div className="shdr-me-hd">
        <b>{viewer.name}</b>
        <span>
          {viewer.standing ||
            (viewer.isMember
              ? "عضوٌ في أَدِيب"
              : viewer.gender === "female"
                ? "صاحبةُ حساب"
                : "صاحبُ حساب")}
        </span>
      </div>
      <div className="dm-sep" />
      {/* **بابٌ واحدٌ لكلّ منزلة** (قرار المالك ٢٠٢٦-٠٨-٢٥): كانا بابين فسأل «قائدُ لجنةٍ
          يرى حسابك والبوّابة معًا؟» — وهو محقّ: ما في `/me` صار في اللوحة (الملفُّ الشخصيّ
          والإعداداتُ وبابُ الخروج نفسُه)، فالبابُ الثاني تكرارٌ يُثقل. فللعضو بوّابتُه،
          ولصاحب الحساب حسابُه — وهو بيتُه كلُّه لا نصفُه. */}
      {viewer.isMember ? meItem(portalHref, loginLabel, IconPortal) : meItem(accountHref, "حسابك", IconAccount)}
      <div className="dm-sep" />
      <button
        type="button"
        role="menuitem"
        className="dm-item dg"
        onClick={() => {
          setMeOpen(false);
          onSignOut?.();
        }}
      >
        <span className="dm-ic">{IconExit}</span>
        تسجيل الخروج
      </button>
    </AnchoredPopover>
  ) : null;

  /**
   * **أفعالُ الشريط.** للزائر المجهول فعلان كما كانا. ولصاحب الجلسة: تسقط «بوّابة
   * أَدِيب» (هو فيها) وتسقط «انضمّ إلينا» عن العضو وحدَه — ويبقى الانضمامُ لصاحب
   * حسابٍ لم ينضمّ بعد، فهو غايةُ الموقع منه لا زخرفة.
   */
  const barActions = !viewer ? (
    <>
      <a href={loginHref} className="abtn abtn-ghost abtn-sm">
        {loginLabel}
      </a>
      {ctaEl("abtn abtn-primary abtn-sm")}
    </>
  ) : (
    meTrigger
  );

  /**
   * **أفعالُ اللوح — للزائر المجهول وحدَه.**
   *
   * أمّا صاحبُ الجلسة فحسابُه **لا يسكن اللوح**: البرغرُ عقدٌ على أنّ خلفه تنقّلٌ، والحسابُ
   * مهمّةٌ أخرى — فبابُه الأفتارُ الباقي في الشريط بجواره. وهذا الوجهُ اختيرَ من وجهين
   * عُرِضا في `/ui/header-account` (المالك ٢٠٢٦-٠٨-٢٥) وأُعدم الآخر، وحجّتُه أنّ إخفاءَ
   * الهويّة في اللوح يترك رأسَ الجوّال **مطابقًا لرأس المجهول** — فتُنفَق الميزةُ ولا
   * يراها أحد، ومعظمُ الأعضاء لا يفتحون إلّا الجوّال.
   */
  const sheetActions = !viewer ? (
    <>
      <a href={loginHref} className="abtn abtn-ghost abtn-sm shdr-sheet-login" onClick={() => setOpen(false)}>
        {loginLabel}
      </a>
      {ctaEl("abtn abtn-primary abtn-sm shdr-sheet-cta", () => setOpen(false))}
    </>
  ) : null;

  // `data-open` على الجذر لا على اللوح وحده: الحالةُ حالةُ الرأس كلِّه — السطحُ
  // يمتلئ ما دامت القائمةُ مفتوحة، كما يمتلئ بالنزول.
  return (
    <header
      ref={ref}
      className={cn("shdr", className)}
      data-stuck={stuck}
      data-open={open}
    >
      <div className="shdr-main">
        <Container>
          <div ref={barRef} className="shdr-bar">
            <a ref={markRef} href="/" className="shdr-mark" aria-label="نادي أديب، الصفحة الرئيسة">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="نادي أديب" />
            </a>

            <nav className="shdr-nav" aria-label="التنقّل الرئيس">
              {shown.map((n) => link(n))}
              {hidden.length > 0 && (
                <button
                  ref={moreRef}
                  type="button"
                  className="shdr-link shdr-more"
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  onClick={() => setMoreOpen((v) => !v)}
                >
                  <span className="shdr-lbl">{moreLabel}</span>
                  {IconChevron}
                </button>
              )}
            </nav>

            {/* طبقةُ القياس — نسخةٌ كاملةٌ لا تُرى ولا تُقرأ ولا تُنقر */}
            <div ref={measureRef} className="shdr-measure" aria-hidden>
              {nav.map((n) => (
                <span key={n.href} className="shdr-link">
                  <span className="shdr-lbl">{n.label}</span>
                </span>
              ))}
              <span className="shdr-link shdr-more">
                <span className="shdr-lbl">{moreLabel}</span>
                {IconChevron}
              </span>
            </div>

            <div ref={actionsRef} className="shdr-actions">
              {barActions}
              <button
                ref={burgerRef}
                type="button"
                className="shdr-burger"
                aria-expanded={open}
                aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
                onClick={() => setOpen((v) => !v)}
              >
                <BurgerIcon />
              </button>
            </div>
          </div>
        </Container>

        <div className="shdr-sheet" data-open={open}>
          <div>
            <Container>
              <nav className="shdr-sheet-in" aria-label="قائمة الجوّال">
                {nav.map((n) => link(n, () => setOpen(false)))}
                {/* **الزرُّ نفسُه الذي في الشريط حرفًا بحرف** (`abtn-primary abtn-sm`):
                    لا مقاسَ خاصّ ولا زاويةَ خاصّة — الزرُّ في المكتبة واحدٌ يُستعمل
                    كما هو، و`.shdr-sheet-cta` تخصّ **موضعَه في العمود** لا هيئتَه. */}
                {sheetActions}
              </nav>
            </Container>
          </div>
        </div>
      </div>

      {/* المنسدلة على البدائيّة الموحّدة — لا لوحةَ مطلقةً داخل التدفّق (تُقصّ) */}
      <AnchoredPopover
        open={moreOpen}
        anchorRef={moreRef}
        onDismiss={() => setMoreOpen(false)}
        align="start"
        className="dm-menu shdr-menu"
        role="menu"
      >
        {hidden.map((n) => (
          <a
            key={n.href}
            href={n.href}
            role="menuitem"
            className="dm-item"
            aria-current={activeHref === n.href ? "page" : undefined}
            onClick={() => setMoreOpen(false)}
          >
            {n.label}
          </a>
        ))}
      </AnchoredPopover>

      {meMenu}
    </header>
  );
}
