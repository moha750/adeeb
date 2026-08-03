import { Alert } from "@adeeb/design-system";
import { getOrgData } from "./orgData";
import { buildStructure } from "./model";
import { StructureView } from "./StructureView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../../_shell/Breadcrumb";

const Head = () => (
  <div className="ash-phead">
    <div>
      <Breadcrumb />
      <h1>هيكلة أديب</h1>
    </div>
  </div>
);

export default async function StructurePage() {
  const denied = await denyUnless("/dashboard/members/structure");
  if (denied) return denied;

  const org = await getOrgData();
  if (org.error) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب الهيكلة">{org.error}</Alert>
      </>
    );
  }

  const model = buildStructure(org.councils, org.departments, org.committees, org.roles, org.userRoles, org.profiles, org.supervision);

  return (
    <>
      <Head />
      <StructureView model={model} />
    </>
  );
}
