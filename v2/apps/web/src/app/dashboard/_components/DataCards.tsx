"use client";

import { Fragment, useState } from "react";
import { CaretDown } from "@/app/_components/glyphs";
import { DropdownMenu, type MenuGroup } from "./DropdownMenu";
import { Skeleton } from "./Skeleton";
import type { Column, Group } from "./DataTable";

/**
 * **كرتُ الصفّ (Data Cards) — الوجهُ الكرتيُّ للجدول، مرسومًا من تعريف أعمدته نفسِه.**
 *
 * العلّة: إحدى عشرة شاشةً في اللوحة جدولٌ محضٌ لا مبدّلَ عرضٍ فيها، وإحدى عشرة شاشةً تملكه؛
 * وكلُّ واحدةٍ من الأخيرة كتبت كرتَها بيدها (`MemberCard` · `WorkCard` · `ShowCard` …). فلو
 * مضينا على ذلك لَزم أحدَ عشرَ رسمًا جديدًا، ثمّ رسمٌ ثانٍ عشرَ لكلّ جدولٍ يُولَد بعدُ.
 *
 * فالجوابُ **خدمةٌ لا رسمٌ متكرّر**: الكرتُ يقرأ `Column<T>[]` عينَها التي يقرؤها `DataTable`،
 * فقيمةُ الخليّة تُرسَم بـ`render` نفسِه (الأفتار · الشارة · التاريخ · الهاتف)، ولا تُصاغ صياغةً
 * ثانيةً تفترق عن الجدول يومَ يتغيّر أحدُهما. والشاشةُ لا تُضيف إلّا **خريطةً** تقول: أيُّ عمودٍ
 * عنوانٌ، وأيُّها حقائقُ المتن (`CardSpec`).
 *
 * وثلاثُ هيئاتٍ لا واحدة، لأنّ صفوفَ اللوحة ثلاثةُ أنواع: صفٌّ بحقائقَ معدودة (شهادة · جلسة)،
 * وصفٌّ بنصٍّ حرٍّ طويل (رسالةُ تواصلٍ · سببُ إنذار)، وقائمةٌ طويلةٌ يُتصفَّح فيها (المكتبة · الزوّار).
 */
export type CardVariant = "facts" | "rows" | "compact";

/** خريطةُ الصفّ إلى كرت — مفاتيحُ أعمدةٍ لا قيمٌ، فالقيمةُ تبقى من مصدرها الواحد. */
export type CardSpec = {
  /** عمودُ العنوان (بطلُ الكرت). */
  title: string;
  /** عمودٌ يُقال تحت العنوان همسًا. */
  subtitle?: string;
  /** عمودٌ يتصدّر الكرت رسمًا لا نصًّا (أفتار · غلاف · رقم). */
  lead?: string;
  /** عمودُ الحال (شارة) في طرف الرأس. */
  badge?: string;
  /** عمودُ نصٍّ حرٍّ يُعرض متنًا تحت الرأس. */
  body?: string;
  /** أعمدةُ الحقائق بترتيب عرضها. */
  facts?: string[];
};

type Props<T> = {
  columns: Column<T>[];
  getRowId: (row: T) => string;
  spec: CardSpec;
  /** الهيئة — والشاشةُ تختار ما يناسب صفَّها، لا ما يناسب الشاشةَ التي قبلها. */
  variant?: CardVariant;
  rowActions?: (row: T) => MenuGroup[];
  onRowClick?: (row: T) => void;
  rowTone?: (row: T) => "success" | "warning" | "danger" | "neutral" | undefined;
  emptyState?: React.ReactNode;
  loading?: boolean;
  skeletonRows?: number;
  /** تذييلٌ يلي الشبكة (الترقيم) — في سطحٍ مستقلٍّ `.card-pager` كما في الشاشات القائمة. */
  footer?: React.ReactNode;
  /** عمودٌ واحدٌ بدل الانسياب — للقوائم المرتّبة يدويًّا ولنصوصٍ تطلب عرضًا. */
  oneColumn?: boolean;
} & ({ rows: T[]; groups?: never } | { groups: Group<T>[]; rows?: never });

/** قيمةُ عمودٍ في صفّ — برسّامِ الجدول إن وُجد، وإلّا فالقيمةُ الخام. */
function cellOf<T>(columns: Column<T>[], key: string | undefined, row: T, index: number): React.ReactNode {
  if (!key) return null;
  const col = columns.find((c) => c.key === key);
  if (!col) return null;
  if (col.render) return col.render(row, index);
  const raw = (row as Record<string, unknown>)[key];
  return raw === null || raw === undefined || raw === "" ? null : String(raw);
}

/** تسميةُ عمودٍ كما في ترويسة الجدول — فلا يُكتب اسمُ الحقيقة مرّتين. */
const headerOf = <T,>(columns: Column<T>[], key: string): string => columns.find((c) => c.key === key)?.header ?? "";

/** هل للعمود قيمةٌ في هذا الصفّ؟ حقيقةٌ خاليةٌ تُطوى ولا تترك سطرًا فارغًا (الجدولُ يلزمه عمودُه، والكرتُ لا). */
function hasValue<T>(columns: Column<T>[], key: string, row: T): boolean {
  const col = columns.find((c) => c.key === key);
  if (!col) return false;
  if (col.render) return true;
  const raw = (row as Record<string, unknown>)[key];
  return raw !== null && raw !== undefined && raw !== "";
}

export function DataCards<T>({
  columns, rows, groups, getRowId, spec, variant = "facts", rowActions, onRowClick, rowTone,
  emptyState, loading, skeletonRows = 4, footer, oneColumn,
}: Props<T>) {
  // الطيُّ بنفس عهد الجدول: الافتراضُ فتحٌ، والمطويُّ من نيّة المستدعي (`defaultOpen: false`).
  const shutByIntent = () => new Set((groups ?? []).filter((g) => g.defaultOpen === false).map((g) => g.key));
  const [shut, setShut] = useState<Set<string>>(shutByIntent);
  const intent = (groups ?? []).map((g) => `${g.key}:${g.defaultOpen === false ? 0 : 1}`).join("|");
  const [prevIntent, setPrevIntent] = useState(intent);
  if (prevIntent !== intent) { setPrevIntent(intent); setShut(shutByIntent()); }

  const blocks: Group<T>[] = groups ?? [{ key: "", label: null, rows: rows ?? [] }];
  const offsets = blocks.reduce<number[]>((acc, b, i) => [...acc, i === 0 ? 0 : acc[i - 1] + blocks[i - 1].rows.length], []);
  const allRows = blocks.flatMap((b) => b.rows);
  const gridClass = "card-grid" + (oneColumn ? " card-grid-1col" : "");

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className="acard dcard">
            <div className="dcard-head">
              <div className="dcard-id">
                <Skeleton width="60%" height={15} />
                <Skeleton width="38%" height={12} />
              </div>
            </div>
            <div className="dcard-facts">
              {[0, 1].map((f) => (
                <div key={f} className="dcard-fact"><Skeleton width="50%" height={11} /><Skeleton width="70%" height={14} /></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (allRows.length === 0 && emptyState) return <div className="card-empty">{emptyState}</div>;

  const card = (row: T, index: number) => {
    const id = getRowId(row);
    const tone = rowTone?.(row);
    const acts = rowActions?.(row) ?? [];
    const live = acts.some((g) => g.items.length > 0);
    const lead = cellOf(columns, spec.lead, row, index);
    const badge = cellOf(columns, spec.badge, row, index);
    const body = cellOf(columns, spec.body, row, index);
    const facts = (spec.facts ?? []).filter((k) => hasValue(columns, k, row));

    const head = (
      <div className="dcard-head">
        {lead ? <span className="dcard-lead">{lead}</span> : null}
        <span className="dcard-id">
          <span className="dcard-title">{cellOf(columns, spec.title, row, index)}</span>
          {spec.subtitle ? <span className="dcard-sub">{cellOf(columns, spec.subtitle, row, index)}</span> : null}
          {/* المضغوطُ يقول حقائقَه سطرًا تحت العنوان — لا شبكةَ خلايا: القائمةُ الطويلة تُمسَح بالعين مسحًا. */}
          {variant === "compact" && facts.length > 0 ? (
            <span className="dcard-meta">
              {facts.map((k) => (
                <span key={k} className="dcard-mi">
                  <span className="dcard-mk">{headerOf(columns, k)}</span>
                  <span className="dcard-mv">{cellOf(columns, k, row, index)}</span>
                </span>
              ))}
            </span>
          ) : null}
        </span>
        <span className="dcard-end">
          {badge}
          {live ? (
            <span onClick={(e) => e.stopPropagation()}>
              <DropdownMenu groups={acts} tone={tone} />
            </span>
          ) : null}
        </span>
      </div>
    );

    return (
      <div
        key={id}
        className={"acard dcard" + (tone ? ` acard-tone-${tone}` : "") + (onRowClick ? " acard-interactive" : "") + ` dcard-v-${variant}`}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
      >
        {head}
        {body ? <p className="dcard-body">{body}</p> : null}
        {variant === "facts" && facts.length > 0 ? (
          <dl className="dcard-facts">
            {facts.map((k) => (
              <div key={k} className="dcard-fact">
                <dt>{headerOf(columns, k)}</dt>
                <dd>{cellOf(columns, k, row, index)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {variant === "rows" && facts.length > 0 ? (
          <dl className="dcard-rows">
            {facts.map((k) => (
              <div key={k} className="dcard-row">
                <dt>{headerOf(columns, k)}</dt>
                <dd>{cellOf(columns, k, row, index)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {blocks.map((b, bi) => {
        const open = !shut.has(b.key);
        const band = groups ? (
          <button
            type="button"
            className={"dcard-band" + (b.tone ? ` dt-tone-${b.tone}` : "")}
            aria-expanded={open}
            onClick={() => setShut((s) => { const n = new Set(s); if (n.has(b.key)) n.delete(b.key); else n.add(b.key); return n; })}
          >
            <span className="dt-gr-ic"><CaretDown aria-hidden /></span>
            <span className="dt-gr-lb">{b.label}</span>
            {b.hint ? <span className="dt-gr-hint">{b.hint}</span> : null}
          </button>
        ) : null;
        return (
          <Fragment key={b.key}>
            {band}
            {open ? <div className={gridClass}>{b.rows.map((row, i) => card(row, offsets[bi] + i))}</div> : null}
          </Fragment>
        );
      })}
      {footer ? <div className="card-pager">{footer}</div> : null}
    </>
  );
}
