// حصّةُ «ألعاب أدِيبيّة» من `components.css` (فارغةٌ في التطوير، انظر `loaders/css-sections.cjs`).
import "@adeeb/design-system/components.games.css";

/**
 * **تخطيطُ الصالة: لا يرسم شيئًا** (٢٠٢٦-١٠-٢٧). وُجد ليحمل حصّةَ القسم من ورقة المكوّنات، فلا تُنزَّل
 * قواعدُ الألعاب في كلّ صفحةٍ عامّة.
 */
export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
