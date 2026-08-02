import { Alert } from "@adeeb/design-system";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyScope } from "@/lib/myScope";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getMembers } from "../members/data";
import { getOrgData } from "../members/structure/orgData";
import { committeeNodes } from "../members/structure/model";
import { DepartmentView } from "./DepartmentView";

const Head = ({ name }: { name?: string }) => (
  <div className="ash-phead">
    <div>
      <div className="ash-crumb">أديب › <b>{name ?? "قسمي"}</b></div>
      <h1>{name ?? "قسمي"}</h1>
    </div>
  </div>
);

/**
 * «قسمي» — غرفةُ منسّق القسم، **عرضًا محضًا**.
 *
 * النطاق صفُّه الحيّ على قسمٍ (`user_roles.department_id` — القسم لا يحمل عمود «دور
 * منسّقه» بعد، فالانتماء هو الدليل)، ولجانُه ما نُسب إليه في `committees.department_id`.
 */
export default async function MyDepartmentPage() {
  const denied = await denyUnless("/dashboard/department");
  if (denied) return denied;

  const admin = await getCurrentAdmin();
  if (!admin) return denied;

  const scope = await getMyScope(admin.id);
  if (!scope.department) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="لا قسم تنسّقه">
          هذه الشاشة لمنسّقي الأقسام — لجانُ القسم وقيادتُها وأعضاؤها عرضًا. ولا يظهر لك كشفٌ
          لأنّك لست منسّق قسم.
        </Alert>
      </>
    );
  }

  const [org, { members, error }] = await Promise.all([getOrgData(), getMembers()]);
  const failed = org.error ?? error;
  if (failed) {
    return (
      <>
        <Head name={scope.department.name} />
        <Alert tone="warning" title="تعذّر جلب البيانات">{failed}</Alert>
      </>
    );
  }

  const nodes = committeeNodes(org.committees, org.roles, org.userRoles, org.profiles, org.supervision);
  const committees = org.committees
    .filter((c) => c.department_id === scope.department?.id)
    .sort((a, b) => a.id - b.id)
    .flatMap((c) => { const n = nodes.get(c.id); return n ? [n] : []; });

  const link = org.departments.find((d) => d.id === scope.department?.id)?.group_link ?? null;

  // أهلُ القسم بأعينهم — من عُقَد لجانه لا بحكمٍ يُعاد حسابه (والقيادةُ معهم: تُرى بياناتُهم
  // ولا تُملَك سلطتُهم، والقاعدة تحجبها أصلًا).
  const mine = new Set(
    committees.flatMap((c) => [c.leader?.userId, c.deputy?.userId, ...c.members.map((m) => m.userId)].filter(Boolean) as string[]),
  );

  return (
    <DepartmentView
      name={scope.department.name}
      committees={committees}
      link={link}
      members={members.filter((m) => mine.has(m.id))}
    />
  );
}
