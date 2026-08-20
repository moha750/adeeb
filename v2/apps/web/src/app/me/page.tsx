import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert, Card, CardBody, CardHeader, Container, Footer, LandingHeading } from "@adeeb/design-system";
import { IdentificationBadge, UserMinus } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { getSessionAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deletionDueLabel } from "@/lib/accountDeletion";
import { AccountExit } from "@/app/_components/AccountExit";
import { getMyExit } from "@/lib/membershipExit";
import { getMyAccount } from "./data";
import { getMyVolunteering } from "./volunteering";
import { MyBookings } from "./MyBookings";
import { MyData } from "./MyData";
import { MyVolunteering } from "./MyVolunteering";

export const metadata: Metadata = { title: "حسابك، نادي أديب" };
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

  const [account, volunteering] = await Promise.all([getMyAccount(me.id), getMyVolunteering(me.id)]);

  // بابُ الحذف يسأل سؤالين: أطلبَه صاحبُه من قبل؟ وهل له كلمةُ مرورٍ تُثبِته؟ والهويّاتُ تُقرأ
  // من الجلسة نفسِها (`getUser().identities`) لا بنداءٍ إداريّ — كما في تبويب الإعدادات سواءً.
  const pendingDeletion = me.deletionRequestedAt != null;
  const { data: { user: sessionUser } } = await (await createClient()).auth.getUser();
  const hasPassword = (sessionUser?.identities ?? []).some((i) => i.provider === "email");
  // البابُ يتبدّل بالمقعد (٢٠٢٦-٠٨-٢٠): العضويّةُ تُنهى قبل الحساب لا معه.
  const exit = await getMyExit();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="حسابك"
              title="مقاعدُك وبياناتُك"
              deck="ما حجزتَه من برامج أديب، وما نعرفه عنك، في موضعٍ واحد."
              align="center"
            />

            {!account ? (
              <div style={{ maxWidth: 720, margin: "32px auto 0" }}>
                <Alert tone="danger" title="تعذّر تحميل الصفحة">إعداد الخادم ناقص. أبلغ الإدارة.</Alert>
              </div>
            ) : (
              <div className="flex flex-col gap-8" style={{ marginTop: 32 }}>
                {/* التطوّعُ أوّلًا لمن ليس عضوًا: هو طريقُه إلى العضويّة، والحجوزاتُ دونه شأنًا.
                    والعضوُ لا يُعرَض عليه (طريقُه انتهى، وبيتُ عضويّته اللوحة). */}
                {!account.isMember && volunteering ? <MyVolunteering data={volunteering} /> : null}

                <MyBookings upcoming={account.upcoming} past={account.past} />

                <Card>
                  <CardHeader
                    variant="soft"
                    icon={<IdentificationBadge weight={ICON_WEIGHT} aria-hidden />}
                    title="بياناتك"
                    subtitle="بها نحجز مقعدك ونتواصل معك"
                  />
                  <CardBody>
                    <MyData me={account} />
                  </CardBody>
                </Card>

                {/* **بابٌ لا مراسلة** (قرار المالك ٢٠٢٦-٠٨-١٩، ينسخ قرارَ ٥ أغسطس): كانت
                    الحجّةُ أنّ الحجوزات سجلُّ حضورٍ للنادي فلا تُمحى بنقرة — وهي حجّةٌ صحيحةٌ
                    نالت جوابَها في التصميم لا في إغلاق الباب: السجلُّ يبقى كاملًا والحسابُ
                    وحدَه يذهب. وشرحُه في `v2/ACCOUNT-DELETION.md`. */}
                <Card>
                  <CardHeader
                    variant="soft"
                    icon={<UserMinus weight={ICON_WEIGHT} aria-hidden />}
                    title={exit.door === "delete" ? "حذف الحساب" : "الخروج من أديب"}
                    subtitle={
                      exit.door === "delete"
                        ? "بابُك إلى الخروج، ومهلتُه ثلاثون يومًا"
                        : "عضويّتُك أوّلًا، ثمّ حسابُك إن شئت"
                    }
                  />
                  <CardBody>
                    <AccountExit
                      door={exit.door}
                      deciders={exit.deciders}
                      pending={exit.pending}
                      lastAnswer={exit.lastAnswer}
                      deletion={{
                        pending: pendingDeletion,
                        dueLabel: deletionDueLabel(me.deletionRequestedAt),
                        hasPassword,
                      }}
                    />
                  </CardBody>
                </Card>
              </div>
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
