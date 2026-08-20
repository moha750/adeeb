import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT_EXCEPTION } from "@/lib/iconWeight";
import { AuthShell } from "@adeeb/design-system";
import { getSessionAdmin } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "إنشاء حساب، نادي أديب",
};

/**
 * **بابُ الحساب** — أوّلُ محطّةٍ في طريق العضويّة.
 *
 * ولم يكن له بابٌ قبل اليوم: الحسابُ كان يُفتح ضِمنًا (رمزٌ إلى البريد عند حجز فعاليّة، أو
 * دخولٌ بقوقل) فلا يبلغه إلّا من حجز صدفةً. وطريقُ العضويّة يبدأ بحسابٍ، فلزمه بابٌ يُقصد.
 *
 * ومن جاءها وله جلسةٌ قائمة لا يُعرَض عليه إنشاءُ ما يملك: يُساق إلى وجهته (`/join` غالبًا،
 * وهي بدورها تعرف صاحبَها فتسوقه إلى منزلته).
 */
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  // ووجهتُه الافتراضيّة `/join` لا اللوحة: من فتح حسابًا الآن ليس عضوًا، وإنّما جاء ليصير
  const next = safeNext((await searchParams).next ?? "/join");
  const me = await getSessionAdmin();
  if (me) redirect(next);

  return (
    <main>
      <AuthShell
        title="إنشاء حساب"
        subtitle="حسابُك أوّلُ الطريق: منه تحجز برامجنا، ومنه تتقدّم للتطوّع ثمّ العضويّة."
        slogan="بوابة أدِيب، من هُنا يُدار نادي أدِيب"
      >
        <Suspense fallback={<div className="aauth-form" aria-hidden />}>
          <SignupForm next={next} />
        </Suspense>

        <Link href="/" className="abtn abtn-ghost abtn-md aauth-back">
          <ArrowRight size={18} weight={ICON_WEIGHT_EXCEPTION} />
          العودة إلى الموقع
        </Link>
      </AuthShell>
    </main>
  );
}
