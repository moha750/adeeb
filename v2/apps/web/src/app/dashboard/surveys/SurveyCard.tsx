"use client";

import { Button, Card, CardFooter } from "@adeeb/design-system";
import { DropdownMenu, type MenuGroup } from "../_components/DropdownMenu";
import { StatusBadge } from "./StatusBadge";
import { SurveyStatusLine } from "./SurveyStatusLine";
import { ACCESS_LABEL } from "./vocab";
import type { SurveyRow } from "./data";

type Props = {
  survey: SurveyRow;
  actions: MenuGroup[];
  /** نغمة الكرت — يشتقّها الأب من مصدر النغمة نفسه (cardTone)، فتُطابق نغمةَ صفّ الجدول حيث وُجدت
      وتقود سطحَ الكرت وزرّه وقائمةَ نقاطه معًا. المنتهية رماديّة (neutral)؛ و«مجدول/انتهت مدّته» يقولهما StatusBadge وحده. */
  tone?: "neutral" | "success" | "warning" | "danger";
  /** الفعل الأساسيّ المُدرِك للحالة (يشتقّه الأب): «أضف أسئلة» · «متابعة التحرير» · «عرض النتائج». */
  primary: { label: string; icon?: React.ReactNode; onClick: () => void };
};

/**
 * كرت الاستبيان — **المنقسم** (اختاره المالك): رصيفٌ جانبيٌّ بلون الحالة يحمل الوضعَ والرقمَ المهمّ
 * (المشاركات)، والهويّةُ إلى جانبه (العنوان بطلٌ · الوصول · النافذة)، وذيلٌ يقول مَن أنشأه.
 *
 * **بناؤه (ق١):** القشرة من عائلة `Card` (السطح/الحدّ/الظلّ/الزاوية/النغمة بالوراثة)، وتشريح المتن
 * `.scard-*` بالمكتبة (لا تنسيقَ شارد). النغمة تُقرأ من `--card-t/--card-tx` فالرصيف يلبسها ولا يحفر لونًا.
 *
 * **ثبات الارتفاع:** العنوان سطرٌ واحد (قصّ)، والمتن ثابتُ البنية، فلا تتفاوت الكروت في الشبكة.
 */
export function SurveyCard({ survey, actions, tone, primary }: Props) {
  return (
    <Card tone={tone} className="scard-split">
      <div className="scard-row">
        {/* الرصيف المنغَّم — الحالة والرقم الأهمّ (المشاركات) بلون الحالة */}
        <div className="scard-rail">
          <StatusBadge survey={survey} />
          <span className="scard-rail-num">{survey.responses}</span>
          <span className="scard-rail-lbl">مشاركة</span>
        </div>
        {/* المتن — العنوان بطلٌ، ثمّ الوصول والنافذة الزمنيّة، والفعل الأساسيّ في القاع */}
        <div className="scard-main">
          <div className="flex items-start justify-between gap-2">
            {/* العنوان بطلٌ، والوصول عنوانٌ فرعيٌّ ملتصقٌ تحته (لا سطرٌ مبعثر) */}
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="scard-title">{survey.title}</h3>
              <span className="scard-meta">{ACCESS_LABEL[survey.access]}</span>
            </div>
            {/* نقرُ النقاط لا يعني الكرت — كما في كرت العضو */}
            {actions.length > 0 ? (
              <span onClick={(e) => e.stopPropagation()}>
                <DropdownMenu groups={actions} tone={tone} />
              </span>
            ) : null}
          </div>
          {/* سطر الحالة المُخاطِب — «يفتح/يُغلق بعد …» · «متاحٌ دائمًا» · «انتهى في …»، بعدّادٍ حيّ */}
          <SurveyStatusLine survey={survey} />
        </div>
      </div>
      {/* الذيل — مَن أنشأ الاستبيان ومتى (يمينًا) والفعل الأساسيّ (يسارًا)، يعمّ عرض الكرت أسفل الرصيف والمتن */}
      <CardFooter>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm text-content-muted" title={survey.createdBy ?? undefined}>بقلم {survey.createdBy ?? "غير معروف"}</span>
          <span className="truncate text-xs text-content-muted">أُنشئ في {survey.created}</span>
        </div>
        <Button variant={tone ?? "primary"} size="sm" onClick={primary.onClick} className="shrink-0">{primary.icon}{primary.label}</Button>
      </CardFooter>
    </Card>
  );
}
