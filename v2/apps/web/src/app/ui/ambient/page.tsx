import { Ambient, Badge, Button, Card, CardBody, CardHeader, Container, LandingHeading } from "@adeeb/design-system";
import { PenNib, Users, CalendarBlank, BookOpen } from "@phosphor-icons/react/dist/ssr";

/** بطاقةٌ من المكتبة — لِنرى كيف تجلس الأسطح البيضاء وحدودُها وظلالُها على الشفق. */
function Demo({
  icon,
  title,
  subtitle,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  body: string;
}) {
  return (
    <Card>
      <CardHeader icon={icon} title={title} subtitle={subtitle} />
      <CardBody>
        <p className="text-content-muted">{body}</p>
      </CardBody>
    </Card>
  );
}

/**
 * معرض خلفيّة الصفحة — المكوّن الحقيقيّ على محتوًى واقعيّ.
 * الصفحة طويلةٌ عمدًا: ثباتُ الشفق لا يُرى إلّا بالتمرير، سريعًا وبطيئًا.
 */
export default function AmbientPage() {
  return (
    <>
      <main className="amb-host">
        <Ambient />
        <section className="py-20 text-center md:py-28">
          <Container>
            <p className="mb-4 font-latin text-sm font-bold tracking-[0.2em] text-secondary">Design System · Ambient</p>
            <h1 className="mx-auto max-w-3xl font-display text-5xl font-black leading-tight text-content md:text-6xl">
              حيثُ تُولَدُ الكلمة
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-content-muted">
              نادٍ ثقافي إبداعي بجامعة الملك فيصل، يدعم المواهب الشابة عبر ورشٍ وبرامج ومحتوى متميّز.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button size="lg">انضمّ إلينا</Button>
              <Button size="lg" variant="ghost">
                تصفّح الأعمال
              </Button>
            </div>
            <p className="mx-auto mt-10 max-w-xl rounded border border-line bg-surface/70 p-4 text-sm leading-relaxed text-content-muted">
              بلاطةُ ضوءٍ بمقاس النافذة تتكرّر نزولًا ومسمَّرةٌ في مواضعها — تمرّ بها ولا تمرّ بك. وفوقها شبكةٌ كامنة
              لا تظهر إلا حيث يقع الضوء، فتنكشف البنية بالإضاءة وتذوب بينها. ولأنّ المقاس النافذةُ لا الصفحة، فما تراه
              هنا هو نفسه في الهبوط حرفًا بحرف.
            </p>
          </Container>
        </section>

        <section className="py-20 md:py-28">
          <Container>
            <LandingHeading eyebrow="معرض" title="أعمال وإبداعات" deck="نعرض ما تصنعه مواهبنا — من القصّة إلى اللوحة والتصميم." />
            <div className="card-grid mt-10">
              <Demo
                icon={<PenNib aria-hidden />}
                title="قصّةٌ قصيرة"
                subtitle="أدب"
                body="نصٌّ من ورشة السرد، كُتب في جلسةٍ واحدة ونُقّح في ثلاث."
              />
              <Demo
                icon={<BookOpen aria-hidden />}
                title="إصدارٌ سنويّ"
                subtitle="مكتبة"
                body="مختاراتٌ من نتاج الأعضاء، تُطبع وتُقرأ في «إرثٌ يُروى»."
              />
              <Demo
                icon={<Users aria-hidden />}
                title="لقاءٌ مفتوح"
                subtitle="مجتمع"
                body="مساءٌ يجتمع فيه الأعضاء حول نصٍّ واحد يقرؤه صاحبه."
              />
            </div>
          </Container>
        </section>

        <section className="py-20 md:py-28">
          <Container>
            <LandingHeading eyebrow="فعاليات" title="برامجنا وأنشطتنا" deck="ورشٌ وبرامجُ نوعيّة على مدار العام." align="center" />
            <div className="card-grid mt-10">
              <Card tone="brand">
                <CardHeader icon={<CalendarBlank aria-hidden />} title="ورشة السرد" subtitle="ثلاثة لقاءات" />
                <CardBody>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="success">مفتوحة</Badge>
                    <Badge tone="neutral">حضوريّ</Badge>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardHeader icon={<CalendarBlank aria-hidden />} title="ملتقى الشعر" subtitle="أمسيةٌ واحدة" />
                <CardBody>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="warning">قريبًا</Badge>
                    <Badge tone="neutral">حضوريّ</Badge>
                  </div>
                </CardBody>
              </Card>
            </div>
          </Container>
        </section>

        <section className="py-20 md:py-28">
          <Container>
            <LandingHeading eyebrow="فريق" title="أهل الدفّة" deck="المجلس الذي يقود النادي ويرعى مسيرته." align="center" />
            <div className="card-grid mt-10">
              <Demo
                icon={<Users aria-hidden />}
                title="مجلسُ الإدارة"
                subtitle="قيادة"
                body="مَن يرسمون الخطّة ويحملون أمانتها إلى آخر الموسم."
              />
              <Demo
                icon={<Users aria-hidden />}
                title="لجانُ العمل"
                subtitle="تنفيذ"
                body="الأيدي التي تصنع البرامج وتُخرجها إلى الناس."
              />
            </div>
          </Container>
        </section>

        <section className="py-20 md:py-28">
          <Container className="max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-content">كُن جزءًا من مجتمع أَدِيب</h2>
            <p className="mx-auto mt-3 max-w-lg text-content-muted">انضمّ إلى نادٍ يحتفي بالكلمة ويصنع المبدعين.</p>
            <div className="mt-6 flex justify-center">
              <Button size="lg">سجّل عضويتك</Button>
            </div>
          </Container>
        </section>

        <div className="pb-24" />
      </main>
    </>
  );
}
