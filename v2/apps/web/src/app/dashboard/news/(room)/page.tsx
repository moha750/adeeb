import { getNewsroomActor } from "@/lib/news/authz";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getNews, getUnitOptions } from "../data";
import { NewsroomDenied } from "../_guard";
import { NewsRoom } from "@/app/_ad/rooms/NewsRoom";
import { AdRoomError } from "@/app/_ad/states";
import { NEWS_ROOM } from "@/app/_ad/rooms/meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(NEWS_ROOM);

/**
 * غرفةُ تحرير أدِيب على قالب «قائمة السجلّات» (٢٠٢٦-١٠-٣١). المجموعةُ `(room)` تحصر حالتَي التحميل
 * والخطأ في الغرفة وحدها: المحرّرُ (`[id]`) شقيقُها، فلا يرى هيكلَ القائمة وهو يُفتح.
 */
export default async function NewsPage() {
  // قفل الغرفة من `SECTION_CAP`؛ ثمّ الفاعل نفسه — فمنه يُعرف رئيسُ التحرير من الكاتب.
  const denied = await denyUnless("/dashboard/news");
  if (denied) return denied;

  const actor = await getNewsroomActor();
  if (!actor) return <NewsroomDenied />;

  const [{ rows, error }, units] = await Promise.all([
    getNews(actor),
    actor.isChief ? getUnitOptions() : Promise.resolve([]),
  ]);
  if (error) return <AdRoomError {...NEWS_ROOM} message={error} />;

  return <NewsRoom rows={rows} units={units} isChief={actor.isChief} serverNow={await requestNow()} view={await roomView(NEWS_ROOM.viewKey, NEWS_ROOM.defaultView)} />;
}
