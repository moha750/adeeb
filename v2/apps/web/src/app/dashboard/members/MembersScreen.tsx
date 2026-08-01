import { Alert } from "@adeeb/design-system";
import { getCurrentAdmin } from "@/lib/auth";
import { getMembers, type MemberStatus } from "./data";
import { MembersView } from "./MembersView";

/**
 * شاشة الأعضاء الخادمية — تجلب البيانات وتمرّرها للعرض (اختياريًّا مثبّتة على حالة).
 *
 * ولا نطاقَ «reach» هنا بعد اليوم: «من أشرف عليهم» صارت شاشةً قائمةً بنفسها تُبنى على
 * **الإشراف** (`committee_supervision`) لا على السلطة، فترشيحُها ليس ترشيحَ حالةٍ يُحشر في هذه.
 */
export async function MembersScreen({ lockedStatus }: { lockedStatus?: MemberStatus }) {
  const [{ members, error }, me] = await Promise.all([getMembers(), getCurrentAdmin()]);

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <div className="ash-crumb">أديب › أعضاء أديب › <b>الأعضاء</b></div>
            <h1>الأعضاء</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الأعضاء">{error}</Alert>
      </>
    );
  }

  const caps = me?.caps ?? [];

  return (
    <MembersView
      members={members}
      lockedStatus={lockedStatus}
      // بنودُ القائمة تتبع مفاتيح صاحبها: من لا يملك `manage_member_data` لا يُعرَض له
      // «تعديل البيانات» — فالقاعدة تردّه، والوعدُ المردود لا يُعرَض.
      mayManageData={caps.includes("manage_member_data")}
    />
  );
}
