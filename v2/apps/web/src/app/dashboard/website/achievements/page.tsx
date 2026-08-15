import { Alert } from "@adeeb/design-system";
import { getAchievements } from "./data";
import { AchievementsView } from "./AchievementsView";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";

export default async function AchievementsPage() {
  const denied = await denyUnless("/dashboard/website/achievements");
  if (denied) return denied;

  if (!(await getWebsiteManager("achievements"))) return <WebsiteDenied section="الإحصاءات" />;

  const { items, error } = await getAchievements();

  if (error) {
    return (
      <>
        <PageHeader title="ملخص المسيرة" />
        <Alert tone="warning" title="تعذّر جلب الإحصاءات">{error}</Alert>
      </>
    );
  }

  return <AchievementsView items={items} />;
}
