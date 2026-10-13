import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader, Container, Footer, LandingHeading } from "@adeeb/design-system";
import { UserMinus } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { awayIfNoSession, getSessionAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deletionDueLabel } from "@/lib/accountDeletion";
import { DeleteAccount } from "@/app/_components/DeleteAccount";

export const metadata: Metadata = { title: "حسابك، نادي أدِيب" };
export const dynamic = "force-dynamic";

/**
 * **كان بيتَ صاحب الحساب، وصار تحويلًا إلى بوّابة أدِيب** (٢٠٢٦-١٠-١٣): ما كان هنا صار غرفًا
 * هناك — «حجوزاتي» و«تطوّعي» و«شهاداتي» و«حسابي» — ويبقى العنوانُ لأنّ روابطَ قديمةً تقصده.
 *
 * **ويبقى بابًا لحالٍ واحدة**: من طلب حذفَ حسابه مجمَّدٌ لا مقفَل، فتُحوّله اللوحةُ إلى هنا حيث
 * خبرُ الطلب وبابُ العدول. وهو خارجَ اللوحة عن قصد، فلا يدور التحويلُ على نفسه.
 */
export default async function MePage() {
  const me = await getSessionAdmin();
  if (!me) redirect((await awayIfNoSession("/me")) ?? "/login?next=/me");
  if (!me.deletionRequestedAt) redirect("/dashboard");

  const { data: { user } } = await (await createClient()).auth.getUser();
  const hasPassword = (user?.identities ?? []).some((i) => i.provider === "email");

  return (
    <>
      <SiteHeader />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading eyebrow="حسابك" title="حسابُك في طريقه إلى الحذف" deck="ولك أن تعدل عنه إلى يوم تنفيذه." align="center" />
            <div style={{ maxWidth: 720, margin: "32px auto 0" }}>
              <Card>
                <CardHeader variant="soft" icon={<UserMinus weight={ICON_WEIGHT} aria-hidden />} title="حذف الحساب" subtitle="مهلتُه ثلاثون يومًا" />
                <CardBody>
                  <DeleteAccount pending dueLabel={deletionDueLabel(me.deletionRequestedAt)} hasPassword={hasPassword} />
                </CardBody>
              </Card>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
