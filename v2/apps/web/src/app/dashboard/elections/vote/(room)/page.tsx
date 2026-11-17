import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getVoteElections } from "../../member-data";
import { VoteRoom } from "@/app/_ad/rooms/MemberElectionsRooms";
import { VOTE_ROOM } from "@/app/_ad/rooms/member-elections.meta";
import { AdRoomError } from "@/app/_ad/states";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(VOTE_ROOM);

/**
 * باب «التصويت» — لكلّ ناخبٍ (`view_own_membership`)، ولا يظهر في التنقّل إلّا حين تصدق
 * إشارةُ `canVote` : **ثمّة تصويتٌ مفتوحٌ في نطاقه، أدلى فيه أو لم يُدلِ** (2026-08-15).
 * كان الشرطُ «لم يُدلِ بعد» فيسقط البابُ لحظةَ ختم الصوت، والغرفةُ مبنيّةٌ على أنّ من صوّت
 * يبقى له أن يقرأ حتّى يُغلق الباب، ولا سِجلَّ للتصويت يخلُف بابَه كما لِلترشُّح سِجلُّه.
 * فالبابُ يسقط بإغلاق التصويت لا بإدلاء صاحبه. والسرّيّةُ والصوتُ الواحد تفرضهما
 * `cast_vote` في القاعدة، فهذه الصفحة عرضٌ وبابُ فعل. على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٤)، والحارسُ والجلبُ كما كانا
 * حرفًا، والشاشةُ القديمة (`VoteView`) باقيةٌ بلا استعمال.
 */
export default async function VotePage() {
  const denied = await denyUnless("/dashboard/elections/vote");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const { items, error } = await getVoteElections(me.id);
  if (error) return <AdRoomError {...VOTE_ROOM} message={error} />;
  return <VoteRoom items={items} serverNow={await requestNow()} view={await roomView(VOTE_ROOM.viewKey, VOTE_ROOM.defaultView)} />;
}
