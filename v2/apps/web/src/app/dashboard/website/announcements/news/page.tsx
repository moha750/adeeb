import { getHeroNews } from "../data";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { HeroNewsRoom } from "@/app/_ad/rooms/HeroNewsRoom";
import { AdRoomError } from "@/app/_ad/states";
import { HERO_NEWS_ROOM } from "@/app/_ad/rooms/hero-news.meta";
import { roomView } from "@/app/_ad/view-server";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **الأخبار المعروضة** — البابُ الثاني في «اللوحة الإعلانية» (٢٠٢٦-١٠-٠٣).
 * القفلُ قفلُ الغرفة نفسِه (`manage_announcements`) كباب الحملات في غرفة الباركود:
 * من ملك ما يقوله الصدرُ كتابةً ملك ما يعرضه صورةً.
 *
 * **وعلى قالب «قائمة السجلّات»** (٢٠٢٦-١١-٠٢): الغرفةُ `HeroNewsRoom`، وخطأُ الجلب حالُ خطأ الغرفة (كان تنبيهًا تحت رأسها).
 */
export const metadata = roomMetadata(HERO_NEWS_ROOM);

export default async function HeroNewsPage() {
  const denied = await denyUnless("/dashboard/website/announcements");
  if (denied) return denied;

  if (!(await getWebsiteManager("announcements"))) {
    return <WebsiteDenied section="اللوحة الإعلانية" />;
  }

  const { picked, options, error } = await getHeroNews();
  if (error) return <AdRoomError {...HERO_NEWS_ROOM} message={error} />;

  return <HeroNewsRoom picked={picked} options={options} view={await roomView(HERO_NEWS_ROOM.viewKey, HERO_NEWS_ROOM.defaultView)} />;
}
