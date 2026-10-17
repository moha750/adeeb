import type { Metadata } from "next";
import { Alert, Ambient, Container, Footer, LandingHeading } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { getPublicStructure } from "./data";
import { StructureMix } from "./StructureMix";

export const metadata: Metadata = { title: "هيكلة أدِيب، نادي أدِيب", robots: { index: false, follow: false } };
// الهيكلُ يتبدّل بالتعيينات لا بالثانية: يُبنى مرّةً كلَّ خمس دقائق، لا مع كلّ زائر.
export const revalidate = 300;

/**
 * **هيكلةُ أدِيب** — صفحةٌ علنيّة (فتحها المالك للعامّة ٢٠٢٦-١٠-١٧ بعد أن كانت محروسةً بقفل
 * غرفة الهيكلة). التصميمُ «المزيج» الذي اعتمده، وما زال يعدّل عليه، فتبقى `noindex` حتّى يفرغ.
 *
 * البياناتُ من `getPublicStructure` على الخادم بمفتاح الخدمة، ولا يخرج منها إلى المتصفّح إلّا
 * الحقولُ المقصوصة للنشر (الاسم، الصورة، الجنس، المسمّى، رابط الصفحة). وخطأُ القاعدة لا يُعرض
 * للزائر: رسالةٌ عامّة، والتفصيلُ في سجلّ الخادم.
 */
export default async function StructurePage() {
  const { data, error } = await getPublicStructure();
  if (error) console.error("[structure] getPublicStructure:", error);

  return (
    <>
      <SiteHeader />
      <main className="amb-host">
        <Ambient />
        <section className="py-16 md:py-24">
          <Container className="max-w-[1320px]">
            <LandingHeading eyebrow="فريق" title="هيكلة أدِيب" align="center" />
            {data ? <StructureMix s={data} /> : <Alert tone="danger">تعذّر تحميل الهيكل الآن، أعد المحاولة بعد قليل.</Alert>}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
