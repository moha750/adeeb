import { AdRoomLoading } from "@/app/_ad/states";
import { EMAIL_LOG_ROOM } from "@/app/_ad/rooms/email-log.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١١-٠٢). */
export default async function Loading() {
  return <AdRoomLoading {...EMAIL_LOG_ROOM} view={await roomView(EMAIL_LOG_ROOM.viewKey, EMAIL_LOG_ROOM.defaultView)} />;
}
