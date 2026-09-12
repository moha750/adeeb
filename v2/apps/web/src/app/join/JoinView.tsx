import { Alert, Card, CardBody, Container, LandingHeading, Reveal } from "@adeeb/design-system";
import { SignupForm } from "@/app/signup/SignupForm";
import type { CommitteeOption } from "./data";
import { JoinCommittees, JoinPath, JoinPerks } from "./JoinStory";
import { JoinForm } from "./JoinForm";

/**
 * **متنُ صفحة الانضمام** — الشاشةُ التي يراها الزائر، مفصولةً عن قارئها.
 *
 * وفُصلت لأنّ حالاتِها أربعٌ لا تُبلَغ إلّا بأربعة حسابات: لا جلسةَ · حسابٌ بلا بيانات ·
 * مقدِّمٌ · متطوّع. فمعرضُها في `/ui/join` يبدّلها بزرٍّ على مقاس الجوّال، **بمصدرٍ واحدٍ لا
 * نسخةٍ ثانية** — يُغيَّر هنا فيتغيّر الحيُّ والمعروضُ معًا.
 *
 * وهي بلا `"use client"` وبلا `server-only`: تُركَّب في الصفحة الخادميّة وفي المعرض
 * العميليّ سواءً، وأبناؤها الثلاثة هم الذين يعرفون منزلتَهم (النماذجُ عميليّة والمتنُ خادميّ).
 */

/** خطوةُ القارئ على الطريق — يشتقّها الخادمُ من الجلسة، ويضبطها المعرضُ بيده. */
export type JoinStep = "account" | "data" | "apply" | "edit";

/**
 * عنوانُ آخر الصفحة يتبع خطوةَ قارئه — العينُ كلمةٌ والعنوانُ كلمتان (قاعدة `LandingHeading`)،
 * و`cta` نداءُ الصدر الذي يقفز إليه.
 */
const STEP_HEADING: Record<JoinStep, { eyebrow: string; title: string; deck: string; cta: string }> = {
  account: { eyebrow: "ابدأ", title: "خطوتُك الأولى", deck: "أنشئ حسابَك في أدِيب، ثمّ رتّب رغباتك في اللجان.", cta: "أنشئ حسابَك" },
  data: { eyebrow: "بياناتك", title: "عرّفنا بنفسِك", deck: "لا متطوّعَ بلا جوّالٍ نصل به إليه.", cta: "أكمِل بياناتك" },
  apply: { eyebrow: "التقديم", title: "رتّب رغباتِك", deck: "ثلاثُ لجانٍ بترتيب رغبتك فيها، وبها تصير من متطوّعي أدِيب.", cta: "رتّب رغباتك" },
  edit: { eyebrow: "متطوّع", title: "حدّث رغباتِك", deck: "أنت من متطوّعي أدِيب، ولك أن تعيد ترتيب رغباتك متى شئت.", cta: "حدّث رغباتك" },
};

export function JoinView({
  committees, step, prefs, isVolunteer, hasProfile,
}: {
  /** `null` = إعدادُ خادمٍ ناقص (تُفرَّق عن قائمةٍ فارغة: تلك لجانٌ لم تُفتح بعد). */
  committees: CommitteeOption[] | null;
  step: JoinStep;
  prefs: number[];
  isVolunteer: boolean;
  hasProfile: boolean;
}) {
  const heading = STEP_HEADING[step];
  const noCommittees = committees === null || committees.length === 0;

  return (
    <main>
      {/* (١) الدعوة — ما هذه الصفحة، في سطرين، ثمّ نداؤها */}
      <section className="py-16 md:py-24">
        <Container>
          <LandingHeading
            eyebrow="الانضمام"
            title="عائلةُ أدِيب"
            deck="بابُنا واحدٌ: تتطوّع معنا في لجانِنا، فإذا رأينا عملَك دعوناك إلى العضويّة."
            align="center"
          />

          {/* **نداءُ الصدر — وإلّا فالفعلُ على بُعد أربع شاشات.** الصفحةُ قصّةٌ قبل أن تكون
              نموذجًا، ومتنُها على ٣٧٥px يطول (ثلاثُ شبكاتٍ وتسعُ لجان) — فمن جاء عازمًا لا
              يُلزَم أن يقرأ ليفعل، ومن جاء ليقرأ لا يُدفَع إلى الفعل. زرّان: الأوّلُ يقفز
              إلى خطوته، والثاني إلى اللجان. ويتبدّل نصُّ الأوّل بمنزلة قارئه كما يتبدّل
              العنوانُ الذي يقصده. */}
          <div className="btn-row mx-auto max-w-md">
            <a href="#step" className="abtn abtn-primary abtn-lg">{heading.cta}</a>
            <a href="#committees" className="abtn abtn-ghost abtn-lg">تصفّح اللجان</a>
          </div>
        </Container>
      </section>

      {/* (٢) ما تنالُه — **اللِمَ قبل الكيف**: الصفحةُ كانت تشرح الطريقَ ولا تقول ما في آخره
          (رآه المالك). والسببُ يسبق الآليّة: من لم يعرف ما ينال لم يعنِه كيف ينال. */}
      <section className="py-16 md:py-24">
        <Container>
          <Reveal>
            <LandingHeading
              eyebrow="التطوّع"
              title="ماذا تنال"
              deck="كلُّ ما يناله المتطوّع عندنا قائمٌ في النظام، لا موعودٌ في كلام."
            />
            <JoinPerks />
          </Reveal>
        </Container>
      </section>

      {/* (٣) الطريق — الآليّةُ بعد السبب: ثلاثُ محطّاتٍ لا رابعَ لها */}
      <section className="py-16 md:py-24">
        <Container>
          <Reveal>
            <LandingHeading
              eyebrow="الطريق"
              title="محطّاتُك إلينا"
              deck="لا قفزَ فيها ولا اختصار: كلُّ محطّةٍ تفتح ما بعدها."
            />
            <JoinPath />
          </Reveal>
        </Container>
      </section>

      {/* (٤) اللجان — هي الإعلان: من رآها عرف أين يعمل */}
      <section id="committees" className="py-16 md:py-24">
        <Container>
          <Reveal>
            <LandingHeading
              eyebrow="اللجان"
              title="أينَ تعمل"
              deck="لكلّ لجنةٍ عملُها في النادي. اقرأها، ثمّ رتّب ثلاثًا منها بترتيب رغبتك."
            />
            {committees === null ? (
              <Alert tone="danger" title="تعذّر تحميل اللجان">إعداد الخادم ناقص. أبلغ الإدارة.</Alert>
            ) : committees.length === 0 ? (
              <Alert tone="warning" title="لا لجانَ متاحةً الآن">لم تُفتح لجانٌ لترتيب الرغبات بعد. تابِعنا.</Alert>
            ) : (
              <JoinCommittees options={committees} />
            )}
          </Reveal>
        </Container>
      </section>

      {/* (٥) خطوتُك — القسم الوحيد الذي يتبدّل بمنزلة قارئه */}
      <section id="step" className="py-16 md:py-24">
        <Container className="max-w-2xl">
          <Reveal>
            <LandingHeading eyebrow={heading.eyebrow} title={heading.title} deck={heading.deck} align="center" />

            {step === "account" ? (
              <Card>
                <CardBody className="p-6">
                  {/* ووجهتُه بعد الحساب هذه الصفحةُ نفسُها: يعود إليها وقد صارت خطوتُه الثانية */}
                  <SignupForm next="/join" />
                </CardBody>
              </Card>
            ) : noCommittees ? (
              <Alert tone="warning" title="لا لجانَ متاحةً الآن">لم تُفتح لجانٌ لترتيب الرغبات بعد. تابِعنا.</Alert>
            ) : (
              <JoinForm
                options={committees}
                initialPrefs={prefs}
                isVolunteer={isVolunteer}
                hasProfile={hasProfile}
              />
            )}
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
