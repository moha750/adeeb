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
/** `groupIcon`: رمزُ مجموعته، يُرسم قبل اسمها في رأسها (يكفي في أوّل خياراتها) — محمد ٢٠٢٦-١١-١٢ */
export type SelectOption = { value: string; label: string; hint?: string; icon?: ReactNode; group?: string; groupIcon?: ReactNode };

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
  /** نصٌّ خافتٌ داخل الحقل المغلق ما دام لا اختيار — «اختر» إن لم يُمرَّر: كان سطرُ القيمة فارغًا كأنّ شيئًا سقط (٢٠٢٦-١١-٠٧). */
  placeholder?: string;
  disabled?: boolean;
  /** اسم حقل مخفيّ لإرساله ضمن النماذج. */
  name?: string;
  /** وسم «(اختياريّ)» بعد التسمية. يُلغي وسم الإلزام. */
  optional?: boolean;
  /** وسم الإلزام (نجمة حمراء) بعد التسمية. */
  required?: boolean;
  className?: string;
  /**
   * **الاختيارُ المتعدّد** (٢٠٢٦-١١-٢٤، نافذةُ التصدير: «لو أردتُ أكثرَ من لجنة؟»): القائمةُ نفسُها، والنقرُ يضيف ويرفع ولا يُغلقها،
   * وكلُّ مختارٍ بعلامته. والحقلُ المغلق يقول ما اختير («التصوير، الرواة») أو ما يلخّصه `summary` حين يكثر. وفارغًا يقول `emptyLabel`
   * (مثل «الكلّ») بحبر القيمة لا خافتًا: الفراغُ هنا اختيارٌ لا نقص، وصفُّه أوّلُ القائمة يرفع ما اختير.
   */
  multiple?: boolean;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  emptyLabel?: string;
  summary?: (chosen: SelectOption[]) => string;
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
  searchable: searchableProp,
  tone,
  error,
  helper,
  placeholder,
  disabled = false,
  name,
  optional,
  required,
  className,
  multiple = false,
  values,
  onValuesChange,
  emptyLabel,
  summary,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(defaultValue ?? "");
  const val = value !== undefined ? value : internal;
  const [query, setQuery] = useState("");
  const [hl, setHl] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // **البحثُ إذا زادت الخيارات على ثمانية** (قاعدةُ المرشّح، محمد ٢٠٢٦-١١-١٢) — في البوّابة وحدها (`.ash-content`) ما لم يُطلب صراحةً
  const [inPortal, setInPortal] = useState(false);
  useEffect(() => { setInPortal(!!rootRef.current?.closest(".ash-content")); }, []);
  const searchable = searchableProp ?? (inPortal && options.length > 8);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = multiple ? undefined : options.find((o) => o.value === val);
  const many = multiple ? options.filter((o) => (values ?? []).includes(o.value)) : [];
  const isSel = (v: string) => (multiple ? (values ?? []).includes(v) : v === val);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    return options.filter((o) => matchesSearch(query, o.label, o.hint));
  }, [options, query, searchable]);

  // تسلسل العرض: عناوين المجموعات + الخيارات (مع فهرس للتنقّل)
  const seq = useMemo(() => {
    const out: Array<{ type: "header"; label: string; icon?: ReactNode } | { type: "option"; opt: SelectOption; index: number }> = [];
    let idx = 0;
    let lastGroup: string | undefined;
    for (const o of filtered) {
      if (o.group && o.group !== lastGroup) {
        out.push({ type: "header", label: o.group, icon: o.groupIcon });
        lastGroup = o.group;
      }
      out.push({ type: "option", opt: o, index: idx });
      idx += 1;
    }
    return out;
  }, [filtered]);

  const choose = (v: string) => {
    // المتعدّد: يضيف أو يرفع، والقائمةُ مفتوحةٌ حتى يُفرغ منها
    if (multiple) {
      const cur = values ?? [];
      onValuesChange?.(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
      return;
    }
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
    setQuery("");
  };

  // **لا صفَّ مُنارٌ عند الفتح بالنقر** (قاعدةُ قائمة المرشّح المعتمدة): المختارُ يُعرف بنغمته وعلامته، والإنارةُ للمرور وللوحة المفاتيح —
  // فمن فتح بالمفاتيح يبدأ من المختار، ومن فتح بالنقر لا يُنار له شيءٌ حتى يمرّ (٢٠٢٦-١١-١٢)
  const byKey = useRef(false);
  useEffect(() => {
    // يُغلق فيُمحى بحثُه: من أعاد الفتح يرى الخيارات كلّها لا بقيّةَ بحثٍ مضى
    if (!open) { setQuery(""); return; }
    const cur = filtered.findIndex((o) => isSel(o.value));
    setHl(byKey.current ? (cur >= 0 ? cur : 0) : -1);
    byKey.current = false;
    if (cur >= 0) setTimeout(() => panelRef.current?.querySelector<HTMLElement>(".asel-sel")?.scrollIntoView({ block: "nearest" }), 0);
    // البحثُ التلقائيّ (أكثرُ من ثمانية) لا يُركَّز عليه في اللمس: يرفع لوحةَ المفاتيح فتغطّي القائمة؛ والمطلوبُ صراحةً كما كان
    if (searchable && (searchableProp || window.matchMedia("(pointer: fine)").matches)) setTimeout(() => searchRef.current?.focus(), 0);
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
        byKey.current = true;
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
      // لا صفَّ مُنارٌ (فُتحت بالنقر): Enter يُبقي المختار، أو يأخذ الأوّل — كما كان قبل أن تُطفأ الإنارةُ عند الفتح
      const o = hl >= 0 ? filtered[hl] : filtered.find((x) => isSel(x.value)) ?? filtered[0];
      if (o) choose(o.value);
    }
  };

  return (
    <div className={cn("fld", error ? "err" : undefined, className)}>
      {label ? (
        <span ref={labelRef} className="fld-lbl">
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
          selected || many.length > 0 ? "asel-filled" : undefined,
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
          {multiple
            ? many.length > 0
              ? (summary ? summary(many) : many.map((o) => o.label).join("، "))
              : emptyLabel ?? <span className="asel-ph">{placeholder ?? "اختر"}</span>
            : selected ? selected.label : <span className="asel-ph">{placeholder ?? "اختر"}</span>}
          {selected?.hint ? <span className="asel-vhint">{selected.hint}</span> : null}
        </span>
        <span className="asel-chev"><Chev /></span>
      </button>
      {name ? <input type="hidden" name={name} value={multiple ? (values ?? []).join(",") : val} readOnly /> : null}

      <AnchoredPopover
        open={open && !disabled}
        anchorRef={rootRef}
        topRef={labelRef}
        onDismiss={(reason) => {
          setOpen(false);
          if (reason === "escape") triggerRef.current?.focus();
        }}
        matchWidth
        className={cn("asel-panel", tone && `asel-tone-${tone}`)}
        role="listbox"
        ariaMultiselectable={multiple || undefined}
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
          {multiple && emptyLabel && !query.trim() ? (
            <div
              role="option"
              aria-selected={many.length === 0}
              className={cn("asel-opt", many.length === 0 ? "asel-sel" : undefined)}
              onMouseEnter={() => setHl(-1)}
              onClick={() => onValuesChange?.([])}
            >
              <span className="asel-txt">{emptyLabel}</span>
              <span className="asel-ck"><Check /></span>
            </div>
          ) : null}
          {seq.map((row, i) =>
            row.type === "header" ? (
              <div className="asel-gh" key={`h-${i}`}>{row.icon ? <span className="asel-gi" aria-hidden>{row.icon}</span> : null}<span>{row.label}</span></div>
            ) : (
              <div
                key={row.opt.value}
                role="option"
                aria-selected={isSel(row.opt.value)}
                className={cn(
                  "asel-opt",
                  isSel(row.opt.value) ? "asel-sel" : undefined,
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
