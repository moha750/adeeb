import { getCommitteeOptions, getMemberOptions, getShows, getStation } from "../data";
import { getRadioManager } from "@/lib/radio/authz";
import { RadioDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { RadioRoom } from "@/app/_ad/rooms/RadioRoom";
import { AdRoomError } from "@/app/_ad/states";
import { RADIO_ROOM } from "@/app/_ad/rooms/radio.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(RADIO_ROOM);

/**
 * برامجُ الإذاعة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في الغرفة وحدها:
 * محرّرُ البرنامج (`[showId]`) شقيقُها، فلا يرى هيكلَ القائمة وهو يُفتح. والحرّاسُ والجلبُ كما كانا في الصفحة القديمة.
 */
export default async function RadioPage() {
  const denied = await denyUnless("/dashboard/radio");
  if (denied) return denied;

  if (!(await getRadioManager())) return <RadioDenied />;

  const [{ shows, error }, members, committees, { station }] = await Promise.all([
    getShows(),
    getMemberOptions(),
    getCommitteeOptions(),
    getStation(),
  ]);

  if (error) return <AdRoomError {...RADIO_ROOM} message={error} />;

  return (
    <RadioRoom
      shows={shows}
      members={members}
      committees={committees}
      station={station}
      serverNow={await requestNow()}
      view={await roomView(RADIO_ROOM.viewKey, RADIO_ROOM.defaultView)}
    />
  );
}
