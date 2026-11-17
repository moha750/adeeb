import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyCandidacies } from "../../member-data";
import { MyCandidaciesRoom } from "@/app/_ad/rooms/MemberElectionsRooms";
import { MY_CANDIDACIES_ROOM } from "@/app/_ad/rooms/member-elections.meta";
import { AdRoomError } from "@/app/_ad/states";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(MY_CANDIDACIES_ROOM);

/**
 * باب «سِجلّ ترشُّحي» — لمن يحمل `run_for_election`، ولا يظهر في التنقّل إلّا حين تصدق
 * إشارةُ `hasCandidacy` (له ترشّحٌ قائم). التعديلُ والسحبُ يفرض القاعدةُ حدودَهما (can_edit/…).
 * على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٤)، والحارسُ والجلبُ كما كانا حرفًا، والشاشةُ القديمة (`MyCandidaciesView`) باقيةٌ بلا استعمال.
 */
export default async function MyCandidaciesPage() {
  const denied = await denyUnless("/dashboard/elections/my");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const { items, error } = await getMyCandidacies(me.id);
  if (error) return <AdRoomError {...MY_CANDIDACIES_ROOM} message={error} />;
  return <MyCandidaciesRoom items={items} serverNow={await requestNow()} view={await roomView(MY_CANDIDACIES_ROOM.viewKey, MY_CANDIDACIES_ROOM.defaultView)} />;
}
