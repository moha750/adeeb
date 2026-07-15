import { Alert } from "@adeeb/design-system";
import { getOrgData } from "../structure/orgData";
import { buildPositions } from "../structure/model";
import { AssignmentsView } from "./AssignmentsView";

const Head = () => (
  <div className="ash-phead">
    <div>
      <div className="ash-crumb">أديب › أعضاء أديب › <b>تعيين المناصب</b></div>
      <h1>تعيين المناصب</h1>
    </div>
  </div>
);

export default async function AssignmentsPage() {
  const org = await getOrgData();
  if (org.error) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب المناصب">{org.error}</Alert>
      </>
    );
  }

  const positions = buildPositions(org.councils, org.departments, org.committees, org.roles, org.userRoles, org.profiles);
  const roleIds = Object.fromEntries(org.roles.map((r) => [r.role_name, r.id])) as Record<string, number>;

  return (
    <>
      <Head />
      {/* حارس الهوية: تنسيقات `.asg-*` مؤقّتة — موسومة للإعادة تصميمها بمكوّنات الهوية */}
      <div data-needs="مكوّنات تعيين المناصب (بطاقات المناصب/المحرّر)">
        <AssignmentsView positions={positions} members={org.members} roleIds={roleIds} />
      </div>
    </>
  );
}
