import "@adeeb/design-system/ad.css";

/**
 * إطاراتُ المنضدة (`lib/stageFrame`) تحمل ورقةَ الهويّة لقاعدةٍ واحدة: لا شريطَ تمريرٍ داخل الإطار (المنضدةُ نفسُها تُمرَّر بشريطها).
 * كانت `/survey-frame` وحدها، فصارت `/frame/survey` ومعها `/frame/news` (٢٠٢٦-١١-١٣).
 */
export default function StageFrameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
