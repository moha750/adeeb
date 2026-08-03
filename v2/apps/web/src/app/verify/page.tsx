import type { Metadata } from "next";
import { Header, Footer, Container, Card, CardBody, Alert, Badge, LandingHeading } from "@adeeb/design-system";
import { VERIFY_HOST, certDate } from "@/lib/certificates/text";
import { verifyCertificate } from "./data";
import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = {
  title: "التحقّق من شهادة — نادي أديب",
  description: "تأكّد من صحّة شهادة خبرةٍ صادرة عن نادي أديب برقمها المرجعيّ.",
};
export const dynamic = "force-dynamic";

/**
 * **التحقّق من شهادة خبرة** — صفحةٌ علنيّة يقصدها من بيده الورقة: جهةُ عملٍ أو لجنةُ قبول.
 *
 * ونموذجُها **HTML خالص** (`method="get"`) لا جافاسكربت: الرقمُ يذهب في العنوان فيعود الجواب
 * من الخادم. فالصفحة تعمل قبل أن يُحمَّل شيء، وتُشارَك برابطها كما هي.
 *
 * **ولا استعلامَ بغير الرقم**: لا بحثَ باسمٍ ولا سردَ شهادات — الصفحة تؤكّد ورقةً بعينها
 * ولا تكشف سجلًّا. والرقمُ يحمل رمزًا عشوائيًّا فلا يُخمَّن بالعدّ.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const result = await verifyCertificate(code);

  return (
    <>
      <Header />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="توثيق"
              title="التحقّق من شهادة"
              deck={`امسح الباركود في الشهادة، أو اكتب رقمها المرجعيّ — فيقول لك ${VERIFY_HOST} أصحيحةٌ هي أم لا.`}
              align="center"
            />

            <Card style={{ maxWidth: 720, margin: "32px auto 0" }}>
              <CardBody>
                <VerifyForm defaultCode={code} />

                {result.state === "empty" ? null : result.state === "error" ? (
                  <Alert tone="danger" title="تعذّر التحقّق">حدث خطأ في الاتّصال — أعِد المحاولة بعد قليل.</Alert>
                ) : result.state === "missing" ? (
                  <Alert tone="danger" title="لا شهادة بهذا الرقم">
                    راجِع الرقم كما هو مطبوعٌ في الورقة حرفًا برقم. وإن كان صحيحًا ولم يُعرَف، فالورقة ليست منّا.
                  </Alert>
                ) : (
                  <div style={{ marginTop: 18 }}>
                    <div className="chip-row" style={{ marginBottom: 12 }}>
                      {result.state === "valid" ? (
                        <Badge tone="success" variant="soft">شهادة صحيحة</Badge>
                      ) : (
                        <Badge tone="danger" variant="soft">شهادة مبطَلة</Badge>
                      )}
                      <Badge tone="info" variant="soft">{result.serial}</Badge>
                    </div>

                    <Alert
                      tone={result.state === "valid" ? "success" : "danger"}
                      title={result.holderName}
                    >
                      {result.positionTitle} — للفترة من {certDate(result.periodFrom)} إلى {certDate(result.periodTo)}.
                      {result.state === "valid"
                        ? ` صدرت عن نادي أديب في ${certDate(result.issuedOn)}.`
                        : ` أُبطلت هذه الشهادة${result.revokedOn ? ` في ${certDate(result.revokedOn)}` : ""}، فلا يُعتدّ بها.`}
                    </Alert>
                  </div>
                )}
              </CardBody>
            </Card>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
