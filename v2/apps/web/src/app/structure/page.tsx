import type { Metadata } from "next";
import { Alert, Ambient, Container, Footer, LandingHeading } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { getPublicStructure } from "./data";
import { StructureMix } from "./StructureMix";

export const metadata: Metadata = {
  title: "هيكلة أدِيب، نادي أدِيب",
  description: "هيكلة نادي أدِيب: رئاسته وإداراته وأقسامه ولجانه، ومن يقودها ومن فيها.",
};
// يُنعَش لحظةَ كلّ تعيينٍ من إجراءاته (`lib/structurePage.ts`)، وهذا البناءُ الدوريّ شبكةُ أمانٍ لما يتغيّر في القاعدة وحدها.
export const revalidate = 300;

/**
 * **هيكلةُ أدِيب** — صفحةٌ علنيّة (فتحها المالك للعامّة ٢٠٢٦-١٠-١٧ بعد أن كانت محروسةً بقفل
 * غرفة الهيكلة). التصميمُ «المزيج» بخطوط «الوصل»، اعتمده ٢٠٢٦-١٠-١٨، ففُتحت للمحرّكات
 * (أُزيل `noindex`) ودخلت خريطة الموقع، ولها زرٌّ تحت «أهل الدفّة» في الرئيسيّة. ومسارُها `/structure`
 * بعد `/structure-preview` (المالك ٢٠٢٦-١٠-١٨)، بلا تحويلٍ من القديم: لم يُتداوَل.
 *
 * البياناتُ من `getPublicStructure` بمفتاح الزائر عبر الدالّة الآمنة `get_public_structure`، فلا يخرج
 * من القاعدة إلّا الحقولُ المنشورة (الاسم، الصورة، الجنس، المسمّى، رابط الصفحة). وخطأُ القاعدة لا يُعرض
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
