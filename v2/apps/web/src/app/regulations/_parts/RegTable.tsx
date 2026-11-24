"use client";

import { AdDataGrid } from "@/app/_ad/grid";

/**
 * جدولُ المادّة بجدول بيانات الهويّة (`AdDataGrid`، ٢٠٢٦-١١-٢٢؛ كان `DataTable` القديم): عمودُه الأوّل ثابتٌ رأسًا للسطر، ويُمرَّر أفقيًّا
 * في الضيّق ولا يُقصّ.
 */
export function RegTable({ head, rows }: { head: string[]; rows: string[][] }) {
  const [first, ...rest] = head;
  return (
    <AdDataGrid label={first ?? "جدول"} head={first ?? ""} columns={rest.map((h, c) => ({ key: String(c), label: h }))}
      rows={rows.map((r, j) => ({ id: j, head: r[0], cells: r.slice(1) }))} />
  );
}
