"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * بدائيّة نافذة حواريّة يدويّة (بديل Radix Dialog) — سلوك وصوليّة كامل:
 * Portal · فخّ تركيز (Tab/Shift+Tab) · قفل تمرير الخلفية · ESC · role/aria-modal ·
 * إرجاع التركيز للعنصر المُطلِق · دورة حياة دخول/خروج عبر `data-state` (تبقى مركّبة حتى تنتهي حركة الإغلاق).
 * تُبقي الأصناف والبنية كما كانت (.mdl-scrim / .mdl) فلا يتغيّر المظهر أو الحركة.
 */

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// قفل تمرير الخلفية بعدّاد مرجعيّ (نوافذ متراكبة آمنة)
let lockCount = 0;
let prevOverflow = "";
function lockScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}
function unlockScroll() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = prevOverflow;
}

type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** صنف صندوق المحتوى الكامل، مثل "mdl mdl-md" */
  contentClassName: string;
  scrimClassName?: string;
  labelledBy?: string;
  describedBy?: string;
  /** إغلاق عند نقر الخلفية (افتراضي: لا — مطابقة للسلوك السابق: نقر الخارج لا يُغلق) */
  closeOnScrimClick?: boolean;
  children: ReactNode;
};

export function Dialog({
  open,
  onClose,
  contentClassName,
  scrimClassName = "mdl-scrim",
  labelledBy,
  describedBy,
  closeOnScrimClick = false,
  children,
}: DialogProps) {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<"open" | "closed">(open ? "open" : "closed");
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // فتح/إغلاق مع حركة خروج: نُبقي العنصر مركّبًا حتى تنتهي حركة الإغلاق ثمّ نفكّه
  useEffect(() => {
    if (open) {
      setMounted(true);
      setState("open");
      return;
    }
    if (!mounted) return;
    setState("closed");
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setMounted(false);
      return;
    }
    const el = contentRef.current;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setMounted(false);
    };
    el?.addEventListener("animationend", finish, { once: true });
    const t = window.setTimeout(finish, 400); // احتياط لو لم تُطلَق animationend
    return () => {
      el?.removeEventListener("animationend", finish);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // قفل التمرير طوال دورة التركيب + إرجاع التركيز عند الفكّ
  useEffect(() => {
    if (!mounted) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    lockScroll();
    return () => {
      unlockScroll();
      const el = returnFocusRef.current;
      if (el && typeof el.focus === "function" && document.contains(el)) el.focus();
    };
  }, [mounted]);

  // التركيز المبدئيّ عند الفتح (أوّل عنصر قابل للتركيز، وإلا الصندوق نفسه)
  useEffect(() => {
    if (!mounted || state !== "open") return;
    const root = contentRef.current;
    if (!root) return;
    const first = root.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? root).focus();
  }, [mounted, state]);

  // ESC + فخّ التركيز (Tab يدور داخل الصندوق)
  useEffect(() => {
    if (!mounted) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = contentRef.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [mounted, onClose]);

  const onScrimDown = useCallback(() => {
    if (closeOnScrimClick) onClose();
  }, [closeOnScrimClick, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className={scrimClassName} data-state={state} onMouseDown={closeOnScrimClick ? onScrimDown : undefined} />
      <div
        ref={contentRef}
        className={contentClassName}
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
