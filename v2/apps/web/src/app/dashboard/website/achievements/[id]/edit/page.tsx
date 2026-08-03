import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getAchievementForEdit } from "../../data";
import { AchievementForm } from "../../AchievementForm";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../../../../_shell/Breadcrumb";

export default async function EditAchievementPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/website/achievements");
  if (denied) return denied;

  if (!(await getWebsiteManager("achievements"))) return <WebsiteDenied section="الإحصاءات" />;

  const { id } = await params;
  const { item, error } = await getAchievementForEdit(id);

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb leaf="تحرير" />
            <h1>تحرير الإحصائيّة</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الإحصائيّة">{error}</Alert>
      </>
    );
  }
  if (!item) notFound();

  return <AchievementForm item={item} />;
}
