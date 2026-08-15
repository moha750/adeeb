import { Alert } from "@adeeb/design-system";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyScope } from "@/lib/myScope";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getMembers } from "../members/data";
import { getOrgData } from "../members/structure/orgData";
import { committeeNodes } from "../members/structure/model";
import { CommitteeView } from "./CommitteeView";
import { PageHeader } from "../_components/PageHeader";

const Head = ({ name }: { name?: string }) => (
  <PageHeader title={name ?? "لجنتي"} crumbLeaf={name} />
);

/**
 * «لجنتي» — غرفةُ قائد اللجنة التنفيذيّة ونائبها، **عرضًا محضًا**.
 *
 * النطاق مقعدُ قيادةٍ حيّ (`lib/myScope.ts`)، ولا فعلَ في الصفحة أصلًا — فلا حاجة لطبقة
 * سلطةٍ فوق العرض: ما لا يُعرض زرُّه لا يُطلَب إذنُه.
 */
export default async function MyCommitteePage() {
  const denied = await denyUnless("/dashboard/committee");
  if (denied) return denied;

  const admin = await getCurrentAdmin();
  if (!admin) return denied;

  const scope = await getMyScope(admin.id);
  if (!scope.committee) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="لا لجنة تقودها">
          هذه الشاشة لقادة اللجان التنفيذيّة ونوّابهم: كشفُ اللجنة عرضًا. ولا يظهر لك كشفٌ
          لأنّك لا تشغل مقعد قيادةٍ في لجنة.
        </Alert>
      </>
    );
  }

  const [org, { members, error }] = await Promise.all([getOrgData(), getMembers()]);
  const failed = org.error ?? error;
  if (failed) {
    return (
      <>
        <Head name={scope.committee.name} />
        <Alert tone="warning" title="تعذّر جلب البيانات">{failed}</Alert>
      </>
    );
  }

  // `org.userRoles` منخولةٌ بالعضويّة السارية في مصدرها (`getOrgData`) — فالشجرةُ والجدولُ
  // والعددُ هنا للحاضرين وحدهم، بلا مرشِّحٍ يُعاد في هذه الشاشة.
  const node = committeeNodes(org.committees, org.roles, org.userRoles, org.profiles, org.supervision).get(scope.committee.id);
  if (!node) {
    return (
      <>
        <Head name={scope.committee.name} />
        <Alert tone="warning" title="لجنةٌ غير مفعّلة">
          {scope.committee.name} لا تظهر في الهيكلة الحيّة. راجِع حالتها في «هيكلة أديب».
        </Alert>
      </>
    );
  }

  const dept = org.committees.find((c) => c.id === node.id)?.department_id ?? null;
  const deptName = dept != null ? org.departments.find((d) => d.id === dept)?.name_ar ?? null : null;

  // أهلُ اللجنة بأعينهم — من عقدتها نفسها لا بحكمٍ يُعاد حسابه (القيادةُ معهم: بياناتُهم
  // تُرى كما تُرى بيانات العضو، والسلطة عليهم محجوبةٌ في القاعدة أصلًا). والمشرفان يبقيان
  // خارج السجلّ: هما في إدارتهما لا في اللجنة. والسريان مقضيٌّ في العقدة فوق، فلا يُعاد هنا.
  const mine = new Set([node.leader?.userId, node.deputy?.userId, ...node.members.map((m) => m.userId)].filter(Boolean) as string[]);

  return <CommitteeView committee={node} dept={deptName} members={members.filter((m) => mine.has(m.id))} />;
}
