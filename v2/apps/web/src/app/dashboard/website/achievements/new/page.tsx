import { AchievementForm } from "../AchievementForm";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function NewAchievementPage() {
  const denied = await denyUnless("/dashboard/website/achievements");
  if (denied) return denied;

  if (!(await getWebsiteManager("achievements"))) return <WebsiteDenied section="الإحصاءات" />;
  return <AchievementForm />;
}
