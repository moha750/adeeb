import { Alert } from "@adeeb/design-system";
import { getOrgData } from "./orgData";
import { buildStructure } from "./model";
import { StructureView } from "./StructureView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";

const Head = () => (
  <PageHeader title="هيكلة أديب" />
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
