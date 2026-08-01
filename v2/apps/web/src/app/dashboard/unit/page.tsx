import { Alert } from "@adeeb/design-system";
import { getCurrentAdmin } from "@/lib/auth";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getOrgData } from "../members/structure/orgData";
import { buildRoster, buildSeats, ledUnit } from "./model";
import { UnitView } from "./UnitView";

// العنوان اسمُ الوحدة نفسها — فيعرف القائد أيّها يدير بلا سطرٍ ثالثٍ يشرح.
const Head = ({ unit }: { unit?: string }) => (
  <div className="ash-phead">
    <div>
      <div className="ash-crumb">أديب › <b>{unit ?? "وحدتي"}</b></div>
      <h1>{unit ?? "وحدتي"}</h1>
    </div>
  </div>
);

export default async function UnitPage() {
  const denied = await denyUnless("/dashboard/unit");
  if (denied) return denied;

  const admin = await getCurrentAdmin();
  if (!admin) return denied;

  const org = await getOrgData();
  if (org.error) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب الهيكلة">{org.error}</Alert>
      </>
    );
  }

  // الوحدة تُقرأ من صفّ القيادة الحيّ — الشرط نفسه الذي تفحصه `can_assign_role` في القاعدة.
  const unit = ledUnit(admin.id, org.committees, org.userRoles, org.roles);
  if (!unit) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="لا وحدة تقودها">
          هذه الشاشة لقادة الوحدات: قائد اللجنة يضمّ أعضاءه ويُخرجهم، وقائد الإدارة يزيد توزيعَهم
          على لجان المجلس التنفيذيّ. ولا يظهر لك كشفٌ لأنّك لا تقود وحدة.
        </Alert>
      </>
    );
  }

  return (
    <>
      <Head unit={unit.name} />
      <UnitView
        unit={unit}
        // مقاعد الإشراف بُعدُ الإدارات وحدها — واللجنةُ تُعطى قائمةً فارغةً لا فرعًا ثانيًا في العرض.
        seats={unit.kind === "admin" ? buildSeats(unit, org.committees, org.supervision, org.profiles) : []}
        roster={buildRoster(unit, org.committees, org.userRoles, org.supervision, org.profiles)}
        members={org.members}
      />
    </>
  );
}
