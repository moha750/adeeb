"use client";

/**
 * **جدولُ البيانات** (٢٠٢٦-١١-٠٨، لنتائج الاستبيان): مصفوفةٌ كاملة — سطرٌ لكلّ سجلّ وعمودٌ لكلّ حقل — تُمرَّر أفقيًّا وعمودُها الأوّل
 * ثابت. وهو غيرُ جدول الغرف (`AdList`): ذاك قائمةُ سجلّاتٍ بأعمدةٍ قليلةٍ تصير سطورًا في الضيّق؛ وهذا بياناتٌ تُقارَن سطرًا بسطر
 * (استبيانُ تسجيلٍ بعشرين حقلًا)، فلا يُطوى ولا يُقصّ: الخليّةُ تلتفّ على عرضٍ أقصاه (على `.ad-grid-c` داخلها: المتصفّحُ يتجاهل أقصى العرض على خليّة الجدول)، والجدولُ يُمرَّر. ويُبلَغ باللوحة (`region`).
 * و`on`: العمودُ المؤكَّد (سؤالُ التصفية).
 */
import type { ReactNode } from "react";

/** من كم حرفًا يُعدّ الجوابُ طويلًا */
const WIDE_AT = 60;

export type AdGridColumn = { key: string; label: string };
export type AdGridRow = { id: string | number; head: ReactNode; cells: (string | null)[] };

export function AdDataGrid({ label, head, columns, rows, on }: {
  label: string;
  /** اسمُ العمود الأوّل الثابت («المجيب») */
  head: string;
  columns: AdGridColumn[];
  rows: AdGridRow[];
  on?: string | null;
}) {
  // عمودٌ فيه جوابٌ طويلٌ يُحفظ له عرضُه الأقصى حين تكثر الأعمدة، فلا يصير مقالًا بعرض كلمتين
  const wide = columns.map((_, i) => rows.some((r) => (r.cells[i]?.length ?? 0) > WIDE_AT));
  return (
    <div className="ad-dgrid" tabIndex={0} role="region" aria-label={label}>
      <table className="ad-grid-t" aria-label={label}>
        <thead>
          <tr>
            <th scope="col">{head}</th>
            {columns.map((c, i) => <th key={c.key} scope="col" data-on={on === c.key ? "" : undefined}><span className="ad-grid-c" data-wide={wide[i] || undefined}>{c.label}</span></th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.head}</th>
              {r.cells.map((v, i) => (
                <td key={columns[i]?.key ?? i} data-na={v ? undefined : ""} data-on={on && columns[i]?.key === on ? "" : undefined}><span className="ad-grid-c" data-wide={wide[i] || undefined}>{v || "—"}</span></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
