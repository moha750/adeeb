// المعرضُ يعرض مكوّناتِ الأقسام كلِّها، فيحمل حصّتَه من `components.css` وفيها قواعدُ الأقسام جميعًا
// (فارغةٌ في التطوير، انظر `loaders/css-sections.cjs`).
import "@adeeb/design-system/components.ui.css";

/** **تخطيطُ المعرض: لا يرسم شيئًا** (٢٠٢٦-١٠-٢٧). وُجد ليحمل حصّتَه من ورقة المكوّنات. */
export default function UiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
