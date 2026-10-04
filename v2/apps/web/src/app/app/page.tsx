import type { Metadata } from "next";
import { Container, Footer, LandingHeading } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { getSessionAdmin } from "@/lib/auth";
import { shareOg } from "@/lib/share";
import { AppGuide } from "./AppGuide";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adeeb.club";
const TITLE = "تطبيق أَدِيب";
const DECK = "بلا متجرٍ ولا تحميل: أضِفه إلى شاشتك الرئيسيّة، وتصلك أخبارُ النادي على شاشة القفل.";

export const metadata: Metadata = {
  title: `${TITLE}، نادي أَدِيب`,
  description: DECK,
  openGraph: shareOg({ type: "website", title: TITLE, description: DECK }),
};

/**
 * **رابطُ الإعلان عن التطبيق** — `adeeb.club/app` (٢٠٢٦-١٠-٠٣).
 *
 * بطاقةُ التثبيت والنافذةُ تسكنان خلف الدخول (الحساب واللوحة)، فلا يراهما من لم يدخل بعد.
 * وهذه الصفحةُ للنشر في القروبات والحسابات: من يفتحها من آيفون يرى الخطوات، ومن أندرويد زرَّ
 * التثبيت، ومن الحاسوب رمزًا يمسحه بجوّاله. ولا محتوى جديدًا فيها: البطاقةُ هي المعتمَدة
 * نفسُها (`PwaCard`)، فما يتغيّر هناك يتغيّر هنا.
 *
 * والجلسةُ تُسأل كي يُدعى غيرُ الداخل إلى الدخول مكانَ زرّ التفعيل (الإشعارُ لحسابٍ لا لجهاز).
 */
export default async function AppPage() {
  const me = await getSessionAdmin();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading eyebrow="جوّالك" title="تطبيقُ أَدِيب" deck={DECK} align="center" />
            <div className="mx-auto mt-8 max-w-xl">
              <AppGuide signedIn={Boolean(me)} url={`${SITE}/app`} />
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
