import { AdRoomLoading } from "@/app/_ad/states";
import { BIRTHDAYS_ROOM } from "@/app/_ad/rooms/birthdays.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...BIRTHDAYS_ROOM} view={await roomView(BIRTHDAYS_ROOM.viewKey, BIRTHDAYS_ROOM.defaultView)} />;
}
