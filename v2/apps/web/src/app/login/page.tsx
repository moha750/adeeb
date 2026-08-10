import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
// مدخلُ ssr خادميٌّ لا يقرأ سياقَ الأيقونات ولا يمرّ بقائمة المستثنَين (وهي عميليّة)،
// فيُمرَّر وزنُ السهم — وهو إشارةُ اتّجاه — من مصدره الواحد صراحةً.
import { ICON_WEIGHT_EXCEPTION } from "@/lib/iconWeight";
import { AuthShell } from "@adeeb/design-system";
import { getSessionAdmin } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "تسجيل الدخول، بوّابة أديب",
};

/**
 * ومن جاءها **وله جلسةٌ قائمة** لا يُعرَض عليه نموذجُ دخولٍ دخله: يُساق إلى وجهته.
 *
 * وهذا هو ما يجعل «بوّابة أَدِيب» في رأس الموقع بابًا واحدًا يفهم صاحبَه — يسوق العضوَ إلى
 * لوحته وصاحبَ الحساب إلى بيته `/me`، بلا أن يعرف الرأسُ الجلسةَ (وهو مكوّنٌ عميليّ في صفحاتٍ
 * ساكنة، فلو سُئل عن الجلسة لَصارت كلُّ صفحةٍ عامّةٍ ديناميّة).
 *
 * والقرارُ يقع مرّةً واحدة: `/dashboard` مفترقُ الطرق (`safeNext`).
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const me = await getSessionAdmin();
  if (me) redirect(safeNext((await searchParams).next));

  return (
    <main>
      <AuthShell
        title="تسجيل الدخول"
        subtitle="ادخل ببيانات حسابك الإداريّ للوصول إلى اللوحة."
        slogan="بوابة أدِيب، من هُنا يُدار نادي أدِيب"
      >
        <Suspense fallback={<div className="aauth-form" aria-hidden />}>
          <LoginForm />
        </Suspense>

        {/* المخرج: عودةٌ إلى الموقع لمن حطّ هنا بلا حساب — نمطُ زرّ‑الرابط المتّبع في اللوحة */}
        <Link href="/" className="abtn abtn-ghost abtn-md aauth-back">
          <ArrowRight size={18} weight={ICON_WEIGHT_EXCEPTION} />
          العودة إلى الموقع
        </Link>
      </AuthShell>
    </main>
  );
}
