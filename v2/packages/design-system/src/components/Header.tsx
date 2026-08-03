"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnchoredPopover } from "./AnchoredPopover";
import { BurgerIcon } from "./BurgerIcon";
import { Container } from "./Container";
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

type NavItem = { label: string; href: string };

/**
 * تنقّلُ الموقع — بتسميات المالك ٢٠٢٦-٠٨-٠٢، **مرتّبةً بالأولويّة**: الذيلُ هو ما
 * ينسحب إلى «المزيد» حين يضيق الصفّ، فالأهمُّ أوّلًا.
 *
 * وهذه أوّلُ نسخةٍ **بمساراتٍ حقيقيّة** بدل مراسي الهبوط (`#activities`…) التي كانت
 * تكسر خارج الصفحة الرئيسة: يفتحها القارئُ من صفحة الأخبار فيُقذَف إلى الهبوط.
 * ويبقى مرسيان — «أهل الدفّة» و«تواصل معنا» — لأنّ وجهتَيهما **قسمان في الهبوط لا
 * صفحتان**؛ ولذلك كُتبا `/#board` و`/#contact` بالشرطة المائلة: من صفحةٍ أخرى يعود
 * القارئُ إلى الهبوط ثمّ ينزل إلى القسم، ومن الهبوط ينزل مباشرةً.
 */
const defaultNav: NavItem[] = [
  { label: "أعمالنا", href: "/works" },
  { label: "فعالياتنا وبرامجنا", href: "/activities" },
  { label: "منصة الأخبار", href: "/news" },
  { label: "المكتبة", href: "/library" },
  { label: "أهل الدفّة", href: "/#board" },
  { label: "تواصل معنا", href: "/#contact" },
];

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
  ctaHref = "/join",
  loginHref = "/login",
  loginLabel = "بوّابة أَدِيب",
  moreLabel = "المزيد",
  activeHref,
  className,
}: {
  logoSrc?: string;
  nav?: NavItem[];
  /** الفعلُ الأوّل — لا ينزوي أبدًا: الأفعالُ أولى من الروابط حين يضيق الصفّ. */
  cta?: string;
  ctaHref?: string;
  loginHref?: string;
  /** مدخلُ الحساب — «بوّابة أَدِيب» بقرار المالك ٢٠٢٦-٠٨-٠٢ (كان «دخول»). */
  loginLabel?: string;
  moreLabel?: string;
  /** الرابطُ المطابق للصفحة الحاليّة — يلبس `aria-current` فيظهر أثرُ التظليل. */
  activeHref?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLAnchorElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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

  // `data-open` على الجذر لا على اللوح وحده: الحالةُ حالةُ الرأس كلِّه — السطحُ
  // يمتلئ ما دامت القائمةُ مفتوحة، كما يمتلئ بالنزول.
  return (
    <header ref={ref} className={cn("shdr", className)} data-stuck={stuck} data-open={open}>
      <div className="shdr-main">
        <Container>
          <div ref={barRef} className="shdr-bar">
            <a ref={markRef} href="/" className="shdr-mark" aria-label="نادي أديب — الصفحة الرئيسة">
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
              <a href={loginHref} className="abtn abtn-ghost abtn-sm">
                {loginLabel}
              </a>
              <a href={ctaHref} className="abtn abtn-primary abtn-sm">
                {cta}
              </a>
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
                <a href={loginHref} className="abtn abtn-ghost abtn-sm shdr-sheet-login" onClick={() => setOpen(false)}>
                  {loginLabel}
                </a>
                {/* **الزرُّ نفسُه الذي في الشريط حرفًا بحرف** (`abtn-primary abtn-sm`):
                    لا مقاسَ خاصّ ولا زاويةَ خاصّة — الزرُّ في المكتبة واحدٌ يُستعمل
                    كما هو، و`.shdr-sheet-cta` تخصّ **موضعَه في العمود** لا هيئتَه. */}
                <a href={ctaHref} className="abtn abtn-primary abtn-sm shdr-sheet-cta" onClick={() => setOpen(false)}>
                  {cta}
                </a>
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
    </header>
  );
}
