import { Alert } from "@adeeb/design-system";
import { getAchievements } from "./data";
import { AchievementsView } from "./AchievementsView";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function AchievementsPage() {
  const denied = await denyUnless("/dashboard/website/achievements");
  if (denied) return denied;

  if (!(await getWebsiteManager("achievements"))) return <WebsiteDenied section="الإحصاءات" />;

  const { items, error } = await getAchievements();

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <div className="ash-crumb">أديب › المحتوى › الصفحة الرئيسية › <b>الإحصاءات</b></div>
            <h1>ملخص المسيرة</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الإحصاءات">{error}</Alert>
      </>
    );
  }

  return <AchievementsView items={items} />;
}
