import { Alert } from "@adeeb/design-system";
import { getOrgData } from "../structure/orgData";
import { buildPositions } from "../structure/model";
import { AssignmentsView } from "./AssignmentsView";
import { getScheduledBatches } from "./batches";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { isSuggestedIcon } from "@/lib/unitIcons";
import { unitIconNodes } from "@/lib/unitIconCatalog";
import { PageHeader } from "../../_components/PageHeader";

const Head = () => (
  <PageHeader title="تعيين المناصب" />
);

export default async function AssignmentsPage() {
  const denied = await denyUnless("/dashboard/members/assignments");
  if (denied) return denied;

  const [org, admin] = await Promise.all([getOrgData(), getCurrentAdmin()]);
  if (org.error) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب المناصب">{org.error}</Alert>
      </>
    );
  }

  // كرتُ المنصب وحده يرى الأصيلَ المجمَّد: المقعدُ محجوزٌ له (20261010)
  const positions = buildPositions(org.councils, org.departments, org.committees, org.roles, [...org.userRoles, ...org.frozenRoles], org.profiles);
  // لا تنبيهَ «ملاحظات على الهيكلة» فوق اللوحة (حُذف بقرار المالك ٢٠٢٦-١٠-١١): الشغورُ تقوله اللوحةُ نفسُها
  // (كرتُ «شاغرة»، وعدّادُ كلّ رأس، والمقعدُ المتقطّع)، ونقصُ الإشراف تقوله «إدارتي» حيث يُوزَّع.

  // أيقوناتُ الوحدات من خارج المقترحة يرسمها الخادمُ من المكتبة (`lib/unitIconCatalog.ts`)، فلا يحملها المتصفّح
  const batches = await getScheduledBatches(org, admin?.id ?? null);

  const iconNodes = unitIconNodes(
    [...org.departments.map((d) => d.icon), ...org.committees.map((c) => c.icon)].filter((k): k is string => !!k && !isSuggestedIcon(k)),
  );

  return (
    <>
      <Head />
      <AssignmentsView positions={positions} iconNodes={iconNodes} units={{ councils: org.councils, departments: org.departments, committees: org.committees }} members={org.members}
        canEditUnits={!!admin?.caps.includes("manage_positions")} batches={batches} />
    </>
  );
}
