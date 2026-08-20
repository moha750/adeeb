/**
 * ثيمُ أديب لـReact Native.
 *
 * `tokens.generated.ts` مولَّدٌ من `packages/design-system/tokens.css` ولا يُحرَّر بيد
 * (`node scripts/theme-native.mjs`). و`fonts.ts` مكتوبٌ بيدٍ لأنّ أسماء ملفّات الخطّ
 * ليست في ورقة الرموز.
 *
 * القاعدةُ في الشاشات: لا لونَ ولا مقاسَ ولا زاويةَ مكتوبةً رقمًا. كلُّها من هنا.
 */

export { color, duration, gradient, leading, radius, shadowTone, space, stroke, text, weight } from "./tokens.generated";
export type { Gradient } from "./tokens.generated";

export { fontFamily, splitDigits, type } from "./fonts";
export type { ArabicWeight, LatinWeight, Leading, TextRun, TextSize, TypeOptions } from "./fonts";

export { shadow } from "./shadow";
