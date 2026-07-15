import { Alert } from "@adeeb/design-system";
import { getOrgData } from "./orgData";
import { buildStructure } from "./model";
import { StructureView } from "./StructureView";

const Head = () => (
  <div className="ash-phead">
    <div>
      <div className="ash-crumb">أديب › أعضاء أديب › <b>هيكلة أديب</b></div>
      <h1>هيكلة أديب</h1>
    </div>
  </div>
);

export default async function StructurePage() {
  const org = await getOrgData();
  if (org.error) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب الهيكلة">{org.error}</Alert>
      </>
    );
  }

  const model = buildStructure(org.councils, org.departments, org.committees, org.roles, org.userRoles, org.profiles);

  return (
    <>
      <Head />
      {/* حارس الهوية: تنسيقات `.org-*` مؤقّتة — موسومة للإعادة تصميمها بمكوّنات الهوية */}
      <div data-needs="مكوّنات هيكلة أديب (شجرة المجالس/الأقسام/اللجان)">
        <StructureView model={model} />
      </div>
    </>
  );
}
