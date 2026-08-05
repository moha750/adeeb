import { Container, Divider, Button, Card, CardBody } from "@adeeb/design-system";
import { GoogleLogo } from "@/app/_components/glyphs";

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

export default function DividerPage() {
  return (
    <main className="py-16">
      <Container className="max-w-4xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Component</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">الفاصل بكلمة</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          كلمةٌ في وسط خطٍّ يتلاشى من طرفيها. يفصل <strong>بديلين متساويين</strong> — لا خطوتين متتابعتين ولا قسمين في
          نموذج. خطّه خطُّ <span className="font-latin" dir="ltr">ModalSectionHeading</span> نفسُه (عرض الحدّ الموحّد ولونه)،
          فلا وصفةَ ثانية لخطٍّ واحد في الهوية.
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Lab>الاستعمال الحيّ — شاشة الدخول</Lab>
            <Card className="max-w-sm">
              <CardBody className="p-6">
                <div className="aauth-form">
                  <Button variant="primary" size="lg" className="aauth-submit">تسجيل الدخول</Button>
                  <Divider label="أو" />
                  <Button variant="ghost" size="lg" className="aauth-submit">
                    <GoogleLogo size={20} />
                    المتابعة بحساب قوقل
                  </Button>
                </div>
              </CardBody>
            </Card>
          </section>

          <section>
            <Lab>الكلمة تطول والخطّان ينكمشان — لا قصّ ولا التفاف</Lab>
            <Card className="max-w-sm">
              <CardBody className="p-6">
                <Divider label="أو ادخل بطريقةٍ أخرى" />
              </CardBody>
            </Card>
          </section>

          <section>
            <Lab>متى لا يُستعمل — القسم المعنون له مكوّنه</Lab>
            <p className="max-w-2xl text-sm text-content-muted">
              ما يُعنون ما بعده (أيقونة + عنوان في أوّل السطر) هو{" "}
              <a className="font-latin text-primary underline" dir="ltr" href="/ui/section-heading">ModalSectionHeading</a>{" "}
              لا هذا. والفرق ليس شكلًا: ذاك يقول «ما يلي مجموعةٌ اسمها كذا»، وهذا يقول «ما قبلي وما بعدي بديلان».
            </p>
          </section>
        </div>
      </Container>
    </main>
  );
}
