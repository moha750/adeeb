import type { Metadata } from "next";
import { Alert, Ambient, Container, Footer, LandingHeading } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { denyUnless } from "../dashboard/_shell/guard";
import { getPublicStructure } from "./data";
import { StructureMix } from "./StructureMix";

export const metadata: Metadata = { title: "هيكلة أدِيب، معاينة", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * **معاينةُ هيكلة أدِيب** (البداية الجديدة، ٢٠٢٦-١٠-١٣). محروسةٌ بقفل غرفة الهيكلة حتّى تُقَرّ
 * ويُفتح لها بابٌ علنيّ. التصميمُ «المزيج» الذي اختاره المالك من صوره الثابتة: رأسُ الشجرة
 * النازلة (مرجع ٤)، وكلُّ لجنةٍ بطاقةُ قائدها وفريقُها في ذيلها (مرجع ٦).
 */
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
          <Container className="max-w-[1320px]">
            <LandingHeading eyebrow="فريق" title="هيكلة أدِيب" align="center" />
            {error || !data ? <Alert tone="danger">{error ?? "تعذّر تحميل الهيكل."}</Alert> : <StructureMix s={data} />}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
