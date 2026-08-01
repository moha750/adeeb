import type { ChangeEvent, ChangeEventHandler, FormEvent, FormEventHandler } from "react";

/**
 * طقم المحارف الذي يقبله الحقل — القاعدة ٣ (تشريح الحقل المقدّس).
 * - `latin`  — حقل يحمل إنجليزيّة (بريد · معرّف · رابط): **لا يقبل الحروف العربيّة**.
 * - `digits` — حقل رقميّ (جوّال · رقم أكاديميّ): **لا يقبل حرفًا ولا رمزًا** — أرقام فقط.
 */
export type FieldCharset = "latin" | "digits";

/**
 * المحارف الممنوعة لكلّ طقم — **المصدر الوحيد** الذي يخدم `Field` و`Textarea` معًا.
 * تُكتب بترميز `\u` لا بمحارف صريحة: المحرف العربيّ الصريح داخل صنف محارف يصعب تدقيقه في ملفّ ثنائيّ الاتجاه،
 * وآخر نطاقاته غير مرئيّ أصلًا (U+FEFF).
 */
const FORBIDDEN: Record<FieldCharset, RegExp> = {
  // نطاقات الحروف العربيّة كلّها — ومنها الأرقام والترقيم العربيّان وأشكال العرض
  latin: /[\u0600-\u06FF\u0750-\u077F\u0870-\u089F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g,
  // كلّ ما ليس رقمًا لاتينيًّا — لا حرف ولا رمز ولا مسافة
  digits: /[^0-9]/g,
};

/** نزع المحارف الممنوعة من نصّ. */
function stripForbidden(text: string, charset: FieldCharset): string {
  return text.replace(FORBIDDEN[charset], "");
}

type Guarded<T> = { onBeforeInput: FormEventHandler<T>; onChange: ChangeEventHandler<T> };

/**
 * حارس طقم المحارف — يُركَّب فوق مُعالِجَي المستدعي فلا يبتلعهما (تسجيل react-hook-form يمرّ سليمًا).
 *
 * طبقتان تتقاسمان العمل بحدّ فاصل واحد: **هل يبقى من المُدخَل شيء بعد التنقية؟**
 * 1. `beforeinput` — يمنع الإدخال **قبل وقوعه** إن لم يبقَ منه شيء (كتابة محرف ممنوع)، فيبقى المؤشّر مكانه بلا ارتجاف.
 * 2. `change` — شبكة أمان تنقّي ما مرّ مختلطًا (لصق · تعبئة تلقائيّة · سحب وإفلات) فتُبقي الصالح وتُسقط الممنوع.
 *
 * الحدّ مقصود: حدث اللصق يحمل النصّ **كاملًا** في `data`، فمنعه في الطبقة الأولى يرفض اللصقة كلّها
 * ولا يترك للطبقة الثانية ما تنقّيه (مُثبَت بالمتصفّح: لصق «محمد@adeeb.club» كان يُنتج فراغًا).
 */
export function charsetGuard<T extends HTMLInputElement | HTMLTextAreaElement>(
  charset: FieldCharset | undefined,
  onBeforeInput: FormEventHandler<T> | undefined,
  onChange: ChangeEventHandler<T> | undefined,
): Guarded<T> {
  return {
    onBeforeInput: (e: FormEvent<T>) => {
      const { data } = e.nativeEvent as InputEvent;
      if (charset && data && stripForbidden(data, charset) === "") e.preventDefault();
      onBeforeInput?.(e);
    },
    onChange: (e: ChangeEvent<T>) => {
      if (charset) {
        const clean = stripForbidden(e.target.value, charset);
        if (clean !== e.target.value) e.target.value = clean;
      }
      onChange?.(e);
    },
  };
}
