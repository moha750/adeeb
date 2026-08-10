import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getVoteElections } from "../member-data";
import { VoteView } from "./VoteView";

/**
 * باب «التصويت» — لكلّ ناخبٍ (`view_own_membership`)، ولا يظهر في التنقّل إلّا حين تصدق
 * إشارةُ `canVote` (ثمّة تصويتٌ مفتوحٌ لم يُدلِ فيه بعد). السرّيّةُ والصوتُ الواحد تفرضهما
 * `cast_vote` في القاعدة، فهذه الصفحة عرضٌ وبابُ فعل.
 */
export default async function VotePage() {
  const denied = await denyUnless("/dashboard/elections/vote");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const { items, error } = await getVoteElections(me.id);
  return <VoteView items={items} error={error} />;
}
