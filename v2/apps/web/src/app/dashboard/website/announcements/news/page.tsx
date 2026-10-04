import { getHeroNews } from "../data";
import { HeroNewsView } from "./HeroNewsView";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";

/**
 * **الأخبار المعروضة** — البابُ الثاني في «اللوحة الإعلانية» (٢٠٢٦-١٠-٠٣).
 * القفلُ قفلُ الغرفة نفسِه (`manage_announcements`) كباب الحملات في غرفة الباركود:
 * من ملك ما يقوله الصدرُ كتابةً ملك ما يعرضه صورةً.
 */
export const metadata = { title: "الأخبار المعروضة" };

export default async function HeroNewsPage() {
  const denied = await denyUnless("/dashboard/website/announcements");
  if (denied) return denied;

  if (!(await getWebsiteManager("announcements"))) {
    return <WebsiteDenied section="اللوحة الإعلانية" />;
  }

  const { picked, options, error } = await getHeroNews();
  return <HeroNewsView picked={picked} options={options} error={error} />;
}
