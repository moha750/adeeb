"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@adeeb/design-system";
import { createClient } from "@/lib/supabase/client";

/** يُعرَض للمستخدم المُصادَق لكن دون صلاحية أدمن (بدل التحويل — تفاديًا لحلقة مع الـmiddleware). */
export function AccessDenied({ name }: { name: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const signOut = () =>
    start(async () => {
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    });

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">أ</span>
          <b>لوحة أديب</b>
        </div>
        <div className="auth-head">
          <h1 className="auth-title">لا صلاحية دخول</h1>
          <p className="auth-sub">
            {name ? `مرحبًا ${name}، ` : ""}حسابك لا يملك صلاحية الوصول إلى لوحة الإدارة. إن كنت تظنّ أنّ هذا خطأ فتواصل مع رئاسة النادي.
          </p>
        </div>
        <Button variant="ghost" size="md" loading={pending} onClick={signOut}>
          تسجيل الخروج
        </Button>
      </div>
    </main>
  );
}
