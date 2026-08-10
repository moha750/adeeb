/**
 * الدول — **من الرمز وحده**: القاعدة تخزّن `country_code` بمعيار آيزو (SA · US · IQ)، وكانت اللوحة
 * تعرضه خامًا فيقرأ العضو «SA». هنا يصير اسمًا عربيًّا وعلمًا، بلا جدولٍ نكتبه ولا أصلٍ نرفعه:
 *
 * - **الاسم** من `Intl.DisplayNames` (معيار ECMA-402 في المتصفّح): يتبع النظام في التسمية وفي
 *   أيّ دولةٍ تتغيّر أو تُستجدّ، فلا يتقادم عندنا.
 * - **العلم** بخوارزميّة يونيكود: حرفا المؤشّر الإقليميّ (Regional Indicator) للحرفين.
 *
 * فدولةٌ لم تزُرنا قطّ تُعرَض صحيحةً بلا سطرٍ واحدٍ يُضاف. **وتحفّظان مكتوبان لا مخفيّان:**
 * رمزٌ غير معياريّ يُعرض كما هو بلا علم (فلا تنكسر القائمة)، و**ويندوز لا يرسم أعلام الإيموجي**
 * فيعرض الحرفين بدلها — ولا معلومةَ تضيع لأنّ الاسم العربيّ بجانب العلم دائمًا.
 */

const ISO2 = /^[A-Z]{2}$/;

// مثيلٌ واحد (بناؤه ليس رخيصًا)، ومع ذلك يُحمى بـtry: بعض البيئات القديمة بلا DisplayNames.
let dn: Intl.DisplayNames | null = null;
try {
  dn = new Intl.DisplayNames(["ar"], { type: "region" });
} catch {
  dn = null;
}

const norm = (code: string | null | undefined) => (code ?? "").trim().toUpperCase();

/** اسم الدولة بالعربيّة من رمزها — وإن جهلناه رُدّ الرمز كما هو. */
export function countryName(code: string | null | undefined): string {
  const c = norm(code);
  if (!ISO2.test(c)) return code ?? "";
  try {
    return dn?.of(c) ?? c;
  } catch {
    return c;
  }
}

/** علم الدولة من رمزها (حرفا المؤشّر الإقليميّ) — و`null` لرمزٍ غير معياريّ. */
export function countryFlag(code: string | null | undefined): string | null {
  const c = norm(code);
  if (!ISO2.test(c)) return null;
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/**
 * عَلَمُ الدولة عنصرًا — **لا يُكتب العلم يدويًّا في شاشة**: هذا المكوّن يضمن صنف `.cflag` الذي
 * يُسنده إلى خطّ الأعلام المُستضاف، فيُرسَم على ويندوز أيضًا (النظام هناك بلا رسوم أعلام).
 * و`aria-hidden` لأنّ اسم الدولة مكتوبٌ بجانبه دائمًا، فالعلم زيادةُ تعرّفٍ لا معلومةٌ وحيدة.
 */
export function CountryFlag({ code }: { code: string | null | undefined }) {
  const f = countryFlag(code);
  return f ? <span className="cflag" aria-hidden>{f}</span> : null;
}
