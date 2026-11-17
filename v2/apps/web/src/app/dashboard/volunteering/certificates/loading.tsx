import { AdRoomLoading } from "@/app/_ad/states";
import { VOLUNTEER_CERTIFICATES_ROOM } from "@/app/_ad/rooms/volunteer-certificates.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...VOLUNTEER_CERTIFICATES_ROOM} view={await roomView(VOLUNTEER_CERTIFICATES_ROOM.viewKey, VOLUNTEER_CERTIFICATES_ROOM.defaultView)} />;
}
