import type { Metadata } from "next";
import { Footer, Container, LandingHeading } from "@adeeb/design-system";
import { SiteHeader } from "../_components/SiteHeader";

/**
 * **ألعابُ أدِيبيّة** — البيتُ الذي ستسكنه ألعابُ النادي كلُّها، وأوّلُها «دربك خضر» تحته
 * (`/games/darbak-khadar`). فارغةٌ الآن بقرار المالك (٢٠٢٦-٠٩-٢٥): عنوانٌ وحدَه حتى تُطوَّر.
 * واسمُها كما في شعارها، والرابطُ `/games` باقٍ كما هو (قرارُه ٢٠٢٦-٠٩-٢٦).
 *
 * **وهويّتُها منعزلةٌ كالمحطّة** (القاعدة ١، ونطاقُها هذه الصفحةُ وحدَها بكلمته ٢٠٢٦-٠٩-٢٦):
 * صالةُ أركيد ليليّة بشعاره وخطّ Rooyin، ومظهرُها ينتظر اختيارَه في `/ui/games-hub`. فما تحت
 * هذا السطر رأسُ الموقع وتذييلُه مؤقّتًا إلى أن يختار، ثمّ تحلّ الصالةُ (`_components/Hub`) محلَّهما.
 * وكلُّ لعبةٍ تحتها تبقى على هويّتها في مسارها.
 *
 * ولا فهرسةَ لها ما دامت فارغة: صفحةٌ بلا محتوى في نتائج البحث وعدٌ لا يُوفى.
 */
export const metadata: Metadata = {
  title: "ألعاب أدِيبيّة",
  robots: { index: false, follow: false },
};

export default function GamesPage() {
  return (
    <>
      <SiteHeader activeHref="/games" />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading eyebrow="ألعاب" title="ألعاب أدِيبيّة" align="center" />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
