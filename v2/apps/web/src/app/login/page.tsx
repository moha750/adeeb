import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { PortalFlow } from "./PortalFlow";
import { DoorShell } from "@/app/_door/DoorShell";

export const metadata: Metadata = {
  title: "بوّابة أدِيب",
};

/**
 * **بوّابة أدِيب — بابُ من له حساب** (قرار المالك ٢٠٢٦-١٠-١٨): اسمُها اسمُ زرّ الرأس الذي يقود
 * إليها واسمُ ما وراءها (`/dashboard`)، لا «تسجيل الدخول». وهي منفصلةٌ عن إنشاء الحساب شكلًا
 * وعملًا: لا تفتح حسابًا (`PortalFlow`)،
 *
 * ومن جاءها **وله جلسةٌ قائمة** لا يُعرَض عليه نموذجُ دخولٍ دخله: يُساق إلى وجهته.
 *
 * وهذا هو ما يجعل «بوّابة أَدِيب» في رأس الموقع بابًا واحدًا يفهم صاحبَه — يسوق العضوَ إلى
 * لوحته وصاحبَ الحساب إلى غرفه فيها، بلا أن يعرف الرأسُ الجلسةَ (وهو مكوّنٌ عميليّ في صفحاتٍ
 * ساكنة، فلو سُئل عن الجلسة لَصارت كلُّ صفحةٍ عامّةٍ ديناميّة).
 *
 * والقرارُ يقع مرّةً واحدة: `/dashboard` مفترقُ الطرق (`safeNext`).
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const me = await getSessionAdmin();
  const { next } = await searchParams;
  if (me) redirect(safeNext(next));

  return (
    <DoorShell door="login">
      <Suspense fallback={null}>
        <PortalFlow />
      </Suspense>
    </DoorShell>
  );
}
