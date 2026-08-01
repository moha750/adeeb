import Link from "next/link";
import { Header, Footer, Container, LandingHeading, Ambient } from "@adeeb/design-system";

/**
 * صفحة «غير موجود» بهوية أديب — تحلّ محلّ صفحة Next/Vercel الافتراضيّة.
 * حدُّها **الجذر**: تلتقط كلّ رابطٍ لا يطابق مسارًا، وكلّ `notFound()` تُرمى من صفحةٍ
 * لا حدَّ أقرب لها. بنيتُها بنيةُ الصفحات العامّة نفسها (Header · main.amb-host + Ambient
 * · Footer) فلا يشعر الزائر أنّه خرج من الموقع.
 *
 * بلا أرقام (قاعدة عناوين الهبوط): «404» لا تُعرض — الحالة تُقال بالكلمة،
 * ورمز الحالة يبقى في الترويسة حيث تقرؤه المتصفّحات ومحرّكات البحث.
 */

export const metadata = {
  title: "الصفحة غير موجودة — أديب",
  description: "الرابط الذي طلبته لا يقود إلى صفحةٍ في موقع نادي أديب.",
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="amb-host">
        <Ambient />
        <section className="py-20 md:py-28">
          <Container className="max-w-2xl text-center">
            <LandingHeading
              eyebrow="تِيه"
              title="صفحةٌ ضائعة"
              deck="الرابط الذي جئت منه لا يقود إلى شيء — لعلّه تغيّر أو حُذِف أو كُتب على غير وجهه."
              align="center"
            />
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/" className="abtn abtn-primary abtn-lg">العودة للرئيسية</Link>
              <Link href="/works" className="abtn abtn-ghost abtn-lg">تصفّح الأعمال</Link>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
