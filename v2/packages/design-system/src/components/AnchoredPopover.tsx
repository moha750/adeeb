"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * محاذاة أفقيّة منطقيّة (تتبع اتجاه المستند): البداية = حافّة البداية، النهاية = حافّة النهاية.
 * و`center` **لا اتّجاه لها** — تتوسّط المُطلِق فتستوي في RTL وLTR (همسة الحقل).
 */
export type PopoverAlign = "start" | "end" | "center";
/** الجهة المفضّلة عموديًّا — تُنقَض تلقائيًّا حين تضيق (القوائم أسفل، وهمسة الحقل فوق). */
export type PopoverSide = "below" | "above";
/** سبب الإغلاق: نقرٌ خارجيّ أم Escape — يُملي على المستهلك إعادة التركيز للمُطلِق من عدمها. */
export type PopoverDismissReason = "pointer" | "escape";

export interface AnchoredPopoverProps {
  open: boolean;
  /** المُطلِق: تُحاذيه اللوحة وتُقاس منه، وما خرج عنه وعن اللوحة = نقرٌ خارجيّ. */
  anchorRef: RefObject<HTMLElement | null>;
  /** يُستدعى عند النقر خارج اللوحة والمُطلِق، وعند Escape (مع السبب). */
  onDismiss: (reason: PopoverDismissReason) => void;
  /** المحاذاة الأفقيّة حين لا يُطابَق العرض (افتراضي: البداية). */
  align?: PopoverAlign;
  /** الجهة المفضّلة عموديًّا (افتراضي: أسفل — سلوك القوائم كما كان). */
  side?: PopoverSide;
  /** عرض اللوحة = عرض المُطلِق (حقل Select). حين true تُهمَل `align`. */
  matchWidth?: boolean;
  /** صنف الجلد البصريّ للوحة (asel-panel · dm-menu · tb-fs-panel). */
  className?: string;
  role?: string;
  id?: string;
  ariaLabelledby?: string;
  tabIndex?: number;
  /** إعادة حساب الموضع حين يتبدّل هذا (ارتفاع اللوحة يتغيّر: بحث/تصفية). */
  reflowKey?: unknown;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  /** يمرّر عقدة اللوحة للمستهلك (تمرير داخليّ · تركيز · scrollIntoView). */
  panelRef?: (el: HTMLDivElement | null) => void;
  children: ReactNode;
}

/**
 * منبثقة مثبّتة بحافّة — المصدر الواحد لتموضع القوائم المنسدلة في النظام:
 * تُنقَل عبر Portal إلى body (فتهرب من قصّ حاويات overflow: جسم النافذة، كرت الجدول)،
 * تُموضَع أسفل المُطلِق بحافّة مُدرِكة (تنقلب لأعلى عند ضيق الأسفل، وتُقصر داخل الشاشة)،
 * تُعيد الحساب مع التمرير/التحجيم/تبدّل الارتفاع، وتُغلق بالنقر الخارجيّ أو Escape.
 * لا تملك لوحة المفاتيح الداخليّة ولا محتوى القائمة — تلك يملكها كلّ مستهلك حسب دوره.
 */
export function AnchoredPopover({
  open,
  anchorRef,
  onDismiss,
  align = "start",
  side = "below",
  matchWidth = false,
  className,
  role,
  id,
  ariaLabelledby,
  tabIndex,
  reflowKey,
  onKeyDown,
  panelRef,
  children,
}: AnchoredPopoverProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width?: number } | null>(null);

  // أحدث onDismiss في ref: يقرؤه المستمعون وقت الحدث، فلا يُعاد اشتراكهم مع كلّ إعادة رسم (بحث/تصفية)
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      innerRef.current = el;
      panelRef?.(el);
    },
    [panelRef],
  );

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = innerRef.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    if (matchWidth) panel.style.width = `${a.width}px`; // العرض أوّلًا كي يُقاس الارتفاع نهائيًّا (قد يلتفّ النصّ)
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    const PAD = 8;
    const GAP = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // عموديًّا: الجهة المفضّلة أوّلًا، وتنقلب للأخرى عند ضيقها واتّساع مقابلها، ثمّ تُقصر داخل الشاشة
    const below = a.bottom + GAP;
    const above = a.top - GAP - ph;
    let top = side === "above" ? above : below;
    if (side === "above" ? top < PAD && below + ph <= vh - PAD : top + ph > vh - PAD && above >= PAD) {
      top = side === "above" ? below : above;
    }
    top = Math.max(PAD, Math.min(top, vh - ph - PAD));
    // أفقيًّا: محاذاة منطقيّة تتبع اتجاه المستند (start في RTL = الحافّة اليمنى)، ثمّ قصر داخل الشاشة
    const rtl = getComputedStyle(anchor).direction === "rtl";
    const startLeft = rtl ? a.right - pw : a.left;
    const endLeft = rtl ? a.left : a.right - pw;
    const centerLeft = a.left + (a.width - pw) / 2;
    let left = matchWidth ? a.left : align === "end" ? endLeft : align === "center" ? centerLeft : startLeft;
    left = Math.max(PAD, Math.min(left, vw - pw - PAD));
    setPos({ top, left, width: matchWidth ? a.width : undefined });
  }, [anchorRef, align, side, matchWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // إعادة تموضع عند تبدّل الارتفاع (تصفية البحث) كي يبقى انقلاب اللوحة متّسقًا مع المُطلِق
  useLayoutEffect(() => {
    if (open) place();
  }, [open, reflowKey, place]);

  // الإغلاق بالنقر خارج المُطلِق واللوحة (capture ليسبق مُعالِجات المحتوى)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || innerRef.current?.contains(t)) return;
      onDismissRef.current("pointer");
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, anchorRef]);

  // الإغلاق بـ Escape (فقاعيّ — يترك capture النافذة يفوز داخلها كما كان: Escape يُغلق النافذة لا اللوحة)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onDismissRef.current("escape");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={setRefs}
      id={id}
      role={role}
      aria-labelledby={ariaLabelledby}
      tabIndex={tabIndex}
      className={"apop" + (className ? " " + className : "")}
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        width: pos?.width,
        visibility: pos ? "visible" : "hidden",
      }}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>,
    document.body,
  );
}
