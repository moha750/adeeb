import { Alert } from "@adeeb/design-system";
import { getOrgData } from "../structure/orgData";
import { buildPositions, buildStructure } from "../structure/model";
import { AssignmentsView } from "./AssignmentsView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";

const Head = () => (
  <PageHeader title="تعيين المناصب" />
);

export default async function AssignmentsPage() {
  const denied = await denyUnless("/dashboard/members/assignments");
  if (denied) return denied;

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
  // الملاحظات (مقاعد شاغرة/لجان بلا قيادة) مصدرُها الوحيد `buildStructure` — تُعرَض هنا حيث تُعالَج، لا في شجرة الهيكلة.
  const { anomalies } = buildStructure(org.councils, org.departments, org.committees, org.roles, org.userRoles, org.profiles, org.supervision);

  return (
    <>
      <Head />
      <AssignmentsView positions={positions} members={org.members} anomalies={anomalies} />
    </>
  );
}
