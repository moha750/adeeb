import "@adeeb/design-system/ad.css";
import type { Metadata } from "next";
import { Footer } from "@adeeb/design-system";
import { verifyCertificate } from "./data";
import { VerifyRoom } from "./VerifyRoom";
import { SiteHeader } from "../_components/SiteHeader";

export const metadata: Metadata = {
  title: "التحقّق من شهادة، نادي أدِيب",
  description: "تأكّد من صحّة شهادةٍ صادرةٍ من نادي أدِيب برقمها المرجعيّ.",
};
export const dynamic = "force-dynamic";

/**
 * **التحقّق من شهادة** — صفحةٌ علنيّة يقصدها من بيده الورقة: جهةُ عملٍ أو لجنةُ قبول. على قالب «الأداة» (`VerifyRoom`، ١١-٢٤).
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
      <main className="ad-pub">
        <div className="ad-pub-wrap">
          <VerifyRoom result={result} code={code} />
        </div>
      </main>
      <Footer />
    </>
  );
}
