"use client";

import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { DotsThreeOutlineVertical } from "@phosphor-icons/react";
import { AnchoredPopover } from "@adeeb/design-system";

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
};
export type MenuGroup = {
  header?: string;
  danger?: boolean;
  items: MenuItem[];
};

/**
 * قائمة إجراءات (⋯) — تنقّل لوحة مفاتيح (أسهم/Home/End) · كتابة‑للقفز (typeahead) · Enter/Space للاختيار ·
 * ESC/Tab/نقر‑خارج للإغلاق · إرجاع التركيز للمُطلِق · ARIA (menu/menuitem). التموضع والـPortal والإغلاق
 * تملكها بدائيّة {@link AnchoredPopover} (مصدر واحد لكلّ منسدلات النظام)؛ هنا سلوك القائمة ومظهرها (بادئة .dm).
 */
export function DropdownMenu({
  groups,
  ariaLabel = "إجراءات",
  triggerClassName = "dm-trigger",
  trigger,
  tone,
  matchWidth,
}: {
  groups: MenuGroup[];
  ariaLabel?: string;
  triggerClassName?: string;
  /**
   * محتوى المُطلِق حين لا يكون النقاط الثلاث — كأفتار الحساب في الشريط العلويّ. سلوك القائمة
   * (لوحة المفاتيح · ARIA · التموضع · الإغلاق) واحدٌ مهما تبدّل شكل المُطلِق، فلا تُبنى ثانيةً.
   */
  trigger?: React.ReactNode;
  /** نغمة القائمة كاملةً (سطح Aurora + حدّ بلون الحالة) — تُطابق حالة الصفّ/العنصر */
  tone?: "neutral" | "success" | "warning" | "danger";
  /**
   * تُساوي القائمةُ عرضَ مُطلِقها. تُطلَب حين يكون المُطلِق **زرَّ فعلٍ عريضًا** يفتح صيغًا
   * أو خيارات (كزرّ التحميل في محرّر الباركود): قائمةٌ أضيقُ أو أعرضُ منه تبدو غريبةً عنه.
   * ولا تُطلَب لمُطلِق النقاط الثلاث: عرضُه عرضُ أيقونة، فمساواتُه تخنق البنود.
   */
  matchWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const typeBuf = useRef("");
  const typeAt = useRef(0);
  const triggerId = useId();
  const menuId = useId();

  // قائمة مسطّحة للعناصر (للتنقّل) مع الحفاظ على بنية المجموعات في العرض
  const flat = groups.flatMap((g) => g.items);

  const firstEnabledFrom = useCallback(
    (start: number, dir: 1 | -1) => {
      const n = flat.length;
      for (let k = 0; k < n; k++) {
        const i = (((start + dir * k) % n) + n) % n;
        if (!flat[i].disabled) return i;
      }
      return -1;
    },
    [flat],
  );

  const nextEnabled = useCallback(
    (current: number, dir: 1 | -1) => {
      const n = flat.length;
      if (n === 0) return -1;
      const start = current < 0 ? (dir > 0 ? 0 : n - 1) : (((current + dir) % n) + n) % n;
      return firstEnabledFrom(start, dir);
    },
    [flat, firstEnabledFrom],
  );

  const close = useCallback((focusTrigger: boolean) => {
    setOpen(false);
    setActive(-1);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const openMenu = useCallback(
    (which: "first" | "last" | "none") => {
      setOpen(true);
      setActive(which === "first" ? firstEnabledFrom(0, 1) : which === "last" ? firstEnabledFrom(flat.length - 1, -1) : -1);
    },
    [firstEnabledFrom, flat.length],
  );

  const selectAt = useCallback(
    (i: number) => {
      const it = flat[i];
      if (!it || it.disabled) return;
      close(true);
      it.onSelect?.();
    },
    [flat, close],
  );

  // تحريك التركيز للعنصر النشط، أو لحاوية القائمة عند الفتح بلا إبراز (فأرة) — لالتقاط لوحة المفاتيح
  useEffect(() => {
    if (!open) return;
    if (active >= 0) itemRefs.current[active]?.focus();
    else menuRef.current?.focus({ preventScroll: true });
  }, [open, active]);

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) openMenu("first");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openMenu("last");
    }
  }

  function typeahead(char: string) {
    const now = Date.now();
    if (now - typeAt.current > 500) typeBuf.current = "";
    typeAt.current = now;
    typeBuf.current += char.toLowerCase();
    const buf = typeBuf.current;
    const n = flat.length;
    for (let k = 1; k <= n; k++) {
      const i = (((active < 0 ? 0 : active) + k) % n + n) % n;
      const it = flat[i];
      if (!it.disabled && it.label.toLowerCase().startsWith(buf)) {
        setActive(i);
        break;
      }
    }
  }

  function onMenuKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => nextEnabled(a, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => nextEnabled(a, -1));
        break;
      case "Home":
        e.preventDefault();
        setActive(firstEnabledFrom(0, 1));
        break;
      case "End":
        e.preventDefault();
        setActive(firstEnabledFrom(flat.length - 1, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (active >= 0) selectAt(active);
        break;
      case "Tab":
        e.preventDefault();
        close(true);
        break;
      default:
        if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) typeahead(e.key);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        className={triggerClassName + (tone ? ` dm-tone-${tone}` : "")}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openMenu("none"))}
        onKeyDown={onTriggerKeyDown}
      >
        {trigger ?? <DotsThreeOutlineVertical aria-hidden />}
      </button>

      <AnchoredPopover
        open={open}
        anchorRef={triggerRef}
        onDismiss={(reason) => close(reason === "escape")}
        align="start"
        matchWidth={matchWidth}
        className={"dm-menu" + (tone ? ` dm-tone-${tone}` : "")}
        role="menu"
        id={menuId}
        ariaLabelledby={triggerId}
        tabIndex={-1}
        onKeyDown={onMenuKeyDown}
        panelRef={(el) => {
          menuRef.current = el;
        }}
      >
        {groups.map((g, gi) => {
          // فهرس العنصر في القائمة المسطّحة = مجموع أطوال المجموعات السابقة + موضعه (بلا عدّاد متحوّل)
          const base = groups.slice(0, gi).reduce((n, gg) => n + gg.items.length, 0);
          return (
          <Fragment key={gi}>
            {gi > 0 ? <div className="dm-sep" role="separator" /> : null}
            {g.header ? (
              <div className={"dm-hd" + (g.danger ? " dg" : "")} role="presentation">{g.header}</div>
            ) : null}
            {g.items.map((it, ii) => {
              const idx = base + ii;
              return (
                <button
                  key={ii}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={"dm-item" + (it.danger ? " dg" : "") + (it.disabled ? " disabled" : "")}
                  aria-disabled={it.disabled || undefined}
                  data-highlighted={active === idx ? "" : undefined}
                  onClick={() => selectAt(idx)}
                  onMouseEnter={() => {
                    if (!it.disabled) setActive(idx);
                  }}
                >
                  {it.icon ? <span className="dm-ic">{it.icon}</span> : null}
                  <span>{it.label}</span>
                </button>
              );
            })}
          </Fragment>
          );
        })}
      </AnchoredPopover>
    </>
  );
}
