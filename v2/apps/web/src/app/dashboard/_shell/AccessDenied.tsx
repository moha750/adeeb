"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignOut } from "@/app/_components/glyphs";
import { DoorShell } from "@/app/_door/DoorShell";
import { Btn, Head } from "@/app/_door/parts";
import { firstNameOf } from "@/lib/personName";
import { setDeeboMood } from "@/lib/deeboMood";
import { createClient } from "@/lib/supabase/client";

/**
 * **بابُ «لا صلاحية»**: للمُصادَق الذي لا يملك مفتاحَ أيّ غرفةٍ في البوّابة (بدل التحويل — تفاديًا لحلقة تحويل). مخرجُه تسجيلُ الخروج.
 *
 * **بابٌ من أبواب الحساب** (٢٠٢٦-١١-٢٣): كان على `AuthShell` القديم (لوحٌ مذهّبٌ وبطاقة على الشفق)، فصار على «القسمين» كأخواته — اللوحُ
 * بجملة الهويّة وديبو حائرًا، والورقةُ برأس الخطوة وزرٍّ واحد. وأمامَ غرفةٍ بعينها داخل البوّابة لوحُ الغرفة (`AdRoomDenied`)، لا هذا.
 */
export function AccessDenied({ name, preview }: { name: string | null; preview?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const signOut = () => {
    if (preview) return;
    setDeeboMood("busy");
    start(async () => {
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <DoorShell door="denied">
      <div className="door-step">
        <Head
          kicker={name ? `مرحبًا ${firstNameOf(name)}` : undefined}
          sub="حسابك لا يملك صلاحية الوصول إلى بوّابة أدِيب. إن كنت تظنّ أنّ هذا خطأ فتواصل مع رئاسة النادي."
        >
          لا صلاحية دخول
        </Head>
        <Btn variant="ghost" size="lg" icon={<SignOut />} loading={pending} onClick={signOut}>
          تسجيل الخروج
        </Btn>
      </div>
    </DoorShell>
  );
}
