"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "./Container";
import { cn } from "../lib/cn";

/* أيقونتا القائمة مرسومتان هنا كسائر أيقونات المكتبة (`CarouselNav` · `Select`):
   المكتبةُ بلا تبعيّة أيقونات، والرسمُ بـ`currentColor` فيتبع لونَ الجلد. */
const IconList = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
const IconX = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

type NavItem = { label: string; href: string };

const defaultNav: NavItem[] = [
  { label: "الأنشطة", href: "#activities" },
  { label: "الأخبار", href: "#news" },
  { label: "العضوية", href: "#join" },
];

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

/** هيدر الموقع: الشعار + التنقّل + الدخول — كبسولةٌ عائمة (انظر `.shdr` بالمكتبة). */
export function Header({
  logoSrc,
  nav = defaultNav,
  loginHref = "/login",
  loginLabel = "دخول",
  activeHref,
  className,
}: {
  logoSrc?: string;
  nav?: NavItem[];
  loginHref?: string;
  loginLabel?: string;
  /** الرابطُ المطابق للصفحة الحاليّة — يلبس `aria-current` فيظهر مؤشّرُه. */
  activeHref?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const host = scrollParentOf(el);
    const read = () => setStuck((host === window ? window.scrollY : (host as HTMLElement).scrollTop) > 8);
    read();
    host.addEventListener("scroll", read, { passive: true });
    return () => host.removeEventListener("scroll", read);
  }, []);

  const src = logoSrc ?? "/brand/logo-horizontal.svg";

  const links = (
    <>
      {nav.map((n) => (
        <a
          key={n.href}
          href={n.href}
          className="shdr-link"
          aria-current={activeHref === n.href ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          {n.label}
        </a>
      ))}
    </>
  );

  // `data-open` على الجذر لا على اللوح وحده: الحالةُ حالةُ الرأس كلِّه — السطحُ
  // يمتلئ ما دامت القائمةُ مفتوحة، كما يمتلئ بالنزول.
  return (
    <header ref={ref} className={cn("shdr", className)} data-stuck={stuck} data-open={open}>
      <div className="shdr-main">
        <Container>
          <div className="shdr-bar">
            <a href="/" className="shdr-mark" aria-label="نادي أديب — الصفحة الرئيسة">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="نادي أديب" />
            </a>
            <nav className="shdr-nav" aria-label="التنقّل الرئيس">
              {links}
            </nav>
            <div className="shdr-actions">
              <a href={loginHref} className="shdr-login">
                {loginLabel}
              </a>
              <button
                type="button"
                className="shdr-burger"
                aria-expanded={open}
                aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? IconX : IconList}
              </button>
            </div>
          </div>
        </Container>
        <div className="shdr-sheet" data-open={open}>
          <div>
            <Container>
              <nav className="shdr-sheet-in" aria-label="قائمة الجوّال">
                {links}
                <a href={loginHref} className="shdr-login" onClick={() => setOpen(false)}>
                  {loginLabel}
                </a>
              </nav>
            </Container>
          </div>
        </div>
      </div>
    </header>
  );
}
