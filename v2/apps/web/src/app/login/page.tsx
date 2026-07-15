import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "تسجيل الدخول — لوحة أديب",
};

export default function LoginPage() {
  return (
    <main className="auth-wrap">
      {/* حارس الهوية: تنسيقات `.auth-*` مؤقّتة — موسومة للإعادة تصميمها بمكوّنات الهوية */}
      <div data-needs="شاشة تسجيل الدخول (بطاقة/شعار auth)">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">أ</span>
          <b>لوحة أديب</b>
        </div>
        <div className="auth-head">
          <h1 className="auth-title">تسجيل الدخول</h1>
          <p className="auth-sub">ادخل ببيانات حسابك الإداريّ للوصول إلى اللوحة.</p>
        </div>
        <Suspense fallback={<div className="auth-form" aria-hidden />}>
          <LoginForm />
        </Suspense>
      </div>
      </div>
    </main>
  );
}
