import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Footer, Container, Card, CardBody, Alert, LandingHeading } from "@adeeb/design-system";
import { createAdeebServiceClient } from "@adeeb/core";
import { getSessionAdmin } from "@/lib/auth";
import { hasMemberRecord, isAdeebMember } from "@/lib/memberRecord";
import { CompleteForm } from "./CompleteForm";

export const metadata: Metadata = { title: "إكمال سجلّك، نادي أديب" };
export const dynamic = "force-dynamic";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * إكمال سجلّ العضو — بديلُ `/onboarding` بعد نحر نظام التسجيل.
 *
 * الفرق جوهريّ لا اسميّ: ذاك كان بابَ دخولٍ إلى النادي يفتحه توكنٌ في بريد، وهذا بابُ استيفاءِ
 * سجلٍّ يفتحه أن تكون عضوًا داخلًا. فلا يُفعّل حسابًا ولا يمنح عضويّة — يسدّ نقصًا لا غير.
 *
 * ومن بلغها ولا سجلَّ له سِيق إليها من تخطيط اللوحة (`dashboard/layout.tsx`)، فهي آخرُ ما يراه
 * حتّى يُكمل. ومن أكمل صُرف عنها — فلا يعود إليها بالرابط.
 *
 * **بلا رأسٍ وحدَها** بين الصفحات العامّة: الرأسُ روابطُ تنقّلٍ وفعلُ انضمام، وهذه شاشةُ خطوةٍ
 * واحدةٍ لا مخرجَ منها إلّا إتمامُها — فمخارجُه تناقض بابَها. والتذييلُ باقٍ (لا يدعو إلى شيء).
 */
export default async function CompletePage() {
  const me = await getSessionAdmin();
  if (!me) redirect("/login");

  const sb = service();
  if (!sb) {
    return (
      <>
        <main className="py-14 md:py-20">
          <Container className="max-w-2xl">
            <Card>
              <CardBody className="p-6">
                <Alert tone="danger" title="تعذّر تحميل الصفحة">إعداد الخادم ناقص. أبلغ الإدارة.</Alert>
              </CardBody>
            </Card>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  // ومن ليس عضوًا لا سجلَّ عضويّةٍ يُكمله — بيتُه `/me` (بعد توحيد الهويّة في م١)
  if (!(await isAdeebMember(me.id))) redirect("/me");

  // من له سجلٌّ فلا شأن له بهذه الشاشة — وتحريرُ سجلّه في ملفّه الشخصيّ لا ههنا
  if (await hasMemberRecord(me.id)) redirect("/dashboard");

  const { data: profile } = await sb.from("profiles").select("full_name, phone, email").eq("id", me.id).maybeSingle();

  return (
    <>
      <main>
        {/* «الرأس المُذهّب» كما في كلّ صفحةٍ عامّة (العينُ كلمة والعنوانُ كلمتان)، والنموذجُ
            تحته في عرضٍ مقيَّد — نفسُ تخطيط `/verify`: العنوانُ يملأ الحاويةَ والمتنُ يضيق. */}
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="عضويّة"
              title="أكمل سجلّك"
              deck="سجلُّك عندنا ناقصٌ، وبعضُ ما ينقص لا يملكه إلّا أنت. أكمله مرّةً واحدة، ثمّ تابع."
              align="center"
            />
            <div style={{ maxWidth: 720, margin: "32px auto 0" }}>
              <CompleteForm
                prefill={{
                  fullName: profile?.full_name ?? me.fullName ?? "",
                  phone: profile?.phone ?? "",
                  email: profile?.email ?? me.email ?? "",
                }}
              />
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
