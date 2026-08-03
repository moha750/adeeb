import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMembers } from "../data";
import { getOrgData } from "../structure/orgData";
import { myCommittees } from "./model";
import { SupervisedView } from "./SupervisedView";
import { Breadcrumb } from "../../_shell/Breadcrumb";

/**
 * «من أشرف عليهم» — غرفةُ من لا يملك سجلّ الأعضاء كلّه.
 *
 * **مرشَّحةٌ بالإشراف لا بالسلطة** (`committee_supervision`): أعضاء اللجان التي أُسنِدت إليه.
 * كانت تُرشَّح بـ`canEnd` — جوابِ السلطة — فكانت تُسقط قائد اللجنة ونائبها وتُفرِغ الشاشةَ كلَّها
 * عن مشرف الضمان الذي يرى ولا يُنهي. (والقيادة دخلت السلطة بعدُ في 20260802 — والبناءُ على
 * الإشراف يبقى صوابًا: السؤال «من أشرف عليه» لا «من أملك عليه».)
 *
 * والسلطةُ لم تسقط، بل صارت طبقةً فوق العرض: كلّ صفٍّ يحمل `canEnd`/`canEdit` من القاعدة
 * نفسها، فالأفعال تظهر حيث تقول نعم — إخفاءٌ **فوق** منعٍ لا بدلًا منه.
 */
export default async function SupervisedMembersPage() {
  const denied = await denyUnless("/dashboard/members/supervised");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return denied;

  const [{ members, error }, org] = await Promise.all([getMembers(), getOrgData()]);
  const failed = error ?? org.error;
  if (failed) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb />
            <h1>من أشرف عليهم</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب البيانات">{failed}</Alert>
      </>
    );
  }

  const { unit, list } = myCommittees(me.id, org.committees, org.departments, org.roles, org.userRoles, org.supervision, org.profiles);
  // أعضاء لجانه — بأعيانهم لا بحكمٍ يُعاد حسابه هنا: النموذج قرأ الصفوف، والجدول يعرض صفوفهم
  const ids = new Set(list.flatMap((c) => c.members.map((m) => m.userId)));

  return (
    <SupervisedView
      unit={unit}
      committees={list}
      members={members.filter((m) => ids.has(m.id))}
      mayManageData={me.caps.includes("manage_member_data")}
    />
  );
}
