import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";

/**
 * **رابطُ الفرصة القصير** — هو ما يُلصَق في قروب المتطوّعين.
 *
 * وقِصَرُه مقصود: رابطٌ يُنسخ في محادثةٍ ويُقرأ بالعين. ولا يعرض شيئًا بنفسه، بل يعرف قاصدَه
 * ويسوقه: من لا جلسةَ له يدخل ثمّ يعود، والمتطوّعُ يهبط على صفحة الفرصة في بوّابته — ففيها
 * وحدَها زرُّ التقديم. ومن ليس متطوّعًا تقول له البوّابةُ إنّ الغرفة ليست له.
 */
export default async function ShortOpportunityLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionAdmin();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/v/${id}`)}`);
  redirect(`/dashboard/volunteer/${id}`);
}
