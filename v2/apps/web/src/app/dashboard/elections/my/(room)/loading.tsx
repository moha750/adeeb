import { AdRoomLoading } from "@/app/_ad/states";
import { MY_CANDIDACIES_ROOM } from "@/app/_ad/rooms/member-elections.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...MY_CANDIDACIES_ROOM} view={await roomView(MY_CANDIDACIES_ROOM.viewKey, MY_CANDIDACIES_ROOM.defaultView)} />;
}
