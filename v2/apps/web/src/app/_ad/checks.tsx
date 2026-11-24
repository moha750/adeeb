"use client";

/**
 * **بئرُ الاختيار** (`AdCheckWell`، قطعةٌ جديدة، محمد ٢٠٢٦-١١-٢٤ في نافذة التصدير): السؤالُ الذي يقبل أكثرَ من اختيار.
 * هو بئرُ الحقل نفسُه («سطرٌ في بئر»: مربّعُ الرمز والتسميةُ في قطعته العليا) وقيمتُه مربّعاتُ الاختيار ظاهرةً لا خلف قائمة —
 * فالسؤالُ وعاءٌ واحدٌ بلا خطوط، وخياراتُه أمام العين. والقاعدة: **اختيارٌ واحدٌ قائمةٌ منسدلة (`Select`)، وأكثرُ من اختيارٍ هذا البئر.**
 * (رُدّ قبله: الاختيارُ المتعدّدُ في القائمة المنسدلة — الحالُ ثلاثةُ خياراتٍ خلف نقرة؛ وصفوفُ لوحة التصفية بحبّاتها في النافذة — خطّان يلخبطان.)
 * **والفراغُ مربّعٌ أوّلُ باسمه** (`all`: «الكلّ»، «بأيّ ترتيب»): مختارٌ ما دام لا شيء، واختيارُ غيره يرفعه، واختيارُه يرفع ما سواه.
 * (رُدّ قبله: «الكلّ» كلمةً خافتةً بجانب التسمية — قُرئت زرًّا، محمد ٢٠٢٦-١١-٢٤.)
 */
import type { ReactNode } from "react";
import { Checkbox } from "@adeeb/design-system";

export type AdCheckOption = { value: string; label: string; fixed?: boolean };

export function AdCheckWell({ label, icon, options, values, onChange, all, disabled, act }: {
  label: string;
  icon: ReactNode;
  options: AdCheckOption[];
  values: string[];
  onChange: (values: string[]) => void;
  /** مربّعُ الفراغ أوّلَ الخيارات باسم معناه («الكلّ»): يُختار حين لا شيء، ويرفع ما سواه */
  all?: string;
  disabled?: boolean;
  /** فعلٌ صغيرٌ في طرف التسمية («اختر الكلّ») */
  act?: ReactNode;
}) {
  const empty = !options.some((o) => !o.fixed && values.includes(o.value));
  return (
    <div className="fld ad-cw" role="group" aria-label={label} data-disabled={disabled || undefined}>
      <span className="fld-lbl">
        <span className="fld-lic" aria-hidden="true">{icon}</span>
        <span className="ad-cw-l">{label}</span>
        {act ? <span className="ad-cw-act">{act}</span> : null}
      </span>
      <div className="fld-wrap ad-cw-opts">
        {all ? (
          <Checkbox label={all} disabled={disabled} checked={empty} onChange={() => onChange(values.filter((v) => options.some((o) => o.fixed && o.value === v)))} />
        ) : null}
        {options.map((o) => (
          <Checkbox key={o.value} label={o.label} disabled={disabled || o.fixed} checked={!!o.fixed || values.includes(o.value)}
            onChange={() => onChange(values.includes(o.value) ? values.filter((v) => v !== o.value) : [...values, o.value])} />
        ))}
      </div>
    </div>
  );
}
