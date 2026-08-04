"use client";

import { useRef, useState } from "react";
import { MagnifyingGlass, CaretDown, Check, X, Table, SquaresFour, ArrowCounterClockwise } from "@phosphor-icons/react";
import { AnchoredPopover } from "@adeeb/design-system";

export type FilterOption = { value: string; label: string };
export type FilterDef = { key: string; label: string; options: FilterOption[] };

export type ViewMode = "table" | "cards";

function FilterSelect({ def, value, onChange }: { def: FilterDef; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const selected = def.options.find((o) => o.value === value);
  return (
    <div className={"tb-fs" + (open ? " open" : "")}>
      <button ref={btnRef} type="button" className={"tb-fs-btn" + (value ? " on" : "")} onClick={() => setOpen((o) => !o)}>
        <span>{def.label}{selected ? <>: <span className="val">{selected.label}</span></> : null}</span>
        <span className="asel-chev"><CaretDown /></span>
      </button>
      <AnchoredPopover open={open} anchorRef={btnRef} onDismiss={() => setOpen(false)} align="start" className="tb-fs-panel" role="listbox">
        <button type="button" className={"tb-fs-opt" + (!value ? " sel" : "")} onClick={() => { onChange(""); setOpen(false); }}>
          <span className="tb-fs-txt">الكل</span>
          <Check className="tb-fs-ck" aria-hidden />
        </button>
        {def.options.map((o) => (
          <button key={o.value} type="button" className={"tb-fs-opt" + (o.value === value ? " sel" : "")} onClick={() => { onChange(o.value); setOpen(false); }}>
            <span className="tb-fs-txt">{o.label}</span>
            <Check className="tb-fs-ck" aria-hidden />
          </button>
        ))}
      </AnchoredPopover>
    </div>
  );
}

type ToolbarProps = {
  searchPlaceholder?: string;
  /** البحث اختياريّ: إن غاب `onSearch` لم يُرسَم حقل البحث — شريطٌ لا يحمل إلّا مبدّل العرض مثلًا. */
  search?: string;
  onSearch?: (v: string) => void;
  filters?: FilterDef[];
  filterValues?: Record<string, string>;
  onFilter?: (key: string, value: string) => void;
  onReset?: () => void;
  /** مبدّل العرض (جدول/كروت) — يظهر فقط إن مُرِّر onViewChange */
  view?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
  /** أزرار مخصّصة تُعرض في الطرف اللاحق (مثل توسيع/تحرير/روابط) */
  actions?: React.ReactNode;
  /** حالة التحديد */
  selectedCount?: number;
  bulkActions?: React.ReactNode;
  onClearSelection?: () => void;
};

export function Toolbar({
  searchPlaceholder = "ابحث…", search, onSearch,
  filters, filterValues = {}, onFilter, onReset,
  view, onViewChange, actions, selectedCount = 0, bulkActions, onClearSelection,
}: ToolbarProps) {
  // عند تحديد صفوف: يتحوّل الشريط إلى إجراءات جماعية
  if (selectedCount > 0) {
    return (
      <div className="tb sel-mode">
        <span className="tb-selcount"><b className="num">{selectedCount}</b> محدّدون</span>
        <div className="tb-bulk">{bulkActions}</div>
        <button type="button" className="tb-bulk-x" onClick={onClearSelection}><X /><span>إلغاء التحديد</span></button>
      </div>
    );
  }

  const anyFilter = Object.values(filterValues).some(Boolean);
  return (
    <div className="tb">
      {onSearch && (
        <div className="tb-search fld-wrap">
          <span className="fld-iic" aria-hidden="true"><MagnifyingGlass /></span>
          <input className="fld-in" value={search ?? ""} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} />
        </div>
      )}
      {filters?.map((f) => (
        <FilterSelect key={f.key} def={f} value={filterValues[f.key] ?? ""} onChange={(v) => onFilter?.(f.key, v)} />
      ))}
      {anyFilter && (
        <button type="button" className="tb-reset" onClick={onReset}>
          <ArrowCounterClockwise aria-hidden />
          إعادة تعيين
        </button>
      )}
      <div className="tb-spacer" />
      {onViewChange && (
        <div className="tb-view" role="tablist" aria-label="نمط العرض">
          <button type="button" className={view === "table" ? "on" : ""} onClick={() => onViewChange("table")} aria-label="عرض جدول" title="جدول"><Table /></button>
          <button type="button" className={view === "cards" ? "on" : ""} onClick={() => onViewChange("cards")} aria-label="عرض كروت" title="كروت"><SquaresFour /></button>
        </div>
      )}
      {actions ? <div className="tb-actions">{actions}</div> : null}
    </div>
  );
}
