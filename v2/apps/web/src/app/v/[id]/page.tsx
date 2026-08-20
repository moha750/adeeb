import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";

/**
 * **رابطُ الفرصة القصير** — هو ما يُلصَق في قروب المتطوّعين.
 *
 * وقِصَرُه مقصود: رابطٌ يُنسخ في محادثةٍ ويُقرأ بالعين. ولا يعرض شيئًا بنفسه، بل يعرف قاصدَه
 * ويسوقه: من لا جلسةَ له يدخل ثمّ يعود، ومن ليس متطوّعًا يُدَلّ على بابه، والمتطوّعُ يهبط على
 * الفرصة في حسابه — ففيه وحدَه زرُّ التقديم.
 */
export default async function ShortOpportunityLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionAdmin();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/v/${id}`)}`);
  redirect(`/me#opp-${id}`);
}
