import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { activeCommittees, listVolunteers } from "../data";
import { VolunteersRoom } from "@/app/_ad/rooms/VolunteersRoom";
import { VOLUNTEERS_ROOM } from "@/app/_ad/rooms/volunteers.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(VOLUNTEERS_ROOM);

/**
 * على قالب «قائمة السجلّات» بكرت الشخص (٢٠٢٦-١١-٠٣). ولا مساراتٍ أبناءَ للمجلّد، فحالتا التحميل والخطأ بجانب الصفحة.
 * ولا خطأَ يعود من `listVolunteers` (يردّ قائمةً فارغة)، فلا `AdRoomError` هنا إلّا ما ينكسر أثناء الرسم (`error.tsx`).
 */
export default async function VolunteersPage() {
  const denied = await denyUnless("/dashboard/volunteering/volunteers");
  if (denied) return denied;

  const [rows, committees, me] = await Promise.all([listVolunteers(), activeCommittees(), getCurrentAdmin()]);
  // الإهداءُ قدرةٌ ثانيةٌ فوق قفل الغرفة: للرئيسين وقائد الموارد وحدَهم (قرار المالك ٢٠٢٦-١٠-٠٩).
  // والقاعدةُ تردّ غيرَهم أصلًا، فلا يُعرَض زرٌّ يُضغط ليُرفَض.
  const canGrant = !!me?.caps.includes("manage_membership_applications");
  return (
    <VolunteersRoom
      rows={rows}
      committees={committees}
      canGrant={canGrant}
      serverNow={await requestNow()}
      view={await roomView(VOLUNTEERS_ROOM.viewKey, VOLUNTEERS_ROOM.defaultView)}
    />
  );
}
