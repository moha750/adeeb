"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, Button } from "@adeeb/design-system";
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
    <main>
      <AuthShell
        title={scope === "room" ? "هذه الصفحة خارج صلاحياتك" : "لا صلاحية دخول"}
        subtitle={
          scope === "room"
            ? "حسابك لا يملك صلاحية هذه الصفحة. ما تملكه من أقسامٍ يظهر في القائمة الجانبيّة."
            : `${name ? `مرحبًا ${name}، ` : ""}حسابك لا يملك صلاحية الوصول إلى بوّابة أديب. إن كنت تظنّ أنّ هذا خطأ فتواصل مع رئاسة النادي.`
        }
        slogan="بوابة أدِيب، من هُنا يُدار نادي أدِيب"
      >
        {scope === "room" ? (
          <Button variant="ghost" size="md" onClick={() => router.push("/dashboard")}>
            العودة إلى البوّابة
          </Button>
        ) : (
          <Button variant="ghost" size="md" loading={pending} onClick={signOut}>
            تسجيل الخروج
          </Button>
        )}
      </AuthShell>
    </main>
  );
}
