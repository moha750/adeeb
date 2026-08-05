"use client";

import { useState } from "react";
import { CaretDown } from "@/app/_components/glyphs";
import { CaretUp, CaretUpDown } from "@/app/_components/glyphs";
import { DropdownMenu, type MenuGroup } from "./DropdownMenu";
import { Skeleton } from "./Skeleton";

export type Column<T> = {
  key: string;
  header: string;
  /** عرض الخلية؛ الافتراضي نصّ من المفتاح. `index` موضع الصفّ في القائمة المرتّبة (لعمود «#»/«الترتيب») */
  render?: (row: T, index: number) => React.ReactNode;
  /** مسار عمود الشبكة، مثل "1.1fr" أو "140px" */
  width?: string;
  align?: "start" | "center" | "end";
  /** يلتفّ محتوى العمود حرًّا (متعدّد الأسطر) بدل السطر الواحد المتّسع — للإجابات/النصوص الحرّة الطويلة */
  wrap?: boolean;
  /** يُفعّل ترويسة قابلة للفرز (يُوصَل بحالة الفرز من المستهلك) */
  sortable?: boolean;
  /** لبنة التحميل لهذا العمود؛ الافتراضي قضيب */
  skeleton?: React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  selectable?: boolean;
  /** تحديد مُتحكَّم به (لمشاركته مع شريط الأدوات)؛ إن غاب فداخليّ */
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  /** قائمة إجراءات الصفّ (مجموعات) — تُعرض في زرّ ⋯ */
  rowActions?: (row: T) => MenuGroup[];
  onRowClick?: (row: T) => void;
  /** حالة الفرز الحاليّة ومبدّلها (يديرها المستهلك عبر TanStack Table) */
  sort?: { id: string; desc: boolean } | null;
  onToggleSort?: (id: string) => void;
  /** تذييل مُلحق داخل بطاقة الجدول (مثل الترقيم) */
  footer?: React.ReactNode;
  /** يُعرض بدل الصفوف حين تكون القائمة فارغة */
  emptyState?: React.ReactNode;
  /** حالة التحميل — تعرض صفوف هيكل */
  loading?: boolean;
  skeletonRows?: number;
  /** نغمة الجدول كاملةً (طاولة تمثّل حالة واحدة: حدّ/ترويسة/تزيبير/ظلّ بلون النغمة) */
  tone?: "success" | "warning" | "danger" | "neutral";
  /** نغمة كلّ صفّ حسب حالته (تِنت الخلايا + أفتار بلون الحالة) */
  rowTone?: (row: T) => "success" | "warning" | "danger" | "neutral" | undefined;
};

const alignClass = (a?: Column<unknown>["align"]) => (a === "center" ? " center" : a === "end" ? " end" : "");

/** مربّع اختيار الجدول — نفس عنصر التصميم المتّفق عليه (رسم + ارتداد عبر .ach). */
function TableCheck({ checked, indeterminate, onChange, label }: {
  checked: boolean; indeterminate?: boolean; onChange: () => void; label: string;
}) {
  return (
    <label className="ach dt-ach" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={checked} ref={(el) => { if (el) el.indeterminate = !!indeterminate; }} onChange={onChange} aria-label={label} />
      <span className="ach-box">
        <svg className="ach-chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12l5 5L20 7" />
        </svg>
      </span>
    </label>
  );
}

export function DataTable<T>({ columns, rows, getRowId, selectable, selected, onSelectedChange, rowActions, onRowClick, sort, onToggleSort, footer, emptyState, loading, skeletonRows = 5, tone, rowTone }: Props<T>) {
  const [internal, setInternal] = useState<Set<string>>(new Set());
  const sel = selected ?? internal;
  const commit = (next: Set<string>) => (onSelectedChange ? onSelectedChange(next) : setInternal(next));

  const ids = rows.map(getRowId);
  const allOn = ids.length > 0 && ids.every((id) => sel.has(id));
  const someOn = !allOn && ids.some((id) => sel.has(id));

  // عمود مرن (fr) → يُحاط بـ minmax(max-content, …) كي لا يقلّ عن محتواه (بلا اقتطاع «…») ويتمدّد على الشاشات العريضة؛
  // فإن ضاقت الحاوية عن مجموع المحتوى ظهر تمرير أفقيّ. الأعمدة الثابتة (px) تبقى كما هي.
  const flexCol = (w: string) => {
    if (!w.includes("fr")) return w;
    const m = w.match(/^minmax\([^,]+,\s*(.+)\)$/);
    return `minmax(max-content, ${m ? m[1].trim() : w})`;
  };
  const cols = [
    selectable ? "42px" : null,
    ...columns.map((c) => flexCol(c.width ?? "1fr")),
    rowActions ? "48px" : null,
  ].filter(Boolean).join(" ");

  const toggleAll = () => commit(allOn ? new Set() : new Set(ids));
  const toggleOne = (id: string) => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    commit(n);
  };

  return (
    <div className={"dt" + (tone ? ` dt-tone-${tone}` : "")}>
      <div className="dt-scroll">
        <div className="dt-grid" style={{ "--dt-cols": cols } as React.CSSProperties}>
      <div className="dt-head">
        <div className="dt-row">
          {selectable && (
            <div className="dt-c dt-check">
              <TableCheck checked={allOn} indeterminate={someOn} onChange={toggleAll} label="تحديد الكل" />
            </div>
          )}
          {columns.map((c) => {
            const active = sort?.id === c.key;
            return (
              <div key={c.key} className={"dt-c" + alignClass(c.align) + (c.wrap ? " dt-wrap" : "")}>
                {c.sortable && onToggleSort ? (
                  <button type="button" className={"dt-sort" + (active ? " on" : "")} onClick={() => onToggleSort(c.key)} aria-label={`فرز حسب ${c.header}`}>
                    <span>{c.header}</span>
                    {active ? (sort!.desc ? <CaretDown aria-hidden /> : <CaretUp aria-hidden />) : <CaretUpDown aria-hidden />}
                  </button>
                ) : (
                  c.header
                )}
              </div>
            );
          })}
          {rowActions && <div className="dt-c dt-check" />}
        </div>
      </div>

      {loading ? (
        <div className="dt-body">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div key={i} className="dt-row">
              {selectable && <div className="dt-c dt-check"><Skeleton width={17} height={17} radius={5} /></div>}
              {columns.map((c) => (
                <div key={c.key} className={"dt-c" + alignClass(c.align)}>
                  {c.skeleton ?? <Skeleton width="65%" />}
                </div>
              ))}
              {rowActions && <div className="dt-c dt-check"><Skeleton width={18} height={18} radius={6} /></div>}
            </div>
          ))}
        </div>
      ) : rows.length === 0 && emptyState ? (
        <div className="dt-empty">{emptyState}</div>
      ) : (
      <div className="dt-body">
        {rows.map((row, i) => {
          const id = getRowId(row);
          const rt = rowTone?.(row);
          // نغمة قائمة الإجراءات = نغمة الصفّ، أو نغمة الطاولة إن كانت دلاليّة (لا العلامة)
          const dmTone = rt ?? tone;
          return (
            <div
              key={id}
              className={"dt-row" + (onRowClick ? " clickable" : "") + (rt ? ` dt-tone-${rt}` : "")}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {selectable && (
                <div className="dt-c dt-check">
                  <TableCheck checked={sel.has(id)} onChange={() => toggleOne(id)} label="تحديد الصفّ" />
                </div>
              )}
              {columns.map((c) => (
                <div key={c.key} className={"dt-c" + alignClass(c.align) + (c.wrap ? " dt-wrap" : "")}>
                  {c.render ? c.render(row, i) : <span className="txt">{String((row as Record<string, unknown>)[c.key] ?? "")}</span>}
                </div>
              ))}
              {rowActions && (
                <div className="dt-c dt-check" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu groups={rowActions(row)} triggerClassName="dt-dots" tone={dmTone} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
        </div>
      </div>

      {footer ? <div className="dt-foot">{footer}</div> : null}
    </div>
  );
}
