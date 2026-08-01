"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@adeeb/design-system";
import { createClient } from "@/lib/supabase/client";

/**
 * يُعرَض للمستخدم المُصادَق دون المفتاح المطلوب (بدل التحويل — تفاديًا لحلقة تحويل).
 *
 * موضعان لا واحد:
 * - `gate` — عند الباب: لا يملك مفتاح أيّ غرفة. مخرجه تسجيل الخروج.
 * - `room` — أمام غرفةٍ بعينها وهو داخل اللوحة أصلًا. مخرجه العودة إلى الصدر لا الخروج،
 *   فمن دخل الباب لا يُطرَد منه لأنّ غرفةً واحدة أُقفلت دونه.
 */
export function AccessDenied({ name, scope = "gate" }: { name: string | null; scope?: "gate" | "room" }) {
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
          <h1 className="auth-title">{scope === "room" ? "هذه الصفحة خارج صلاحياتك" : "لا صلاحية دخول"}</h1>
          <p className="auth-sub">
            {scope === "room"
              ? "حسابك لا يملك صلاحية هذه الصفحة. ما تملكه من أقسامٍ يظهر في القائمة الجانبيّة."
              : `${name ? `مرحبًا ${name}، ` : ""}حسابك لا يملك صلاحية الوصول إلى لوحة الإدارة. إن كنت تظنّ أنّ هذا خطأ فتواصل مع رئاسة النادي.`}
          </p>
        </div>
        {scope === "room" ? (
          <Button variant="ghost" size="md" onClick={() => router.push("/dashboard")}>
            العودة إلى اللوحة
          </Button>
        ) : (
          <Button variant="ghost" size="md" loading={pending} onClick={signOut}>
            تسجيل الخروج
          </Button>
        )}
      </div>
    </main>
  );
}
