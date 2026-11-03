import { getElections, getElectionCreateOptions } from "../data";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { ElectionsRoom } from "@/app/_ad/rooms/ElectionsRoom";
import { AdRoomError } from "@/app/_ad/states";
import { ELECTIONS_ROOM } from "@/app/_ad/rooms/elections.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(ELECTIONS_ROOM);

/**
 * غرفة الانتخابات — للإدارة والاطّلاع (قفلها `view_election_candidates`).
 * المديرُ (`manage_elections`) يرى الأزرار كاملةً؛ والمطّلِعُ (عضو الموارد) للقراءة.
 * أمّا ترشُّح العضو وتصويته فأبوابُه الثلاثة (`/run` · `/my` · `/vote`).
 *
 * على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢): المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في الغرفة وحدها —
 * الانتخابُ وأبوابُ العضو (`[id]`، `run`، `my`، `vote`) أشقّاؤها، فلا ترى هيكلَ القائمة وهي تُفتح.
 */
export default async function ElectionsPage() {
  const denied = await denyUnless("/dashboard/elections");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  const canManage = !!me?.caps.includes("manage_elections");

  const [{ elections, error }, createOptions] = await Promise.all([
    getElections(),
    canManage ? getElectionCreateOptions() : Promise.resolve(null),
  ]);

  if (error) return <AdRoomError {...ELECTIONS_ROOM} message={error} />;

  return (
    <ElectionsRoom
      elections={elections}
      createOptions={createOptions}
      readOnly={!canManage}
      serverNow={await requestNow()}
      view={await roomView(ELECTIONS_ROOM.viewKey, ELECTIONS_ROOM.defaultView)}
    />
  );
}
