import { getOrgData } from "../structure/orgData";
import { buildPositions } from "../structure/model";
import { getScheduledBatches } from "./batches";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { isSuggestedIcon } from "@/lib/unitIcons";
import { unitIconNodes } from "@/lib/unitIconCatalog";
import { AssignmentsRoom } from "@/app/_ad/rooms/AssignmentsRoom";
import { AdNote, AdRoom, RoomPlate } from "@/app/_ad/primitives";

/**
 * «تعيين المناصب» على الهويّة الجديدة منذ ٢٠٢٦-١١-١٤ (`_ad/rooms/AssignmentsRoom`، قالبُ «قائمة السجلّات»: المقاعدُ سطورٌ تحت رؤوس
 * وحداتها). والقديمُ (`./AssignmentsView` بلوحة المقاعد) باقٍ على القرص حتى التنظيف، ويقرؤه معرضُ `/ui/seats` وحده.
 */
export default async function AssignmentsPage() {
  const denied = await denyUnless("/dashboard/members/assignments");
  if (denied) return denied;

  const [org, admin] = await Promise.all([getOrgData(), getCurrentAdmin()]);
  if (org.error) {
    return (
      <AdRoom label="تعيين المناصب">
        <RoomPlate title="تعيين المناصب" />
        <AdNote tone="warn" title="تعذّر جلب المناصب">{org.error}</AdNote>
      </AdRoom>
    );
  }

  // كرتُ المنصب وحده يرى الأصيلَ المجمَّد: المقعدُ محجوزٌ له (20261010)
  const positions = buildPositions(org.councils, org.departments, org.committees, org.roles, [...org.userRoles, ...org.frozenRoles], org.profiles);
  const batches = await getScheduledBatches(org, admin?.id ?? null);
  // أيقوناتُ الوحدات من خارج المقترحة يرسمها الخادمُ من المكتبة (`lib/unitIconCatalog.ts`)، فلا يحملها المتصفّح
  const iconNodes = unitIconNodes(
    [...org.departments.map((d) => d.icon), ...org.committees.map((c) => c.icon)].filter((k): k is string => !!k && !isSuggestedIcon(k)),
  );

  return (
    <AssignmentsRoom positions={positions} iconNodes={iconNodes} units={{ councils: org.councils, departments: org.departments, committees: org.committees }}
      members={org.members} canEditUnits={!!admin?.caps.includes("manage_positions")} batches={batches} />
  );
}
