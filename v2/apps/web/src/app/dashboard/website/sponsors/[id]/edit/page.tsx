import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getSponsorForEdit } from "../../data";
import { SponsorForm } from "../../SponsorForm";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../../../../_shell/Breadcrumb";

export default async function EditSponsorPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/website/sponsors");
  if (denied) return denied;

  if (!(await getWebsiteManager("sponsors"))) return <WebsiteDenied section="الرعاة" />;

  const { id } = await params;
  const { sponsor, error } = await getSponsorForEdit(id);

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb leaf="تحرير" />
            <h1>تحرير الراعي</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الراعي">{error}</Alert>
      </>
    );
  }
  if (!sponsor) notFound();

  return <SponsorForm sponsor={sponsor} />;
}
