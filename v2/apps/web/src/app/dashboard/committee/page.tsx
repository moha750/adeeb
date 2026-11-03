import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { CommitteeRoomFor } from "@/app/_ad/rooms/people-rooms";
import { COMMITTEE_ROOM } from "@/app/_ad/rooms/committee.meta";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(COMMITTEE_ROOM);

/**
 * على قالب «قائمة السجلّات» بكرت الشخص (٢٠٢٦-١١-٠٣): الحارسُ هنا كما كان، والجلبُ والنطاقُ في `CommitteeRoomFor` (`_ad/rooms/people-rooms.tsx`)
 * حرفًا كما كانا في هذه الصفحة — منه يرسم المختبرُ أيضًا ما يراه صاحبُ هذا الباب. والشاشةُ القديمة باقيةٌ في مجلّدها بلا استعمال.
 */
export default async function MyCommitteePage() {
  const denied = await denyUnless("/dashboard/committee");
  if (denied) return denied;
  const me = await getCurrentAdmin();
  if (!me) return denied;
  return <CommitteeRoomFor userId={me.id} />;
}
