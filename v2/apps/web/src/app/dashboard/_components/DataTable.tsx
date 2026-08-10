"use client";

import { Fragment, useState } from "react";
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

/**
 * مجموعةُ صفوفٍ تحت شريطٍ يشقّ الشبكة عرضًا — **داخل إطار الجدول الواحد**.
 *
 * منقولةٌ عن `MatrixGroup` بالمكتبة: قرارٌ اتّخذه النظامُ مرّةً للمصفوفة ولم ينله الجدول، فبقيت
 * الشاشاتُ المجمَّعة تلفّ الجدولَ بأكورديون — إطارٌ داخل إطار (ق٢ · ق٤ · ق٥).
 */
export type Group<T> = {
  key: string;
  /** عنوانُ المجموعة (اسمُ عضوٍ · شهر) */
  label: React.ReactNode;
  /** طرفُ الشريط: عدٌّ أو حال («●●○ · بقي إنذارٌ واحد») */
  hint?: React.ReactNode;
  rows: T[];
  /** نغمةُ الشريط بحال مجموعته (بلغَ الحدَّ ← خطر) */
  tone?: "success" | "warning" | "danger" | "neutral";
  /** مفتوحةٌ ابتداءً — الافتراض `true` */
  defaultOpen?: boolean;
};

type Base<T> = {
  columns: Column<T>[];
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
  /** أشرطةُ المجموعات لا تُطوى (عرضٌ محضٌ كـ`.mtx-group`) — الافتراض: تُطوى */
  staticGroups?: boolean;
};

/** إمّا صفوفٌ مسطّحة وإمّا مجموعاتٌ تحملها — لا الاثنان، والمترجمُ هو الحارس. */
type Props<T> = Base<T> & ({ rows: T[]; groups?: never } | { groups: Group<T>[]; rows?: never });

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

export function DataTable<T>({ columns, rows, groups, getRowId, selectable, selected, onSelectedChange, rowActions, onRowClick, sort, onToggleSort, footer, emptyState, loading, skeletonRows = 5, tone, rowTone, staticGroups }: Props<T>) {
  const [internal, setInternal] = useState<Set<string>>(new Set());
  // المطويّةُ لا المفتوحة: الافتراضُ فتحٌ، فجدولٌ يُفتح على فراغٍ تحت ترويسته يبدو معطوبًا.
  const shutByIntent = () => new Set((groups ?? []).filter((g) => g.defaultOpen === false).map((g) => g.key));
  const [shut, setShut] = useState<Set<string>>(shutByIntent);

  // **نيّةُ المستدعي تُبطِل الطيَّ حين تتبدّل** — ولا يكفي أن تُقرأ مرّةً عند التركيب.
  // العلّة: شاشةٌ فوق جدولها بحثٌ تُنقّي الصفوف ثمّ تعيد بناء المجموعات؛ فلو بقي الطيُّ على
  // حاله لرأى الباحثُ شريطًا **مغلقًا** فيه عدّادٌ ولا نتيجةَ تحته، فيظنّ البحث معطوبًا.
  // فالمستدعي يرفع `defaultOpen` عند وجود مرشِّح، وهذا يلتقط تبدُّلَ نيّته ويعيد الضبط.
  // ولا يمسّ طيًّا طواه المستخدم بيده: بصمةُ النيّة لا تتغيّر بنقرةٍ منه، بل بتغيّر المُدخَل.
  // (ضبطُ حالةٍ أثناء الرندر — نمط «معلومة من رندر سابق»، لا effect؛ كنظيره في `BirthdaysView`.)
  const intent = (groups ?? []).map((g) => `${g.key}:${g.defaultOpen === false ? 0 : 1}`).join("|");
  const [prevIntent, setPrevIntent] = useState(intent);
  if (prevIntent !== intent) { setPrevIntent(intent); setShut(shutByIntent()); }

  const sel = selected ?? internal;
  const commit = (next: Set<string>) => (onSelectedChange ? onSelectedChange(next) : setInternal(next));

  // كتلُ العرض: المجموعاتُ كما جاءت، أو كتلةٌ واحدةٌ بلا شريطٍ للجدول المسطّح — فمسارُ الرسم واحد.
  const blocks: Group<T>[] = groups ?? [{ key: "", label: null, rows: rows ?? [] }];
  // إزاحةُ كلّ كتلة في القائمة كاملةً — فترقيمُ الصفوف (`render(row, index)`) يبقى متّصلًا
  // ولا يتزحزح بطيّ مجموعةٍ فوقه.
  const offsets = blocks.reduce<number[]>((acc, b, i) => [...acc, i === 0 ? 0 : acc[i - 1] + blocks[i - 1].rows.length], []);
  const allRows = blocks.flatMap((b) => b.rows);

  const ids = allRows.map(getRowId);
  const allOn = ids.length > 0 && ids.every((id) => sel.has(id));
  const someOn = !allOn && ids.some((id) => sel.has(id));
  const toggleGroup = (k: string) =>
    setShut((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

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
      ) : allRows.length === 0 && emptyState ? (
        <div className="dt-empty">{emptyState}</div>
      ) : (
      blocks.map((b, bi) => {
        const open = !shut.has(b.key);
        const band = groups ? (
          <span className="dt-gr-in">
            {staticGroups ? null : <span className="dt-gr-ic"><CaretDown aria-hidden /></span>}
            <span className="dt-gr-lb">{b.label}</span>
            {b.hint ? <span className="dt-gr-hint">{b.hint}</span> : null}
          </span>
        ) : null;
        const bandClass = "dt-group" + (b.tone ? ` dt-tone-${b.tone}` : "");
        return (
          <Fragment key={b.key}>
            {band && (staticGroups ? (
              <div className={bandClass}>{band}</div>
            ) : (
              <button type="button" className={bandClass} aria-expanded={open} onClick={() => toggleGroup(b.key)}>{band}</button>
            ))}
            {/* `.dt-body` لكلّ كتلة — تناوبُ الصفوف (zebra) يُستأنف داخل مجموعته فلا يتعلّق بما قبله */}
            {open && (
      <div className="dt-body">
        {b.rows.map((row, i) => {
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
                  {c.render ? c.render(row, offsets[bi] + i) : <span className="txt">{String((row as Record<string, unknown>)[c.key] ?? "")}</span>}
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
          </Fragment>
        );
      })
      )}
        </div>
      </div>

      {footer ? <div className="dt-foot">{footer}</div> : null}
    </div>
  );
}
