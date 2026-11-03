import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { SupervisedRoomFor } from "@/app/_ad/rooms/people-rooms";
import { SUPERVISED_ROOM } from "@/app/_ad/rooms/supervised.meta";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(SUPERVISED_ROOM);

/**
 * على قالب «قائمة السجلّات» بكرت الشخص (٢٠٢٦-١١-٠٣): الحارسُ هنا كما كان، والجلبُ والنطاقُ في `SupervisedRoomFor` (`_ad/rooms/people-rooms.tsx`)
 * حرفًا كما كانا في هذه الصفحة — منه يرسم المختبرُ أيضًا ما يراه صاحبُ هذا الباب. والشاشةُ القديمة باقيةٌ في مجلّدها بلا استعمال.
 */
export default async function SupervisedMembersPage() {
  const denied = await denyUnless("/dashboard/members/supervised");
  if (denied) return denied;
  const me = await getCurrentAdmin();
  if (!me) return denied;
  return <SupervisedRoomFor userId={me.id} />;
}
