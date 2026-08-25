"use client";

import { useRef, useState } from "react";
import { Table, SquaresFour } from "@phosphor-icons/react";
import { CaretDown, Check, FunnelSimple, MagnifyingGlass, X } from "@/app/_components/glyphs";
import { AnchoredPopover, Button, Modal } from "@adeeb/design-system";
import { filterIcon } from "./filterIcons";

export type FilterOption = { value: string; label: string };
export type FilterDef = { key: string; label: string; options: FilterOption[] };

export type ViewMode = "table" | "cards";


/**
 * **شريطُ الأدوات.** أُقرّ ورُكِّب على الشاشات الحيّة ٢٠٢٦-٠٨-١٤، فورث اسمَ سلفه وأُعدم.
 * ومعرضُه `/ui/toolbar-mobile` (بمبدّل عرضٍ يُري الحالات الثلاث)، وقانونُه ق١٥.
 *
 * **العلّةُ المقيسة** (بإصبعٍ على 390px): الشريطُ الكامل (بحثٌ + ثلاثةُ مرشّحاتٍ + مبدّلُ
 * عرض) يشغل **182px في ثلاثة صفوف** — مقابل 78px على الحاسوب. أيْ أنّ ربعَ الشاشة الأولى
 * يذهب قبل أن يُرى صفُّ بياناتٍ واحد، وفوقه رأسُ الصفحة. وهذا يقع على **الشاشات التي
 * يفتحها العضو العاديّ** (لجنتي · قسمي · الفعاليّات · الانتخابات)، وهو من لا يملك غيرَ
 * جوّاله: ٢٣٠ من ٢٩١ لم يفتحوا اللوحة من حاسوبٍ قطّ.
 *
 * **وثلاثةُ أحكامٍ تصنع الفرق، وكلُّها مقيسة:**
 *
 * ١) **المرشّحاتُ تنطوي في زرٍّ واحد.** ثلاثةُ منسدلاتٍ تُصبح «تصفية» بعدّادٍ لِما اختير،
 *    وتُفتح في نافذةٍ من المكتبة. ولا يضيع خبرُ «ما المطبَّق الآن»: العدّادُ يقوله،
 *    والنافذةُ تفصّله. (سابقةُ Polaris وMaterial: زرُّ تصفيةٍ وورقةٌ على الضيّق.)
 *
 * ٢) **الشريطُ يخلع سطحَه على الضيّق.** هو كرتٌ مؤطَّرٌ يجلس فوق جدولٍ مؤطَّر — إطارٌ فوق
 *    إطارٍ يقول «شيءٌ قائمٌ بذاته» مرّتين (ق١٢). وعلى الحاسوب يحتمله العرض، وعلى الجوّال
 *    يدفع ‎24px حشوًا وحدًّا وظلًّا لا يخدم. فيصير متنًا: أدواتٌ عاريةٌ فوق جدولها.
 *
 * ٣) **الحالتان مرسومتان معًا والقياسُ يختار** — لا قياسَ في JS ولا حالةَ تُخزَّن: العريضةُ
 *    والضيّقةُ في الـDOM، و`@container` يُظهر إحداهما. **سابقةُ الرأس المنطوي بعينها**
 *    (`.shdr-nav` تُخفى ويظهر `.shdr-sheet`)، وبها يسلم الترطيب (hydration) ولا يومض
 *    شيءٌ عند أوّل رسم.
 */

export type ToolbarProps = {
  searchPlaceholder?: string;
  search?: string;
  onSearch?: (v: string) => void;
  filters?: FilterDef[];
  filterValues?: Record<string, string>;
  onFilter?: (key: string, value: string) => void;
  onReset?: () => void;
  view?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
  actions?: React.ReactNode;
  selectedCount?: number;
  bulkActions?: React.ReactNode;
  onClearSelection?: () => void;
};

/**
 * منسدلُ مرشِّحٍ واحد — **ويحمل رفعَ نفسه**.
 *
 * كان في الشريط زرُّ «إعادة تعيين» عامٌّ يظهر متى قام مرشِّحٌ ويختفي متى سقط. وأربعُ عللٍ
 * فيه: **يقفز الشريطُ** بظهوره واختفائه فيزيح ما حوله · **واسمُه يعد بأكثر مما يفعل**
 * (`onReset` يمسح المرشّحات والبحثُ باقٍ) · **ويزاحم المرشّحاتِ بوزنها** وهو ليس واحدًا
 * منها بل متصرّفٌ فيها، فيُقرأ مرشِّحًا رابعًا · **ولا يوفّر شيئًا** إذ في كلّ منسدلٍ
 * «الكل»، فرفعُ مرشِّحٍ نقرةٌ داخله.
 *
 * **والمرشِّحُ سطران** (قرار المالك بعد عرض خمسة توجّهات في `/ui/filter-chip`): الاسمُ فوقُ
 * والقيمةُ تحته، قائمًا كان أو خاليًا («القسم / الإعلام» · «الدور / الكل»). فليست ثمّ حالتان
 * مختلفتا الشكل حتى تُقرأ إحداهما أكبر، والخالي صار يقول قيمتَه بدل أن يسكت.
 *
 * فالحكم: **الذي وضع المرشِّح هو الذي يرفعه.** المرشِّحُ القائمُ يلبس ✕ مكانَ دوّارته،
 * فيصير شريحةً تُرفع بنقرةٍ واحدةٍ من موضعها ويُرى ما تُرفعه قبل أن تُرفعه. ولا زرَّ
 * ثالثًا يطفو فوق الجميع. (وهي شريحةُ الإدخال المعروفة: المتنُ يفتح والذيلُ يرفع.)
 *
 * **وهيئتُها بطاقةٌ بأيقونة** (قرار المالك ٢٠٢٦-٠٨-١٤ من خمس هيئاتٍ عُرضت): رمزُ البُعد في
 * الصدر ثمّ السطران ثمّ مَخرجُ الرفع. والرمزُ يُشتقّ من **مفتاح** المرشِّح في `filterIcons`
 * — مصدرٌ واحد، فلا يختلف رمزُ «الحالة» بين شاشتين وهو معنًى واحد. و`icon` يبقى نقضًا
 * يستعمله المعرضُ وحدَه.
 *
 * **ومُصدَّرةٌ لأجل معرض الهيئات** (`/ui/filter-chip`): يجرّبها المالكُ حيّةً بمكوّنها هذا
 * لا بنسخةٍ ثانيةٍ من الوسم — فما يجرّبه هو ما سيصير.
 *
 * **وزرّان متجاوران لا زرٌّ داخل زرّ** — الثاني وسمٌ غيرُ صالحٍ ولا تصل إليه لوحةُ
 * المفاتيح؛ فالحدُّ والسطحُ على الغلاف، والزرّان شفّافان بداخله يبدوان واحدًا.
 */
/**
 * خياراتُ المرشِّح **بلا خيار «الكل»**: صفُّ «الكل» يرسمه المرشِّحُ نفسُه (في المنسدل
 * وفي نافذة الجوّال)، فإن كتبته الشاشةُ في خياراتها ظهر مرّتين — وكلتاهما مؤشَّرةٌ
 * بعلامة الاختيار، لأنّ قيمتهما واحدةٌ (خالية). فالخيارُ الخالي يُنخَل هنا: مصدرُ
 * «الكل» واحدٌ في المكوّن، والشاشةُ تقول ما يخصُّها فقط.
 */
const realOpts = (def: FilterDef): FilterOption[] => def.options.filter((o) => o.value !== "");

export function FilterSelect({ def, value, onChange, icon }: { def: FilterDef; value: string; onChange: (v: string) => void; icon?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const selected = realOpts(def).find((o) => o.value === value);
  return (
    <div className={"tb-fs" + (open ? " open" : "") + (value ? " set" : "")}>
      <button ref={btnRef} type="button" className={"tb-fs-btn" + (value ? " on" : "")} onClick={() => setOpen((o) => !o)}>
        {/* رمزُ البُعد — خيارُ هيئةٍ يُمرَّر، ومعرضُ الهيئات وحدَه يستعمله اليوم */}
        <span className="uv-ic" aria-hidden>{icon ?? filterIcon(def.key)}</span>
        {/* سطران دائمًا: الاسمُ فوقُ والقيمةُ تحته — فالحالتان بالبنية نفسِها ولا تكبر إحداهما */}
        <span className="tb-fs-stack">
          <span className="tb-fs-lbl">{def.label}</span>
          <span className="tb-fs-val">{selected ? selected.label : "الكل"}</span>
        </span>
        {value ? null : <span className="asel-chev"><CaretDown /></span>}
      </button>
      {value ? (
        <button type="button" className="tb-fs-x" onClick={() => onChange("")} aria-label={`ارفع مرشّح ${def.label}`}>
          <X aria-hidden />
        </button>
      ) : null}
      <AnchoredPopover open={open} anchorRef={btnRef} onDismiss={() => setOpen(false)} align="start" className="tb-fs-panel" role="listbox">
        <button type="button" className={"tb-fs-opt" + (!value ? " sel" : "")} onClick={() => { onChange(""); setOpen(false); }}>
          <span className="tb-fs-txt">الكل</span>
          <Check className="tb-fs-ck" aria-hidden />
        </button>
        {realOpts(def).map((o) => (
          <button key={o.value} type="button" className={"tb-fs-opt" + (o.value === value ? " sel" : "")} onClick={() => { onChange(o.value); setOpen(false); }}>
            <span className="tb-fs-txt">{o.label}</span>
            <Check className="tb-fs-ck" aria-hidden />
          </button>
        ))}
      </AnchoredPopover>
    </div>
  );
}

/** صفٌّ في نافذة التصفية: اسمُ المرشِّح ثمّ خياراتُه أزرارًا — لا منسدلٌ داخل نافذة */
function SheetRow({ def, value, onChange }: { def: FilterDef; value: string; onChange: (v: string) => void }) {
  return (
    <div className="tbs-row">
      <div className="tbs-label">{def.label}</div>
      <div className="tbs-opts">
        <button type="button" className={"tbs-opt" + (!value ? " on" : "")} onClick={() => onChange("")}>الكل</button>
        {realOpts(def).map((o) => (
          <button key={o.value} type="button" className={"tbs-opt" + (o.value === value ? " on" : "")} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toolbar({
  searchPlaceholder = "ابحث…", search, onSearch,
  filters, filterValues = {}, onFilter, onReset,
  view, onViewChange, actions, selectedCount = 0, bulkActions, onClearSelection,
}: ToolbarProps) {
  const [sheet, setSheet] = useState(false);

  if (selectedCount > 0) {
    return (
      <div className="tb2">
        <div className="tb sel-mode">
        <span className="tb-selcount"><b className="num">{selectedCount}</b> محدّدون</span>
        <div className="tb-bulk">{bulkActions}</div>
          <button type="button" className="tb-bulk-x" onClick={onClearSelection}><X /><span>إلغاء التحديد</span></button>
        </div>
      </div>
    );
  }

  const activeCount = Object.values(filterValues).filter(Boolean).length;

  /**
   * **الرفعُ الجَمعيُّ لا يُنتظر من الشاشة.** كان زرُّ «إعادة تعيين» في ذيل النافذة ينادي
   * `onReset` وحدَها وهي **اختياريّة**: فالشاشةُ التي لم تمرّرها (سجلُّ ديبو) يظهر لها زرٌّ
   * حيٌّ — لأنّ تعطيلَه معلَّقٌ بعدد المرشّحات لا بوجود المُنادى — فيُنقر فتُغلق النافذةُ
   * ولا يُرفع مرشِّح. والجذرُ أنّ الرفع كان مُلقًى على المستدعي وهو ليس مِلكَه: الشريطُ
   * يملك أسماءَ المرشّحات وقيمَها ومنفذَ تغييرها، فيرفعها بنفسه `onFilter(key, "")`.
   * و`onReset` تبقى **نقضًا** لمن أراد أن يرفع البحثَ معها (السجلّ المحفوظ للباركود).
   */
  const resetFilters = () => {
    if (onReset) { onReset(); return; }
    filters?.forEach((f) => { if (filterValues[f.key]) onFilter?.(f.key, ""); });
  };

  return (
    <>
      {/* الغلافُ حاويةُ القياس بلا هيئة، والشريطُ ابنُه — فاستعلامُ الحاوية يسأل الأسلاف */}
      <div className="tb2">
        <div className="tb">
        {onSearch && (
          <div className="tb-search fld-wrap">
            <span className="fld-iic" aria-hidden="true"><MagnifyingGlass /></span>
            <input className="fld-in" value={search ?? ""} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} />
          </div>
        )}

        {/* العريضة: كلُّ مرشِّحٍ منسدلُه — تُخفى على الضيّق */}
        {filters?.length ? (
          <div className="tb-wide">
            {filters.map((f) => (
              <FilterSelect key={f.key} def={f} value={filterValues[f.key] ?? ""} onChange={(v) => onFilter?.(f.key, v)} />
            ))}
            {/* لا زرَّ «إعادة تعيين» هنا: كلُّ مرشِّحٍ قائمٍ يحمل ✕ نفسِه (انظر FilterSelect).
                وهو باقٍ في ذيل نافذة التصفية وحدَها — هناك سياقُه واضحٌ ومداه معلوم. */}
          </div>
        ) : null}

        {/* الضيّقة: زرٌّ واحدٌ بعدّاد — يُخفى على العريض */}
        {filters?.length ? (
          <button type="button" className={"tb-filt" + (activeCount ? " on" : "")} onClick={() => setSheet(true)}>
            <FunnelSimple aria-hidden />
            تصفية
            {activeCount ? <span className="tb-filt-n num">{activeCount}</span> : null}
          </button>
        ) : null}

        <div className="tb-spacer" />
        {onViewChange && (
          <div className="tb-view" role="group" aria-label="نمط العرض">
            <button type="button" className={view === "table" ? "on" : ""} aria-pressed={view === "table"} onClick={() => onViewChange("table")} aria-label="عرض جدول" title="جدول"><Table /></button>
            <button type="button" className={view === "cards" ? "on" : ""} aria-pressed={view === "cards"} onClick={() => onViewChange("cards")} aria-label="عرض كروت" title="كروت"><SquaresFour /></button>
          </div>
        )}
          {actions ? <div className="tb-actions">{actions}</div> : null}
        </div>
      </div>

      <Modal
        open={sheet}
        onClose={() => setSheet(false)}
        title="تصفية"
        description={activeCount ? `مطبَّقٌ الآن ${activeCount}` : "اختر ما تريد تضييقَه"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => { resetFilters(); setSheet(false); }} disabled={!activeCount}>
              إعادة تعيين
            </Button>
            <Button variant="primary" size="md" onClick={() => setSheet(false)}>تمّ</Button>
          </>
        }
      >
        <div className="tbs">
          {filters?.map((f) => (
            <SheetRow key={f.key} def={f} value={filterValues[f.key] ?? ""} onChange={(v) => onFilter?.(f.key, v)} />
          ))}
        </div>
      </Modal>
    </>
  );
}
