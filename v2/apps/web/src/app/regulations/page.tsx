import Link from "next/link";
import { notFound } from "next/navigation";
import { Ambient, Card, CardBody, CardHeader, Container, Footer, LandingHeading } from "@adeeb/design-system";
import { ArrowLeft } from "@/app/_components/glyphs";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { shareOg } from "@/lib/share";
import { REG_BASE, articleCount, docs } from "@/lib/regulations/data";
import { regSigners } from "@/lib/regulations/signers";
import { RegFinder } from "./_parts/RegFinder";
import { RegFacts, RegIcon } from "./_parts/RegIcon";
import { RegForeword } from "./_parts/RegForeword";

const DESCRIPTION = "دستورُ نادي أدِيب وأنظمتُه الستّة: العضوية، والمناصب والصلاحيات، والانتخابات، والانضباط، والتطوّع، والشهادات.";

export const metadata = {
  title: "أنظمة أدِيب",
  description: DESCRIPTION,
  openGraph: shareOg({ title: "أنظمة أدِيب", description: DESCRIPTION, url: "/regulations" }),
};

// الوثائقُ من القاعدة وصورتا الرئيسين من ملفّيهما: تُقرأ كلَّ ساعةٍ لا مع كلّ زيارة.
export const revalidate = 3600;

/**
 * فهرسُ «أنظمة أدِيب» بلغة الموقع: رأسُ الصفحات العامّة، والبحثُ تحته، ثمّ الدستورُ لوحًا مذهّبًا
 * منقوشًا والأنظمةُ الستّةُ كروتَ الهويّة برموزها. ولكلّ وثيقةٍ سطرُ تعريفها، فيُعرف ما تنظّمه قبل فتحها.
 */
export default async function RegulationsIndex() {
  const [all, signers] = await Promise.all([docs(), regSigners()]);
  const [constitution, ...systems] = all;
  if (!constitution) notFound();
  const titles = Object.fromEntries(all.map((d) => [d.slug, d.title]));
  return (
    <>
      <SiteHeader />
      <main className="amb-host">
        <Ambient />
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading eyebrow="المرجع" title="أنظمة أدِيب" deck="الدستورُ والأنظمةُ التي يقوم عليها النادي." align="center" />
            <div className="reg-idx">
              <RegFinder base={REG_BASE} titles={titles}>
                <Link href={`${REG_BASE}/${constitution.slug}`} className="reg-lead">
                  <span className="reg-lead-ic">
                    <RegIcon slug={constitution.slug} />
                  </span>
                  <span className="reg-lead-b">
                    <span className="reg-lead-t">{constitution.title}</span>
                    <span className="reg-lead-f">
                      <RegFacts articles={articleCount(constitution)} chapters={constitution.chapters.length} />
                    </span>
                    <span className="reg-lead-c">{constitution.summary}</span>
                  </span>
                  <span className="reg-lead-go">
                    <ArrowLeft size={24} aria-hidden />
                  </span>
                </Link>
                <div className="card-grid reg-sys-grid">
                  {systems.map((d) => (
                    <Link key={d.slug} href={`${REG_BASE}/${d.slug}`} className="block">
                      <Card interactive className="reg-sys">
                        <CardHeader
                          icon={<RegIcon slug={d.slug} />}
                          title={d.title}
                          subtitle={<RegFacts articles={articleCount(d)} chapters={d.chapters.length} />}
                          actions={
                            <span className="reg-go">
                              <ArrowLeft size={20} aria-hidden />
                            </span>
                          }
                        />
                        <CardBody>
                          <p className="reg-sys-c" title={d.summary}>
                            {d.summary}
                          </p>
                        </CardBody>
                      </Card>
                    </Link>
                  ))}
                </div>
                <RegForeword signers={signers} />
              </RegFinder>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
