"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Select } from "@adeeb/design-system";

/** حجم صفحة يعني «كلّ الصفوف في صفحة واحدة» — رقمٌ ضخم يجعل الحساب صفحةً واحدة بلا استثناء */
export const ALL_ROWS = Number.MAX_SAFE_INTEGER;

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  noun?: string;
};

/** قائمة أرقام الصفحات مع «…» عند كثرتها */
function pageList(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const left = Math.max(2, cur - 1);
  const right = Math.min(total - 1, cur + 1);
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function Pagination({
  page, pageSize, total, onPageChange, onPageSizeChange,
  pageSizeOptions = [50, 100, 250, 500, ALL_ROWS], noun = "عنصر",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pag">
      <div className="pag-left">
        <span className="pag-rpp">
          صفوف لكل صفحة
          <Select
            className="pag-sel"
            options={pageSizeOptions.map((o) => ({ value: String(o), label: o === ALL_ROWS ? "الكل" : String(o) }))}
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          />
        </span>
        <span className="pag-rng">عرض <b>{from}–{to}</b> من <b>{total}</b> {noun}</span>
      </div>

      <div className="pag-nav">
        <button type="button" className="pag-arr" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="الصفحة السابقة"><CaretRight aria-hidden /></button>
        <div className="pag-pages">
          {pageList(page, totalPages).map((p, i) =>
            p === "…"
              ? <span key={"d" + i} className="pag-dot">…</span>
              : <button key={p} type="button" className={"pag-num" + (p === page ? " on" : "")} onClick={() => onPageChange(p)} aria-current={p === page ? "page" : undefined}>{p}</button>,
          )}
        </div>
        <button type="button" className="pag-arr" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="الصفحة التالية"><CaretLeft aria-hidden /></button>
      </div>
    </div>
  );
}
