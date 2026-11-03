import { getSponsors } from "../data";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { SponsorsRoom } from "@/app/_ad/rooms/SponsorsRoom";
import { AdRoomError } from "@/app/_ad/states";
import { SPONSORS_ROOM } from "@/app/_ad/rooms/sponsors.meta";
import { roomView } from "@/app/_ad/view-server";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(SPONSORS_ROOM);

/**
 * غرفةُ الرعاة والشركاء على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في
 * الغرفة وحدها: التحريرُ والإنشاءُ (`[id]/edit`، `new`) أشقّاؤها، فلا يريان هيكلَ القائمة وهما يُفتحان.
 */
export default async function SponsorsPage() {
  const denied = await denyUnless("/dashboard/website/sponsors");
  if (denied) return denied;

  if (!(await getWebsiteManager("sponsors"))) return <WebsiteDenied section="الرعاة" />;

  const { sponsors, error } = await getSponsors();
  if (error) return <AdRoomError {...SPONSORS_ROOM} message={error} />;

  return <SponsorsRoom sponsors={sponsors} view={await roomView(SPONSORS_ROOM.viewKey, SPONSORS_ROOM.defaultView)} />;
}
