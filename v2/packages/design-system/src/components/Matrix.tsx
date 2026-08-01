"use client";

import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../lib/cn";

export type MatrixColumn = {
  key: string;
  label: ReactNode;
  /** سطرٌ صغير تحت عنوان العمود (عدّاد نموذجًا). */
  hint?: ReactNode;
  /** نصٌّ كامل عند التحويم — العنوان الضيّق قد يلتفّ. */
  title?: string;
};

export type MatrixRow = {
  key: string;
  label: ReactNode;
  /** سطرٌ صغير تحت اسم الصفّ (المفتاح اللاتينيّ نموذجًا). */
  hint?: ReactNode;
};

/** مجموعةُ صفوفٍ تحت عنوانٍ يشقّ الشبكة عرضًا. مرّر مجموعةً واحدة بلا `label` لمصفوفةٍ مسطّحة. */
export type MatrixGroup = { key: string; label?: ReactNode; rows: MatrixRow[] };

export interface MatrixProps {
  columns: MatrixColumn[];
  groups: MatrixGroup[];
  /** ما يُرسَم في تقاطع الصفّ بالعمود (مربّع اختيار · علامة قراءة). */
  cell: (row: MatrixRow, column: MatrixColumn) => ReactNode;
  /** خليّة الرُّكن — تسمّي المحورين. */
  corner?: ReactNode;
  /** عرض عمود الصفوف (الأوّل). */
  rowHead?: string;
  /** عرض كلّ عمودٍ من أعمدة المحور الثاني. */
  colWidth?: string;
  /** سقفُ ارتفاعٍ يجعل الرأس يلتصق عند التمرير الرأسيّ. */
  maxHeight?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * المصفوفة — علاقةٌ ثنائيّة (صفّ × عمود) تُقرأ في الاتجاهين: رأسٌ لاصقٌ أعلى، وعمودُ
 * صفوفٍ لاصقٌ في الصدر، وصليبٌ مُضاء يتبع الخليّة المارّ عليها فلا يضيع البصر بين الأعمدة.
 *
 * الشبكةُ واحدةٌ والصفوف `display: contents` (كسابقة `DataTable`) — فتُقاس الأعمدة معًا
 * ولا تتراقص، والتمرير الأفقيّ في `.mtx-scroll` وحده.
 */
export function Matrix({
  columns,
  groups,
  cell,
  corner,
  rowHead = "minmax(210px, 1fr)",
  colWidth = "78px",
  maxHeight,
  className,
  ...aria
}: MatrixProps) {
  // الصليب: مفتاحا الصفّ والعمود المارّ عليهما — حالةٌ واحدة لا حالتان فلا يتخلّف أحدهما
  const [cross, setCross] = useState<{ row?: string; col?: string }>({});
  const style = {
    "--mtx-cols": `${rowHead} repeat(${columns.length}, ${colWidth})`,
    ...(maxHeight ? { "--mtx-h": maxHeight } : null),
  } as CSSProperties;

  return (
    <div className={cn("mtx", className)} aria-label={aria["aria-label"]}>
      <div className="mtx-scroll">
        <div className="mtx-grid" style={style} onMouseLeave={() => setCross({})}>
          <div className="mtx-corner">{corner}</div>

          {columns.map((c) => (
            <div
              key={c.key}
              title={c.title}
              className={cn("mtx-ch", cross.col === c.key && "is-cross")}
              onMouseEnter={() => setCross({ col: c.key })}
            >
              <span>{c.label}</span>
              {c.hint != null ? <small dir="ltr">{c.hint}</small> : null}
            </div>
          ))}

          {groups.map((g) => (
            <Fragment key={g.key}>
              {g.label != null ? (
                <div className="mtx-group"><span>{g.label}</span></div>
              ) : null}
              {g.rows.map((r) => (
                <div key={r.key} className="mtx-row">
                  <div
                    className={cn("mtx-rh", cross.row === r.key && "is-cross")}
                    onMouseEnter={() => setCross({ row: r.key })}
                  >
                    <b>{r.label}</b>
                    {r.hint != null ? <small dir="ltr">{r.hint}</small> : null}
                  </div>
                  {columns.map((c) => (
                    <div
                      key={c.key}
                      className={cn("mtx-c", (cross.row === r.key || cross.col === c.key) && "is-cross")}
                      onMouseEnter={() => setCross({ row: r.key, col: c.key })}
                    >
                      {cell(r, c)}
                    </div>
                  ))}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
