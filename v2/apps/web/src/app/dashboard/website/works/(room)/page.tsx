import { getWorks } from "../data";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { WorksRoom } from "@/app/_ad/rooms/WorksRoom";
import { AdRoomError } from "@/app/_ad/states";
import { WORKS_ROOM } from "@/app/_ad/rooms/works.meta";
import { roomView } from "@/app/_ad/view-server";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(WORKS_ROOM);

/**
 * غرفةُ معرض الأعمال على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في
 * الغرفة وحدها: التحريرُ والإنشاءُ (`[id]/edit`، `new`) أشقّاؤها، فلا يريان هيكلَ القائمة وهما يُفتحان.
 */
export default async function WorksPage() {
  const denied = await denyUnless("/dashboard/website/works");
  if (denied) return denied;

  if (!(await getWebsiteManager("works"))) return <WebsiteDenied section="الأعمال" />;

  const { works, error } = await getWorks();
  if (error) return <AdRoomError {...WORKS_ROOM} message={error} />;

  return <WorksRoom works={works} view={await roomView(WORKS_ROOM.viewKey, WORKS_ROOM.defaultView)} />;
}
