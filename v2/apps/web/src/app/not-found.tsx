import Link from "next/link";
import { Container, LandingHeading, Ambient } from "@adeeb/design-system";
import { SiteHeader } from "./_components/SiteHeader";

/**
 * صفحة «غير موجود» بهوية أديب — تحلّ محلّ صفحة Next/Vercel الافتراضيّة.
 * حدُّها **الجذر**: تلتقط كلّ رابطٍ لا يطابق مسارًا، وكلّ `notFound()` تُرمى من صفحةٍ
 * لا حدَّ أقرب لها.
 *
 * الشكل معتمَدٌ من المالك بعد معاينة ستّة بدائل حيّة (٢٠٢٦-٠٨-٠١): رأس الهبوط
 * بالرقم ٤٠٤ عينًا، ونصٌّ مباشر، وزرٌّ واحد، **بلا تذييل** — والصفحة كلّها تُعرض
 * في منتصف الشاشة رأسيًّا.
 *
 * التوسيط بلا رقمٍ سحريّ: الغلاف بطول النافذة (`min-h-svh`) عمودًا، والهيدر يأخذ
 * ارتفاعه الطبيعيّ، و`<main>` يبتلع الباقي (`flex-1`) فيتوسّط محتواه فيه — فلا
 * يُطرح ارتفاع الهيدر يدويًّا، ويبقى التوسيط سليمًا إن تغيّر.
 */

export const metadata = {
  title: "الصفحة غير موجودة، أديب",
  description: "الرابط الذي طلبته لا يقود إلى صفحةٍ في موقع نادي أديب.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="amb-host flex flex-1 items-center py-12">
        <Ambient />
        <Container className="max-w-2xl text-center">
          <LandingHeading
            eyebrow="404 ERROR"
            title="الصفحة غير موجودة"
            deck="الرابط الذي جئت منه لعلّه تغيّر أو حُذِف أو أنّ الصفحة غير موجودة."
            align="center"
          />
          <div className="mt-8 flex justify-center">
            <Link href="/" className="abtn abtn-primary abtn-lg">العودة إلى الصفحة الرئيسية</Link>
          </div>
        </Container>
      </main>
    </div>
  );
}
