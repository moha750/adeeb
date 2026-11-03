import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getEventsManager } from "@/lib/events/authz";
import { getEvents } from "../data";
import { EventsDenied } from "../_guard";
import { EventsRoom } from "@/app/_ad/rooms/EventsRoom";
import { AdRoomError } from "@/app/_ad/states";
import { EVENTS_ROOM } from "@/app/_ad/rooms/meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(EVENTS_ROOM);

/**
 * غرفةُ الفعاليّات على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في
 * الغرفة وحدها: التفاصيلُ والتحريرُ والإنشاءُ (`[id]`، `new`) أشقّاؤها، فلا ترى هيكلَ القائمة وهي تُفتح.
 */
export default async function EventsPage() {
  const denied = await denyUnless("/dashboard/events");
  if (denied) return denied;

  if (!(await getEventsManager())) return <EventsDenied />;

  const { events, error } = await getEvents();
  if (error) return <AdRoomError {...EVENTS_ROOM} message={error} />;

  return <EventsRoom events={events} serverNow={await requestNow()} view={await roomView(EVENTS_ROOM.viewKey, EVENTS_ROOM.defaultView)} />;
}
