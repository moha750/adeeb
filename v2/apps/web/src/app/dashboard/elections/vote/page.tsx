import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getVoteElections } from "../member-data";
import { VoteView } from "./VoteView";

/**
 * باب «التصويت» — لكلّ ناخبٍ (`view_own_membership`)، ولا يظهر في التنقّل إلّا حين تصدق
 * إشارةُ `canVote` : **ثمّة تصويتٌ مفتوحٌ في نطاقه، أدلى فيه أو لم يُدلِ** (2026-08-15).
 * كان الشرطُ «لم يُدلِ بعد» فيسقط البابُ لحظةَ ختم الصوت، والغرفةُ مبنيّةٌ على أنّ من صوّت
 * يبقى له أن يقرأ حتّى يُغلق الباب، ولا سِجلَّ للتصويت يخلُف بابَه كما لِلترشُّح سِجلُّه.
 * فالبابُ يسقط بإغلاق التصويت لا بإدلاء صاحبه. والسرّيّةُ والصوتُ الواحد تفرضهما
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
