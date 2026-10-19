import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { SignupFlow } from "./SignupFlow";
import { DoorShell } from "@/app/_door/DoorShell";

export const metadata: Metadata = {
  title: "إنشاء حساب، نادي أدِيب",
};

/**
 * **بابُ الحساب — الوحيد** (قرار المالك ٢٠٢٦-١٠-١٨): منفصلٌ عن بوّابة أدِيب شكلًا وعملًا. لا
 * يُنشأ حسابٌ في غيره: البوّابةُ تُدخل من له حساب، والحجزُ وصفحةُ التطوّع يقودان إلى البابين
 * ويعودان. ويبدأ بسؤال القادم عمّا جاء له (`SignupFlow`).
 *
 * ولم يكن له بابٌ قبل أغسطس: الحسابُ كان يُفتح ضِمنًا (رمزٌ إلى البريد عند حجز فعاليّة، أو
 * دخولٌ بقوقل) فلا يبلغه إلّا من حجز صدفةً.
 *
 * **ووجهتُه بوّابةُ أدِيب لا بابُ التطوّع** (المالك ٢٠٢٦-١٠-١٨): كانت `/join` على افتراض أنّ
 * فاتحَ الحساب جاء ليصير عضوًا، فوجد من فتحه ليحجز نفسَه في طلب تطوّع. وكلُّ حسابٍ صديقُ أدِيب
 * (٢٠٢٦-١٠-٠٩)، وبيتُه البوّابة (٢٠٢٦-١٠-١١)، وفيها دعوةُ التطوّع لمن أرادها. ومن قصد التطوّعَ
 * فبابُه `/join` نفسُه، وهو يمرّر وجهتَه صراحةً فيبقى فيه.
 *
 * ومن جاءها وله جلسةٌ قائمة لا يُعرَض عليه إنشاءُ ما يملك: يُساق إلى وجهته.
 */
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const given = (await searchParams).next;
  // بلا وجهةٍ ← `/dashboard` (افتراضُ `safeNext`) — ويسأله الباب «لماذا جئت؟» فيختار وجهتَه بنفسه
  const next = safeNext(given);
  const me = await getSessionAdmin();
  if (me) redirect(next);

  return (
    <DoorShell door="signup">
      <SignupFlow next={next} askWhy={!given} />
    </DoorShell>
  );
}
