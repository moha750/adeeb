import { LogoLoader } from "@adeeb/design-system";

/**
 * تحميلُ التنقّل داخل الموقع — حدُّ Suspense للجذر: يُعرَض حين ينتقل الزائر إلى
 * صفحةٍ لم تصل بعدُ من الخادم، فلا تتجمّد الصفحةُ القديمة بلا خبر.
 *
 * وهو **الحدُّ الأبعد**: كلّ قسمٍ له `loading.tsx` أقرب يفوز به (اللوحة مثلًا،
 * كي يبقى شريطُها الجانبيّ ويتبدّل متنُها وحده).
 */
export default function Loading() {
  return <LogoLoader minHeight="100dvh" />;
}
