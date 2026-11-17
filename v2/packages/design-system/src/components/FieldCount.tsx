"use client";

import { useState, type FormEvent, type ReactElement } from "react";

/**
 * **عدّادُ الحقل — قاعدةٌ واحدة لكلّ حقلٍ له حدّ** (اتّفاق محمد ٢٠٢٦-١١-٠٧: «ودّي هذا الأمر نوحّده»):
 * 1. **المكان:** تحت الحقل في سطر وصفه بطرفه الآخر، «ما كتبتَ/الحدّ» بأرقامٍ لاتينيّة — كما في المواقع التي يعرفها الناس.
 * 2. **الكتابةُ لا تتوقّف عند الحدّ:** يُكتب ويُلصق ما زاد فلا يضيع آخرُ الكلام في قطعٍ صامت، **والحفظُ يتوقّف حتى يُختصر**
 *    (`overBy` يقرّر ذلك في كلّ نموذج، والإجراءُ الخادميّ يعيد التحقّق).
 * 3. **لونان فقط:** رماديٌّ ما دام ضمن الحدّ، وأحمرُ إذا جاوزه ومعه «زاد ٥ أحرف» في سطر الوصف والحقلُ كلُّه في حال الخطأ.
 *    لا أصفرَ قبل الحدّ: الرقمُ نفسُه يقول إنّك اقتربت.
 * 4. **الطولُ الثابتُ صيغةٌ لا حدّ** (الجوّال، والرقم الأكاديميّ، ورمزُ الدخول): لا عدّاد له، ويتوقّف عند طوله بـ`maxLength`.
 * ويُخفى العدّادُ عن قارئ الشاشة: رسالةُ الزيادة تقول ما يلزم، والعدُّ مع كلّ حرفٍ ضجيج.
 */
export type FieldCountRule = { min?: number; max?: number };

/** كم زاد النصُّ على حدّه (صفرٌ إن لم يزد) — مصدرُ «الحفظُ يتوقّف حتى يُختصر» في كلّ نموذج */
export function overBy(text: string | null | undefined, max: number | undefined): number {
  if (max == null || !text) return 0;
  return Math.max(0, text.length - max);
}

/** «حرفٌ واحد» «حرفان» «٣ أحرف» «١١ حرفًا» — بقواعد العدد العربيّ، والرقمُ لاتينيّ */
export function lettersCount(n: number): string {
  if (n === 1) return "حرفٌ واحد";
  if (n === 2) return "حرفان";
  const mod = n % 100;
  return mod >= 3 && mod <= 10 ? `${n} أحرف` : `${n} حرفًا`;
}

/** رسالةُ الزيادة الواحدة في الموقع كلّه */
export const overMessage = (n: number) => `زاد ${lettersCount(n)}`;

/** طولُ القيمة للمتحكَّم به (من `value`) ولغيره (من الإدخال نفسه): الحقلُ يعدّ مع `useState` كما يعدّ مع `register`. */
export function useFieldCount<T extends HTMLInputElement | HTMLTextAreaElement>(rule: FieldCountRule | undefined, value: unknown, defaultValue: unknown) {
  const [typed, setTyped] = useState(() => (defaultValue == null ? "" : String(defaultValue)));
  const text = value !== undefined && value !== null ? String(value) : typed;
  const onInput = rule && value === undefined ? (e: FormEvent<T>) => setTyped(e.currentTarget.value) : undefined;
  return { text, onInput, over: overBy(text, rule?.max) };
}

const Check = () => (
  <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden>
    <path d="M229.66 77.66l-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69 218.34 66.34a8 8 0 0 1 11.32 11.32Z" />
  </svg>
);

export function FieldCount({ rule, text }: { rule: FieldCountRule; text: string }): ReactElement {
  const { min, max } = rule;
  if (max != null) {
    const n = text.length;
    return <span className="fld-count" data-state={n > max ? "over" : "idle"} aria-hidden="true">{`${n}/${max}`}</span>;
  }
  const n = text.trim().length;
  const need = min ?? 0;
  return n >= need
    ? <span className="fld-count" data-state="ok" aria-hidden="true"><Check /></span>
    : <span className="fld-count" data-state="idle" aria-hidden="true">{`${n}/${need}`}</span>;
}
