import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { AuthShell } from "@adeeb/design-system";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "تسجيل الدخول — لوحة أديب",
};

export default function LoginPage() {
  return (
    <main>
      <AuthShell
        title="تسجيل الدخول"
        subtitle="ادخل ببيانات حسابك الإداريّ للوصول إلى اللوحة."
        slogan="لوحةُ نادي أديب — إدارةُ الأعضاء والفعاليّات والمحتوى في مكانٍ واحد."
      >
        <Suspense fallback={<div className="aauth-form" aria-hidden />}>
          <LoginForm />
        </Suspense>

        {/* المخرج: عودةٌ إلى الموقع لمن حطّ هنا بلا حساب — نمطُ زرّ‑الرابط المتّبع في اللوحة */}
        <Link href="/" className="abtn abtn-ghost abtn-md aauth-back">
          <ArrowRight size={18} />
          العودة إلى الموقع
        </Link>
      </AuthShell>
    </main>
  );
}
