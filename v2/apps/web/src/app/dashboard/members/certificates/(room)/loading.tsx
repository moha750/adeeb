import { AdRoomLoading } from "@/app/_ad/states";
import { MEMBER_CERTIFICATES_ROOM } from "@/app/_ad/rooms/member-certificates.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١١-٠١). */
export default async function Loading() {
  return <AdRoomLoading {...MEMBER_CERTIFICATES_ROOM} view={await roomView(MEMBER_CERTIFICATES_ROOM.viewKey, MEMBER_CERTIFICATES_ROOM.defaultView)} />;
}
