import type { Metadata } from "next";
import { Footer, Container, LandingHeading } from "@adeeb/design-system";
import { SiteHeader } from "../_components/SiteHeader";

/**
 * **ألعابُ أدِيب** — البيتُ الذي ستسكنه ألعابُ النادي كلُّها، وأوّلُها «دربك خضر» تحته
 * (`/games/darbak-khadar`). فارغةٌ الآن بقرار المالك (٢٠٢٦-٠٩-٢٥): عنوانٌ وحدَه حتى تُطوَّر.
 * وبهويّة النادي، لا بهويّة لعبةٍ بعينها: كلُّ لعبةٍ تحمل هويّتَها في مسارها.
 *
 * ولا فهرسةَ لها ما دامت فارغة: صفحةٌ بلا محتوى في نتائج البحث وعدٌ لا يُوفى.
 */
export const metadata: Metadata = {
  title: "ألعاب أدِيب",
  robots: { index: false, follow: false },
};

export default function GamesPage() {
  return (
    <>
      <SiteHeader activeHref="/games" />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading eyebrow="ألعاب" title="ألعاب أدِيب" align="center" />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
