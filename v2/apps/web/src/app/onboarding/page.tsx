import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Header, Footer, Container, Card, CardBody, Alert, SectionHeading } from "@adeeb/design-system";
import { createAdeebServiceClient } from "@adeeb/core";
import { OnboardingForm, type Prefill } from "./OnboardingForm";

export const metadata: Metadata = { title: "إكمال التسجيل — نادي أديب" };
export const dynamic = "force-dynamic";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="py-14 md:py-20">
        <Container className="max-w-2xl">{children}</Container>
      </main>
      <Footer />
    </>
  );
}

function StateScreen({ title, tone, children, actions }: { title: string; tone: "info" | "warning" | "success" | "danger"; children: ReactNode; actions?: ReactNode }) {
  return (
    <Card>
      <CardBody className="p-6">
        <Alert tone={tone} title={title} actions={actions}>{children}</Alert>
      </CardBody>
    </Card>
  );
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const sb = service();
  if (!sb) {
    return <Shell><StateScreen tone="danger" title="تعذّر تحميل الصفحة">إعداد الخادم ناقص — أبلغ الإدارة.</StateScreen></Shell>;
  }

  const t = token?.trim();
  if (!t) {
    return <Shell><StateScreen tone="warning" title="رابط غير صالح">الرابط ناقص. استخدم الرابط الذي وصلك في البريد.</StateScreen></Shell>;
  }

  const { data: tok } = await sb
    .from("member_onboarding_tokens")
    .select("user_id, is_used, expires_at, sent_to_email, application_id")
    .eq("token", t)
    .maybeSingle();

  if (!tok) {
    return <Shell><StateScreen tone="warning" title="رابط غير صالح">لم نجد هذا الرابط. تحقّق منه أو تواصل مع إدارة الموارد البشريّة.</StateScreen></Shell>;
  }
  if (tok.is_used) {
    return (
      <Shell>
        <StateScreen tone="success" title="تمّ إكمال تسجيلك" actions={<Link href="/login" className="abtn abtn-primary abtn-md">تسجيل الدخول</Link>}>
          حسابك مفعّلٌ بالفعل. سجّل دخولك للمتابعة.
        </StateScreen>
      </Shell>
    );
  }
  if (new Date(tok.expires_at) < new Date()) {
    return <Shell><StateScreen tone="warning" title="انتهت صلاحية الرابط">تواصل مع إدارة الموارد البشريّة لإعادة إرسال الرابط.</StateScreen></Shell>;
  }

  // تعبئة مسبقة من الطلب (يظلّ كلّها قابلًا للتعديل؛ البريد للعرض فقط)
  let prefill: Prefill = { fullName: "", phone: "", email: tok.sent_to_email ?? "", degree: "", college: "", major: "" };
  if (tok.application_id) {
    const { data: appn } = await sb
      .from("membership_applications")
      .select("full_name, phone, email, degree, college, major")
      .eq("id", tok.application_id)
      .maybeSingle();
    if (appn) {
      prefill = {
        fullName: appn.full_name ?? "",
        phone: appn.phone ?? "",
        email: appn.email ?? tok.sent_to_email ?? "",
        degree: appn.degree ?? "",
        college: appn.college ?? "",
        major: appn.major ?? "",
      };
    }
  }

  return (
    <Shell>
      <SectionHeading eyebrow="مرحبًا بك في أدِيب" title="أكمل بياناتك وفعّل حسابك" />
      <p className="mb-8 max-w-xl text-content-muted">هذه آخر خطوة — أنشئ كلمة مرورك وأكمل بياناتك لتفعيل عضويّتك.</p>
      <OnboardingForm token={t} prefill={prefill} />
    </Shell>
  );
}
