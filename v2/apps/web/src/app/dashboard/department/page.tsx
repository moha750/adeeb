import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { DepartmentRoomFor } from "@/app/_ad/rooms/people-rooms";
import { DEPARTMENT_ROOM } from "@/app/_ad/rooms/department.meta";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(DEPARTMENT_ROOM);

/**
 * على قالب «قائمة السجلّات» بكرت الشخص (٢٠٢٦-١١-٠٣): الحارسُ هنا كما كان، والجلبُ والنطاقُ في `DepartmentRoomFor` (`_ad/rooms/people-rooms.tsx`)
 * حرفًا كما كانا في هذه الصفحة — منه يرسم المختبرُ أيضًا ما يراه صاحبُ هذا الباب. والشاشةُ القديمة باقيةٌ في مجلّدها بلا استعمال.
 */
export default async function MyDepartmentPage() {
  const denied = await denyUnless("/dashboard/department");
  if (denied) return denied;
  const me = await getCurrentAdmin();
  if (!me) return denied;
  return <DepartmentRoomFor userId={me.id} />;
}
