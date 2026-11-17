import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getRunElections } from "../../member-data";
import { RunRoom } from "@/app/_ad/rooms/MemberElectionsRooms";
import { RUN_ROOM } from "@/app/_ad/rooms/member-elections.meta";
import { AdRoomError } from "@/app/_ad/states";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(RUN_ROOM);

/**
 * باب «الترشُّح» — لمن يحمل `run_for_election` (روله يؤهّله للترشّح)، ولا يظهر في التنقّل
 * إلّا حين تصدق إشارةُ `canRun` (ثمّة انتخابٌ مفتوحٌ لم يقدّم له بعد). الأهليّةُ الدقيقة
 * والقبول يفرضهما `submit_candidacy` في القاعدة، فهذه الصفحة عرضٌ وبابُ فعل. على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٤)،
 * والحارسُ والجلبُ كما كانا حرفًا، والشاشةُ القديمة (`RunView`) باقيةٌ بلا استعمال.
 */
export default async function RunPage() {
  const denied = await denyUnless("/dashboard/elections/run");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const { items, error } = await getRunElections(me.id);
  if (error) return <AdRoomError {...RUN_ROOM} message={error} />;
  return <RunRoom items={items} serverNow={await requestNow()} view={await roomView(RUN_ROOM.viewKey, RUN_ROOM.defaultView)} />;
}
