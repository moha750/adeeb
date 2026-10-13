"use client";

import { DataTable } from "@/app/dashboard/_components/DataTable";

type Row = { id: string; cells: string[] };

/** جدولُ المادّة: الجدولُ عميليٌّ يأخذ دوالَّ عرضه، فيُبنى هنا من بياناتٍ صِرفةٍ تعبر من الخادم. */
export function RegTable({ head, rows }: { head: string[]; rows: string[][] }) {
  const data: Row[] = rows.map((r, j) => ({ id: String(j), cells: r }));
  return (
    <DataTable<Row>
      columns={head.map((h, c) => ({ key: String(c), header: h, wrap: true, render: (r: Row) => r.cells[c] }))}
      rows={data}
      getRowId={(r) => r.id}
    />
  );
}
