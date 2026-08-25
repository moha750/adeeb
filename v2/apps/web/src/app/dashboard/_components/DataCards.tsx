"use client";

import { Fragment, useState } from "react";
import { CaretDown, CaretLeft } from "@/app/_components/glyphs";
import { Button } from "@adeeb/design-system";
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
  /**
   * في الهيئة المضغوطة: **القيمُ تسمّي نفسَها فلا تُطبَع تسمياتُها**. تسميةُ الحقيقة تلزم
   * الجدولَ (ترويسةُ عمودٍ فوق عمود) ولا تلزم السطرَ الواحد: ساعةٌ تسبق الوقتَ وفقاعتان
   * تسبقان العدد تقولان ما تقوله الكلمة، وتُنفَق عليها نصفُ عرض الجوّال. والاسمُ يبقى
   * ترويسةً في الجدول، فالمصدرُ واحدٌ والقرارُ في موضع العرض.
   */
  bareFacts?: boolean;
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
  /**
   * كلمةُ زرّ الفتح («فتح المحادثة» · «فتح الإحصاء»). لا تُلغي الزرَّ ولا تُظهره:
   * وجودُه من `onRowClick` وحدَه (انظر أسفل)، وهذه تقول ماذا يُفتح.
   */
  openLabel?: string;
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

/** أيقونةُ العمود إن أُعلنت — تقوم مقامَ التسمية في السطر المضغوط. */
const iconOf = <T,>(columns: Column<T>[], key: string): React.ReactNode => columns.find((c) => c.key === key)?.icon ?? null;

/**
 * حقائقُ الصفّ مرسومةً، **وما خلا منها يسقط**: الجدولُ يلزمه عمودُه فيترك خليّةً فارغة،
 * والكرتُ لا يلزمه شيء. وتُرسَم القيمةُ مرّةً ثمّ يُحكَم عليها — وكان الحكمُ قبلها على
 * **وجود الرسّام** لا على ما يُخرجه، فحقيقةٌ رسّامُها يعيد `null` (شارةُ حالٍ لا حالَ لها)
 * كانت تُبقي خانةً خاليةً وفجوتَها في السطر.
 */
function factsOf<T>(columns: Column<T>[], keys: string[], row: T, index: number): Array<[string, React.ReactNode]> {
  return keys
    .map((k) => [k, cellOf(columns, k, row, index)] as [string, React.ReactNode])
    .filter(([, v]) => v !== null && v !== undefined && v !== "");
}

export function DataCards<T>({
  columns, rows, groups, getRowId, spec, variant = "facts", rowActions, onRowClick, rowTone,
  emptyState, loading, skeletonRows = 4, footer, oneColumn, openLabel = "فتح",
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
    const facts = factsOf(columns, spec.facts ?? [], row, index);
    /* **شريطُ فعلٍ لا ركنٌ مزدحم**: قيامُه من الفعل نفسِه لا خاصّيةً تُمرَّر — فلا تنسى شاشةٌ
       شريطَها ولا تخترع كلُّ واحدةٍ موضعًا لفعلها.
       و**الفتحُ وحده هو ما يُقيمه** منذ ٢٠٢٦-٠٨-٢٥: القائمةُ (⋮) صعدت إلى ركن الرأس بأمر
       المالك، فلم يبقَ للشريط إلّا زرُّ الفتح وشارتُه. وحيث لا فتحَ تبقى الشارةُ في الرأس
       بجانب القائمة كما كانت. */
    const bar = Boolean(onRowClick);
    /** القائمةُ: في ركن الرأس دائمًا. مقبضٌ صغيرٌ لا يزاحم العنوانَ ولا يقتطع من عرضه إلّا قدرَه. */
    const menu = live ? <DropdownMenu groups={acts} tone={tone} /> : null;

    const head = (
      <div className="dcard-head">
        {lead ? <span className="dcard-lead">{lead}</span> : null}
        <span className="dcard-id">
          <span className="dcard-title">{cellOf(columns, spec.title, row, index)}</span>
          {spec.subtitle ? <span className="dcard-sub">{cellOf(columns, spec.subtitle, row, index)}</span> : null}
        </span>
        {/* ركنُ الرأس: القائمةُ دائمًا، والشارةُ معها **إن لم يكن للكرت شريطُ فعل** (كرتٌ لا
            يُفتح لا شريطَ له، فتبقى حالُه في ركن رأسه كما كانت). */}
        {menu || (badge && !bar) ? (
          <span className="dcard-end">
            {badge && !bar ? badge : null}
            {menu}
          </span>
        ) : null}
      </div>
    );

    /* **سطرُ الحقائق صفٌّ مستقلٌّ تحت الرأس** (أمرُ المالك ٢٠٢٦-٠٨-٢٥): كان داخل عمود
       العنوان فيبدأ من حيث ينتهي صدرُ الكرت، فيقع سطران مزاحان عن حافّتين مختلفتين ويضيق
       ما بقي منه على ٣٧٥. فالرأسُ سطرٌ أوّل (صدرٌ ثمّ اسمٌ ووجهة)، والحقائقُ سطرٌ ثانٍ
       يأخذ عرضَ الكرت كلَّه. ولا شبكةَ خلايا: القائمةُ الطويلة تُمسَح بالعين مسحًا. */
    const metaRow = variant === "compact" && facts.length > 0 ? (
      <span className="dcard-meta">
        {facts.map(([k, v]) => (
          <span key={k} className="dcard-mi">
            {/* رقاقةُ الحقيقة (`.tico` من المكتبة): مربّعٌ متراكزٌ بخلفيّة Aurora خفيفة بنغمة
                الكرت، فلا تذوب الأيقونةُ في سطرٍ صغير. ويُلبسها **الكرتُ** لا الشاشة. */}
            {iconOf(columns, k) ? <span className="tico tico-card" aria-hidden>{iconOf(columns, k)}</span> : null}
            {!spec.bareFacts && headerOf(columns, k) ? <span className="dcard-mk">{headerOf(columns, k)}</span> : null}
            <span className="dcard-mv">{v}</span>
          </span>
        ))}
      </span>
    ) : null;

    return (
      <div key={id} className={"acard dcard" + (tone ? ` acard-tone-${tone}` : "") + ` dcard-v-${variant}`}>
        {head}
        {metaRow}
        {body ? <p className="dcard-body">{body}</p> : null}
        {variant === "facts" && facts.length > 0 ? (
          <dl className="dcard-facts">
            {facts.map(([k, v]) => (
              <div key={k} className="dcard-fact">
                <dt>{headerOf(columns, k)}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {variant === "rows" && facts.length > 0 ? (
          <dl className="dcard-rows">
            {facts.map(([k, v]) => (
              <div key={k} className="dcard-row">
                <dt>{headerOf(columns, k)}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {/* **الكرتُ الذي يُفتح يقول إنّه يُفتح** (حكمُ المالك ٢٠٢٦-٠٨-٢٣: «المستخدم لن يعرف
            أنّه المفروض يضغط»): سطحٌ قابلٌ للنقر بلا علامةٍ يعتمد على المرور، والمرورُ لا وجودَ
            له على الجوّال — وهو مقياسُ اللوحة. **وبالكلمة لا بالسهم وحدَه** (أمرُه في اليوم
            نفسِه): السهمُ يعرفه من جرّب، والكلمةُ تكفي من يفتح الشاشةَ أوّلَ مرّة.
            **وبابًا واحدًا لا بابين**: السطحُ لا يُنقر، فالفعلُ الواحد له مقبضٌ واحدٌ يُرى
            ويبلغه الإصبعُ ولوحةُ المفاتيح والقارئُ الصوتيّ سواءً. */}
        {bar ? (
          <div className="dcard-act">
            {badge}
            <span className="dcard-act-end">
              {onRowClick ? (
                <Button variant="ghost" size="sm" onClick={() => onRowClick(row)}>
                  {openLabel}
                  <CaretLeft aria-hidden />
                </Button>
              ) : null}
            </span>
          </div>
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
