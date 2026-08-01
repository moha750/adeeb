import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Container, Card, CardBody } from "@adeeb/design-system";

export const metadata: Metadata = {
  title: "تمّ استلام طلبك — نادي أديب",
  description: "وصلنا طلب انضمامك إلى نادي أدِيب.",
};

/** صحٌّ SVG داخليّ (currentColor) — مكوّن خادميّ، فلا يعتمد على أيقونة عميليّة. */
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.3l2.7 2.7L16.5 9" />
  </svg>
);

export default function JoinDonePage() {
  return (
    <>
      <Header />
      <main className="py-16 md:py-24">
        <Container className="max-w-xl">
          <Card className="text-center">
            <CardBody className="p-8 md:p-10">
              <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-surface-2 text-3xl text-success">
                <CheckIcon />
              </div>
              <h1 className="font-display text-2xl font-black text-content md:text-3xl">وصلنا طلبك — شكرًا لك!</h1>
              <p className="mx-auto mt-3 max-w-md text-content-muted">
                تسلّمنا طلب انضمامك إلى نادي أدِيب بنجاح. ستراجعه لجنة الموارد البشريّة، ونتواصل معك عبر بريدك لتحديد موعد المقابلة.
              </p>
              <div className="mt-7 flex justify-center">
                <Link href="/" className="abtn abtn-primary abtn-lg">العودة للرئيسيّة</Link>
              </div>
            </CardBody>
          </Card>
        </Container>
      </main>
      <Footer />
    </>
  );
}
