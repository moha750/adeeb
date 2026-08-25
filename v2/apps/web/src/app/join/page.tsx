import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert, Container, Footer, LandingHeading } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { getSessionAdmin } from "@/lib/auth";
import { isAdeebMember } from "@/lib/memberRecord";
import { getJoinData } from "./data";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = { title: "الانضمام إلى أديب" };
export const dynamic = "force-dynamic";

/**
 * **بابُ الانضمام الواحد.**
 *
 * زرُّ «انضمّ إلينا» في الرأس والهبوط يقصد هذا المسار وحده، والفرقُ يقع ههنا مرّةً واحدة —
 * وكلٌّ يُساق إلى منزلته:
 *
 * (والرأسُ صار يعرف صاحبَه منذ ٢٠٢٦-٠٨-٢٥ فيُسقط الدعوةَ عمّن لا تعنيه، لكنّه يعرفه **في
 * المتصفّح بعد الترطيب** لا في الخادم — الصفحاتُ العامّةُ ساكنةٌ كما كانت. فالسَّوقُ يبقى
 * ههنا: هو الحارسُ الذي لا يعتمد على شيءٍ في يد المتصفّح.)
 *
 * | القاصد | يُساق إلى |
 * |---|---|
 * | بلا جلسة | `/signup` ثمّ يعود |
 * | عضوٌ في النادي | `/dashboard` — هو فوق هذه المحطّة لا دونها |
 * | صاحبُ حسابٍ بلا بيانات | هذه الشاشة، وأوّلُ خطوةٍ فيها بياناتُه |
 * | صاحبُ حسابٍ أو متطوّع | هذه الشاشة: يقدّم أو يعيد ترتيب رغباته |
 *
 * **والبياناتُ تُسأل ههنا لا عند إنشاء الحساب** (قرار المالك ١٥ أغسطس ٢٠٢٦): الحسابُ يُفتح
 * بنقرةٍ من قوقل، فلا يُثقَل بابُه بستّة حقولٍ يهرب منها إلى المزوّد. وأوّلُ حاجةٍ حقيقيّة
 * إليها ههنا: لا متطوّعَ بلا جوّالٍ يُتواصل به ولا جنسٍ تُقاس به فرصُه.
 */
export default async function JoinPage() {
  const me = await getSessionAdmin();
  if (!me) redirect("/signup?next=/join");
  if (await isAdeebMember(me.id)) redirect("/dashboard");

  const data = await getJoinData(me.id);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="العضويّة"
              title="طريقُك إلينا"
              deck="رتّب رغباتك في اللجان، فتصير من متطوّعي أدِيب. ومن رأينا عملَه في الفرص أهديناه العضويّة."
              align="center"
            />

            <div style={{ marginTop: 32 }}>
              {!data ? (
                <Alert tone="danger" title="تعذّر تحميل الصفحة">إعداد الخادم ناقص. أبلغ الإدارة.</Alert>
              ) : data.options.length === 0 ? (
                <Alert tone="warning" title="لا لجانَ متاحةً الآن">
                  لم تُفتح لجانٌ لترتيب الرغبات بعد. تابِعنا.
                </Alert>
              ) : (
                <JoinForm
                  options={data.options}
                  initialPrefs={data.prefs}
                  isVolunteer={data.isVolunteer}
                  hasProfile={data.hasProfile}
                />
              )}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
