import { getAchievements } from "../data";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AchievementsRoom } from "@/app/_ad/rooms/AchievementsRoom";
import { AdRoomError } from "@/app/_ad/states";
import { ACHIEVEMENTS_ROOM } from "@/app/_ad/rooms/achievements.meta";
import { roomView } from "@/app/_ad/view-server";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(ACHIEVEMENTS_ROOM);

/**
 * غرفةُ الإحصاءات («ملخص المسيرة») على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في
 * الغرفة وحدها: التحريرُ والإنشاءُ (`[id]/edit`، `new`) أشقّاؤها، فلا يريان هيكلَ القائمة وهما يُفتحان.
 */
export default async function AchievementsPage() {
  const denied = await denyUnless("/dashboard/website/achievements");
  if (denied) return denied;

  if (!(await getWebsiteManager("achievements"))) return <WebsiteDenied section="الإحصاءات" />;

  const { items, error } = await getAchievements();
  if (error) return <AdRoomError {...ACHIEVEMENTS_ROOM} message={error} />;

  return <AchievementsRoom items={items} view={await roomView(ACHIEVEMENTS_ROOM.viewKey, ACHIEVEMENTS_ROOM.defaultView)} />;
}
