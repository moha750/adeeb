import type { Metadata } from "next";
import "@adeeb/design-system/ad.css";
import { Footer } from "@adeeb/design-system";
import { AdNote } from "@/app/_ad/primitives";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { getPublicOrg } from "./data";
import { TreeMix } from "./TreeMix";

export const metadata: Metadata = {
  title: "هيكلة أدِيب، نادي أدِيب",
  description: "هيكلة نادي أدِيب: رئاسته وإداراته وأقسامه ولجانه، ومن يقودها ومن فيها.",
};
// يُنعَش لحظةَ كلّ تعيينٍ من إجراءاته (`lib/structurePage.ts`)، وهذا البناءُ الدوريّ شبكةُ أمانٍ لما يتغيّر في القاعدة وحدها.
export const revalidate = 300;

/**
 * **هيكلةُ أدِيب** — صفحةٌ علنيّة (فتحها المالك للعامّة ٢٠٢٦-١٠-١٧)، ومسارُها `/structure` (٢٠٢٦-١٠-١٨).
 *
 * **أُعيد بناؤها على الهويّة ٢٠٢٦-١١-٢١/٢٢** (محمد: «نحتاج هدمه بالكامل وبناءه من جديد»): قالبُ الفهرس العامّ رأسًا والمجلسُ
 * الإداريّ في لوحه، ثمّ **الشجرة** (`TreeMix`) بوجوهها، ونافذةٌ لكلّ وحدةٍ بتعريفها وقيادتها وإشرافها وأعضائها.
 *
 * البياناتُ من `getPublicOrg` بمفتاح الزائر عبر الدالّة الآمنة `get_public_structure` (ومعها التعريفاتُ والإشراف منذ
 * `structure_02`)، فلا يخرج من القاعدة إلّا الحقولُ المنشورة. وخطأُ القاعدة لا يُعرض للزائر: رسالةٌ عامّة، والتفصيلُ في سجلّ الخادم.
 */
export default async function StructurePage() {
  const { data, error } = await getPublicOrg();
  if (error) console.error("[structure] getPublicOrg:", error);
  return (
    <>
      <SiteHeader />
      {/* قالبُ الفهرس العامّ (`.ad-pub` ولوحُ `PubIndex`) — البناءُ الجديد ٢٠٢٦-١١-٢١ */}
      <main className="ad-pub">
        <div className="ad-pub-wrap is-wide">
          {data ? <TreeMix org={data} /> : <AdNote tone="bad" title="تعذّر تحميل الهيكل الآن">أعد المحاولة بعد قليل.</AdNote>}
        </div>
      </main>
      <Footer />
    </>
  );
}
