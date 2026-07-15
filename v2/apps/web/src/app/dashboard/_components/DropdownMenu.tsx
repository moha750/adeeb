"use client";

import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DotsThreeOutlineVertical } from "@phosphor-icons/react";

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
 * قائمة إجراءات (⋯) — سلوك يدويّ كامل (بديل Radix DropdownMenu): تموضع مُدرِك للحوافّ عبر Portal ·
 * تنقّل لوحة مفاتيح (أسهم/Home/End) · كتابة‑للقفز (typeahead) · Enter/Space للاختيار · ESC/Tab/نقر‑خارج للإغلاق ·
 * إرجاع التركيز للمُطلِق · ARIA (menu/menuitem + aria-expanded + data-highlighted) — بمظهر Aurora (بادئة .dm).
 */
export function DropdownMenu({
  groups,
  ariaLabel = "إجراءات",
  triggerClassName = "dm-trigger",
  tone,
}: {
  groups: MenuGroup[];
  ariaLabel?: string;
  triggerClassName?: string;
  /** نغمة القائمة كاملةً (سطح Aurora + حدّ بلون الحالة) — تُطابق حالة الصفّ/العنصر */
  tone?: "success" | "warning" | "danger";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
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
    setPos(null);
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

  // تموضع مُدرِك للحوافّ: أسفل المُطلِق، محاذاة الحافّة الخارجيّة، وينقلب لأعلى عند ضيق الأسفل
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const t = triggerRef.current;
      const m = menuRef.current;
      if (!t || !m) return;
      const tr = t.getBoundingClientRect();
      const mr = m.getBoundingClientRect();
      const PAD = 8;
      const GAP = 6;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let top = tr.bottom + GAP;
      if (top + mr.height > vh - PAD && tr.top - GAP - mr.height >= PAD) top = tr.top - GAP - mr.height;
      top = Math.max(PAD, Math.min(top, vh - mr.height - PAD));
      let left = tr.right - mr.width;
      left = Math.max(PAD, Math.min(left, vw - mr.width - PAD));
      setPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // تحريك التركيز للعنصر النشط، أو لحاوية القائمة عند الفتح بلا إبراز (فأرة) — لالتقاط لوحة المفاتيح
  useEffect(() => {
    if (!open) return;
    if (active >= 0) itemRefs.current[active]?.focus();
    else menuRef.current?.focus({ preventScroll: true });
  }, [open, active, pos]);

  // إغلاق عند النقر خارج القائمة والمُطلِق
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, close]);

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
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        e.preventDefault();
        close(true);
        break;
      default:
        if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) typeahead(e.key);
    }
  }

  let flatIdx = -1; // فهرس مسطّح تصاعديّ أثناء العرض

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
        <DotsThreeOutlineVertical weight="bold" aria-hidden />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              tabIndex={-1}
              aria-labelledby={triggerId}
              className={"dm-menu" + (tone ? ` dm-tone-${tone}` : "")}
              style={{
                position: "fixed",
                top: pos?.top ?? 0,
                left: pos?.left ?? 0,
                visibility: pos ? "visible" : "hidden",
              }}
              onKeyDown={onMenuKeyDown}
            >
              {groups.map((g, gi) => (
                <Fragment key={gi}>
                  {gi > 0 ? <div className="dm-sep" role="separator" /> : null}
                  {g.header ? (
                    <div className={"dm-hd" + (g.danger ? " dg" : "")} role="presentation">{g.header}</div>
                  ) : null}
                  {g.items.map((it, ii) => {
                    flatIdx += 1;
                    const idx = flatIdx;
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
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
