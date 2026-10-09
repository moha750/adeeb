import type { Metadata } from "next";
import { Alert, Ambient, Container, Footer, LandingHeading } from "@adeeb/design-system";
import { SiteHeader } from "../_components/SiteHeader";
import { denyUnless } from "../dashboard/_shell/guard";
import { getPublicStructure } from "./data";
import { StructureLab } from "./StructureLab";

/**
 * **معاينةُ صفحة «هيكلة أدِيب» العلنيّة** — تُفتح من قسم «أهل الدفّة» حين تُقَرّ.
 *
 * محروسةٌ اليوم بقفل غرفة الهيكلة (`view_org_structure`)، لأنّها تقرأ بمفتاح الخدمة وتعرض
 * أسماء الأعضاء كلّهم قبل أن يُقرَّ نشرُهم. وبعد الإقرار: يبقى شكلٌ واحد، وتنتقل إلى مسارها
 * العلنيّ بدالّةٍ آمنة، ويُحذف هذا المجلّد. لا يُبقى على معاينةٍ بعد قرارها.
 */
export const metadata: Metadata = {
  title: "هيكلة أدِيب، معاينة",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StructurePreviewPage() {
  const denied = await denyUnless("/dashboard/members/structure");
  if (denied) return denied;

  const { data, error } = await getPublicStructure();

  return (
    <>
      <SiteHeader />
      <main className="amb-host">
        <Ambient />
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading eyebrow="فريق" title="هيكلة أدِيب" align="center" />
            {error || !data ? (
              <Alert tone="warning" title="تعذّر جلب الهيكلة">{error}</Alert>
            ) : (
              <StructureLab s={data} />
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
