import type { Metadata } from "next";
import { Footer, Container, Card, CardBody, LandingHeading } from "@adeeb/design-system";
import { VERIFY_HOST } from "@/lib/certificates/text";
import { verifyCertificate } from "./data";
import { VerifyForm } from "./VerifyForm";
import { VerifyResultView } from "./VerifyResult";
import { SiteHeader } from "../_components/SiteHeader";

export const metadata: Metadata = {
  title: "التحقّق من شهادة، نادي أديب",
  description: "تأكّد من صحّة شهادة خبرةٍ صادرة عن نادي أديب برقمها المرجعيّ.",
};
export const dynamic = "force-dynamic";

/**
 * **التحقّق من شهادة خبرة** — صفحةٌ علنيّة يقصدها من بيده الورقة: جهةُ عملٍ أو لجنةُ قبول.
 *
 * ونموذجُها **HTML خالص** (`method="get"`) لا جافاسكربت: الرقمُ يذهب في العنوان فيعود الجواب
 * من الخادم. فالصفحة تعمل قبل أن يُحمَّل شيء، وتُشارَك برابطها كما هي.
 *
 * **ولا استعلامَ بغير الرقم**: لا بحثَ باسمٍ ولا سردَ شهادات — الصفحة تؤكّد ورقةً بعينها
 * ولا تكشف سجلًّا. والرقمُ يحمل رمزًا عشوائيًّا فلا يُخمَّن بالعدّ.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const result = await verifyCertificate(code);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="توثيق"
              title="التحقّق من شهادة"
              deck={`امسح الباركود في الشهادة، أو اكتب رقمها المرجعيّ، فيقول لك ${VERIFY_HOST} أصحيحةٌ هي أم لا.`}
              align="center"
            />

            <Card style={{ maxWidth: 720, margin: "32px auto 0" }}>
              <CardBody>
                <VerifyForm defaultCode={code} />

                <VerifyResultView result={result} />
              </CardBody>
            </Card>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
