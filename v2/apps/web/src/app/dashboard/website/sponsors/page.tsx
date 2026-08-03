import { Alert } from "@adeeb/design-system";
import { getSponsors } from "./data";
import { SponsorsView } from "./SponsorsView";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../../_shell/Breadcrumb";

export default async function SponsorsPage() {
  const denied = await denyUnless("/dashboard/website/sponsors");
  if (denied) return denied;

  if (!(await getWebsiteManager("sponsors"))) return <WebsiteDenied section="الرعاة" />;

  const { sponsors, error } = await getSponsors();

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb />
            <h1>الرعاة والشركاء</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الرعاة">{error}</Alert>
      </>
    );
  }

  return <SponsorsView sponsors={sponsors} />;
}
