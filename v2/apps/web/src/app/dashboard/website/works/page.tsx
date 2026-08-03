import { Alert } from "@adeeb/design-system";
import { getWorks } from "./data";
import { WorksView } from "./WorksView";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../../_shell/Breadcrumb";

export default async function WorksPage() {
  const denied = await denyUnless("/dashboard/website/works");
  if (denied) return denied;

  if (!(await getWebsiteManager("works"))) return <WebsiteDenied section="الأعمال" />;

  const { works, error } = await getWorks();

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb />
            <h1>معرض الأعمال</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الأعمال">{error}</Alert>
      </>
    );
  }

  return <WorksView works={works} />;
}
