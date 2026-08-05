import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Card, CardBody, CardHeader, Container, Footer, LandingHeading } from "@adeeb/design-system";
import { IdentificationBadge } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { getSessionAdmin } from "@/lib/auth";
import { getMyAccount } from "./data";
import { MyBookings } from "./MyBookings";
import { MyData } from "./MyData";

export const metadata: Metadata = { title: "حسابك — نادي أديب" };
export const dynamic = "force-dynamic";

/**
 * **بيتُ صاحب الحساب.**
 *
 * وُلد مع توحيد الهويّة (م١): صار في `profiles` ثلاثُمئةٍ ونيّف نصفُهم ليسوا أعضاء — يحجزون
 * ويحضرون ولا بابَ لهم. واللوحةُ ليست بابَهم: تلك غرفُ عملٍ تُفتح بالقدرات، وهؤلاء ضيوفٌ لا
 * موظّفون. فههنا ما يخصّهم وحدَه: مقاعدُهم وبياناتُهم.
 *
 * **وهي لكلّ صاحب حساب لا للزائر وحده** — العضوُ يحجز كما يحجزون، فيرى حجوزاته ههنا وتبقى
 * عضويّتُه في اللوحة. باباهما لا يتنازعان: هذا للمقعد، وذاك للمنصب.
 */
export default async function MePage() {
  const me = await getSessionAdmin();
  if (!me) redirect("/login?next=/me");

  const account = await getMyAccount(me.id);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="حسابك"
              title="مقاعدُك وبياناتُك"
              deck="ما حجزتَه من برامج أديب، وما نعرفه عنك — في موضعٍ واحد."
              align="center"
            />

            {!account ? (
              <div style={{ maxWidth: 720, margin: "32px auto 0" }}>
                <Alert tone="danger" title="تعذّر تحميل الصفحة">إعداد الخادم ناقص — أبلغ الإدارة.</Alert>
              </div>
            ) : (
              <div className="flex flex-col gap-8" style={{ marginTop: 32 }}>
                <MyBookings upcoming={account.upcoming} past={account.past} />

                <Card>
                  <CardHeader
                    variant="soft"
                    icon={<IdentificationBadge aria-hidden />}
                    title="بياناتك"
                    subtitle="بها نحجز مقعدك ونتواصل معك"
                  />
                  <CardBody>
                    <MyData me={account} />
                  </CardBody>
                </Card>

                {/* الحذفُ مراسلةً لا زرًّا (قرار المالك ٢٠٢٦-٠٨-٠٥): حجوزاتُك سجلُّ حضورٍ للنادي
                    وبعضُها شهاداتٌ صدرت، فحذفُها قرارٌ يُنظَر فيه لا نقرةٌ تُمحى بها. */}
                <p className="text-content-muted text-sm text-center">
                  أردتَ حذف حسابك؟{" "}
                  <Link className="font-bold underline" href="/#contact">راسلنا</Link>
                  {" "}ونتولّى ذلك.
                </p>
              </div>
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
