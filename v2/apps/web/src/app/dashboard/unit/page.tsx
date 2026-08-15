import { Alert } from "@adeeb/design-system";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyScope } from "@/lib/myScope";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getOrgData } from "../members/structure/orgData";
import { buildRoster, buildSeats, adminUnit } from "./model";
import { UnitView } from "./UnitView";
import { PageHeader } from "../_components/PageHeader";

// العنوان اسمُ الإدارة نفسها — فيعرف القائد أيّها يدير بلا سطرٍ ثالثٍ يشرح.
const Head = ({ unit }: { unit?: string }) => (
  <PageHeader title={unit ?? "إدارتي"} crumbLeaf={unit} />
);

export default async function UnitPage() {
  const denied = await denyUnless("/dashboard/unit");
  if (denied) return denied;

  const admin = await getCurrentAdmin();
  if (!admin) return denied;

  // النطاق أوّلًا — فمن لا إدارةَ له لا تُجلب له الهيكلةُ كلّها ليُقال له «لا شيء لك»
  const scope = await getMyScope(admin.id);
  if (!scope.unit) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="لا إدارة تقودها">
          هذه الشاشة لقادة الإدارات الإداريّة: يعيّنون أعضاءهم الإداريّين ويوزّعون إشرافهم على لجان
          المجلس التنفيذيّ. وقائدُ اللجنة التنفيذيّة غرفتُه «لجنتي»، ومنسّقُ القسم «قسمي».
        </Alert>
      </>
    );
  }

  const org = await getOrgData();
  if (org.error) {
    return (
      <>
        <Head unit={scope.unit.name} />
        <Alert tone="warning" title="تعذّر جلب الهيكلة">{org.error}</Alert>
      </>
    );
  }

  const unit = adminUnit(scope.unit.id, org.committees, org.roles);
  if (!unit) {
    return (
      <>
        <Head unit={scope.unit.name} />
        <Alert tone="warning" title="إدارةٌ لا تُصرّح بدور عضوها">
          لا يُعرف من يُعدّ عضوًا في {scope.unit.name}: `member_role_name` فارغ في القاعدة.
        </Alert>
      </>
    );
  }

  return (
    <>
      <Head unit={unit.name} />
      <UnitView
        unit={unit}
        seats={buildSeats(unit, org.committees, org.supervision, org.profiles)}
        roster={buildRoster(unit, org.committees, org.userRoles, org.supervision, org.profiles)}
        members={org.members}
      />
    </>
  );
}
