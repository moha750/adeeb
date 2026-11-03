import { denyUnless } from "@/app/dashboard/_shell/guard";
import { listFriends } from "./data";
import { FriendsRoom } from "@/app/_ad/rooms/FriendsRoom";
import { FRIENDS_ROOM } from "@/app/_ad/rooms/friends.meta";
import { AdRoomError } from "@/app/_ad/states";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(FRIENDS_ROOM);

/**
 * على قالب «قائمة السجلّات» بكرت الشخص (٢٠٢٦-١١-٠٣). ولا مساراتٍ أبناءَ للمجلّد، فحالتا التحميل والخطأ بجانب الصفحة.
 * وخطأُ الجلب (كان تنبيهًا تحت رأس الصفحة: «تعذّر جلب الأصدقاء») «القطعةُ» نفسُها بنصّه.
 */
export default async function FriendsPage() {
  const denied = await denyUnless("/dashboard/friends");
  if (denied) return denied;

  const { rows, error } = await listFriends();
  if (error) return <AdRoomError {...FRIENDS_ROOM} message={error} />;
  return <FriendsRoom rows={rows} serverNow={await requestNow()} view={await roomView(FRIENDS_ROOM.viewKey, FRIENDS_ROOM.defaultView)} />;
}
