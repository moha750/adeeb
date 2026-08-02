"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { matchesSearch } from "../lib/search";
import { AnchoredPopover } from "./AnchoredPopover";
import { FieldMark } from "./FieldMark";

/**
 * `hint` — سطرُ حالٍ تحت التسمية: واقعةٌ عن الخيار لا وصفٌ له («عضو — لجنة التصميم»).
 * يدخل البحث مع التسمية، فيُطلب الخيار بموضعه كما يُطلب باسمه.
 */
export type SelectOption = { value: string; label: string; hint?: string; icon?: ReactNode; group?: string };

export interface SelectProps {
  /** تسمية أعلى القائمة — اختياريّة (تُحذف في السياقات المضغوطة كترقيم «صفوف لكل صفحة»). */
  label?: string;
  /** أيقونة هويّة بجانب التسمية (كنظام الحقل المعتمَد). */
  icon?: ReactNode;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** يُظهر حقل بحث لتصفية الخيارات. */
  searchable?: boolean;
  /** نغمة تُوضَع على اللوحة المنبثقة (portaled) لتتبع نغمة نافذةٍ منغّمة يعيش داخلها — البحث والخيار المختار والحلقة. */
  tone?: "warning" | "danger" | "success";
  error?: string;
  helper?: string;
  disabled?: boolean;
  /** اسم حقل مخفيّ لإرساله ضمن النماذج. */
  name?: string;
  /** وسم «(اختياريّ)» بعد التسمية. يُلغي وسم الإلزام. */
  optional?: boolean;
  /** وسم الإلزام (نجمة حمراء) بعد التسمية. */
  required?: boolean;
  className?: string;
}

const Chev = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12l5 5L20 7" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
  </svg>
);

/**
 * قائمة منسدلة مخصّصة — بُنيت خطوة‑خطوة: سهم في دائرة · لوحة بحدّ · مرور فاتح ·
 * مُختار كحليّ + صحّ · بحث + تجميع + أيقونات. تسمية عائمة وحالات ولوحة مفاتيح.
 */
export function Select({
  label,
  icon,
  options,
  value,
  defaultValue,
  onValueChange,
  searchable = false,
  tone,
  error,
  helper,
  disabled = false,
  name,
  optional,
  required,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(defaultValue ?? "");
  const val = value !== undefined ? value : internal;
  const [query, setQuery] = useState("");
  const [hl, setHl] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === val);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    return options.filter((o) => matchesSearch(query, o.label, o.hint));
  }, [options, query, searchable]);

  // تسلسل العرض: عناوين المجموعات + الخيارات (مع فهرس للتنقّل)
  const seq = useMemo(() => {
    const out: Array<{ type: "header"; label: string } | { type: "option"; opt: SelectOption; index: number }> = [];
    let idx = 0;
    let lastGroup: string | undefined;
    for (const o of filtered) {
      if (o.group && o.group !== lastGroup) {
        out.push({ type: "header", label: o.group });
        lastGroup = o.group;
      }
      out.push({ type: "option", opt: o, index: idx });
      idx += 1;
    }
    return out;
  }, [filtered]);

  const choose = (v: string) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const cur = filtered.findIndex((o) => o.value === val);
    setHl(cur >= 0 ? cur : 0);
    if (searchable) setTimeout(() => searchRef.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>(".asel-hl")?.scrollIntoView({ block: "nearest" });
  }, [hl, open]);

  const onKey = (e: KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Tab") {
      // اللوحة خارج فخّ تركيز النافذة (Portal) — نُغلق ونُعيد التركيز للمُطلِق داخل الفخّ
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHl((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHl((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[hl];
      if (o) choose(o.value);
    }
  };

  return (
    <div className={cn("fld", error ? "err" : undefined, className)}>
      {label ? (
        <span className="fld-lbl">
          {icon ? <span className="fld-lic" aria-hidden="true">{icon}</span> : null}
          {label}
          <FieldMark optional={optional} required={required} />
        </span>
      ) : null}
      <div
        ref={rootRef}
        className={cn(
          "asel",
          open ? "asel-open" : undefined,
          selected ? "asel-filled" : undefined,
          error ? "asel-error" : undefined,
          disabled ? "asel-disabled" : undefined,
        )}
      >
      <button
        ref={triggerRef}
        type="button"
        className="asel-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKey}
      >
        {/* التلميح يبقى بعد الاختيار: الحقلُ المغلق هو ما يراه المستخدم لحظةَ الإرسال. */}
        <span className="asel-value">
          {selected?.label ?? ""}
          {selected?.hint ? <span className="asel-vhint">{selected.hint}</span> : null}
        </span>
        <span className="asel-chev"><Chev /></span>
      </button>
      {name ? <input type="hidden" name={name} value={val} readOnly /> : null}

      <AnchoredPopover
        open={open && !disabled}
        anchorRef={rootRef}
        onDismiss={(reason) => {
          setOpen(false);
          if (reason === "escape") triggerRef.current?.focus();
        }}
        matchWidth
        className={cn("asel-panel", tone && `asel-tone-${tone}`)}
        role="listbox"
        reflowKey={seq.length}
        panelRef={(el) => {
          panelRef.current = el;
        }}
      >
          {searchable ? (
            <div className="asel-search">
              <span className="asel-si"><SearchIcon /></span>
              <input
                ref={searchRef}
                value={query}
                placeholder="ابحث…"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHl(0);
                }}
                onKeyDown={onKey}
              />
            </div>
          ) : null}
          <div className="asel-list">
          {seq.length === 0 ? <div className="asel-empty">لا نتائج</div> : null}
          {seq.map((row, i) =>
            row.type === "header" ? (
              <div className="asel-gh" key={`h-${i}`}>{row.label}</div>
            ) : (
              <div
                key={row.opt.value}
                role="option"
                aria-selected={row.opt.value === val}
                className={cn(
                  "asel-opt",
                  row.opt.value === val ? "asel-sel" : undefined,
                  row.index === hl ? "asel-hl" : undefined,
                )}
                onMouseEnter={() => setHl(row.index)}
                onClick={() => choose(row.opt.value)}
              >
                {row.opt.icon ? <span className="asel-oic">{row.opt.icon}</span> : null}
                <span className="asel-txt">
                  {row.opt.label}
                  {row.opt.hint ? <span className="asel-hint">{row.opt.hint}</span> : null}
                </span>
                <span className="asel-ck"><Check /></span>
              </div>
            ),
          )}
          </div>
      </AnchoredPopover>

      </div>
      {(error ?? helper) ? <span className="fld-help">{error ?? helper}</span> : null}
    </div>
  );
}
