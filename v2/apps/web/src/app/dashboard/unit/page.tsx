import { Alert } from "@adeeb/design-system";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyScope } from "@/lib/myScope";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getOrgData } from "../members/structure/orgData";
import { buildRoster, buildSeats, adminUnit } from "./model";
import { UnitView } from "./UnitView";
import { UnitSwitcher } from "./UnitSwitcher";
import { PageHeader } from "../_components/PageHeader";

// العنوان اسمُ الإدارة نفسها — فيعرف الداخلُ أيّها يدير بلا سطرٍ ثالثٍ يشرح.
const Head = ({ unit }: { unit?: string }) => (
  <PageHeader title={unit ?? "الإدارات"} crumbLeaf={unit} />
);

/**
 * غرفةُ الإدارات الإداريّة — **تعيينُ أعضائها وتوزيعُ إشرافهم**.
 *
 * وكانت غرفةَ إدارةٍ واحدةٍ هي التي يقودها الداخل، فصارت (20260819) غرفةَ **ما يبلُغه
 * تعيينُه**: القائدُ يبلغ إدارتَه وحدها فلا يرى فرقًا، والرئيسان (النادي والتنفيذيّ) يبلغان
 * الإدارتين فيختاران — وسلطتُهما على ذلك قائمةٌ في `position_authority` من قبلُ، وإنّما
 * كان القفلُ يردّهما عند الباب.
 *
 * والقائمةُ من `scope.units` (وأصلُها `can_assign_role`) — الحَكَمُ نفسُه الذي يردّ الكتابة،
 * فلا شاشةَ تعرض ما لا تسمح به القاعدة.
 */
export default async function UnitPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const denied = await denyUnless("/dashboard/unit");
  if (denied) return denied;

  const admin = await getCurrentAdmin();
  if (!admin) return denied;

  // المدى أوّلًا — فمن لا إدارةَ يبلغها لا تُجلب له الهيكلةُ كلّها ليُقال له «لا شيء لك»
  const scope = await getMyScope(admin.id);
  if (scope.units.length === 0) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="لا إدارة تبلغها">
          هذه الشاشة لمن يعيّن الأعضاء الإداريّين: يضمّهم إلى إداراتهم ويوزّع إشرافهم على لجان
          المجلس التنفيذيّ. وقائدُ اللجنة التنفيذيّة غرفتُه «لجنتي»، ومنسّقُ القسم «قسمي».
        </Alert>
      </>
    );
  }

  // الإدارةُ المعروضة: ما طلبه الرابط إن كان في مداه، وإلّا مقعدُه، وإلّا أوّلُ ما يبلغ.
  const asked = Number((await searchParams).u);
  const current =
    scope.units.find((u) => u.id === asked) ??
    scope.units.find((u) => u.id === scope.unit?.id) ??
    scope.units[0];

  const org = await getOrgData();
  if (org.error) {
    return (
      <>
        <Head unit={current.name} />
        <Alert tone="warning" title="تعذّر جلب الهيكلة">{org.error}</Alert>
      </>
    );
  }

  const unit = adminUnit(current.id, org.committees, org.roles);
  if (!unit) {
    return (
      <>
        <Head unit={current.name} />
        <Alert tone="warning" title="إدارةٌ لا تُصرّح بدور عضوها">
          لا يُعرف من يُعدّ عضوًا في {current.name}: `member_role_name` فارغ في القاعدة.
        </Alert>
      </>
    );
  }

  return (
    <>
      <Head unit={unit.name} />
      {/* المبدّل لمن يبلغ أكثرَ من إدارة — ومن يبلغ واحدةً لا يرى اختيارًا بلا خيار */}
      {scope.units.length > 1 ? <UnitSwitcher units={scope.units} current={unit.id} /> : null}
      <UnitView
        unit={unit}
        seats={buildSeats(unit, org.committees, org.supervision, org.profiles)}
        roster={buildRoster(unit, org.committees, org.userRoles, org.supervision, org.profiles)}
        members={org.members}
      />
    </>
  );
}
