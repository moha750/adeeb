import { AdRoomLoading } from "@/app/_ad/states";
import { DEEBO_KNOWLEDGE_ROOM } from "@/app/_ad/rooms/deebo-knowledge.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١١-٠٢). */
export default async function Loading() {
  return <AdRoomLoading {...DEEBO_KNOWLEDGE_ROOM} view={await roomView(DEEBO_KNOWLEDGE_ROOM.viewKey, DEEBO_KNOWLEDGE_ROOM.defaultView)} />;
}
