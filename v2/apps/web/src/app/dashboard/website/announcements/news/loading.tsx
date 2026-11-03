import { AdRoomLoading } from "@/app/_ad/states";
import { HERO_NEWS_ROOM } from "@/app/_ad/rooms/hero-news.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...HERO_NEWS_ROOM} view={await roomView(HERO_NEWS_ROOM.viewKey, HERO_NEWS_ROOM.defaultView)} />;
}
