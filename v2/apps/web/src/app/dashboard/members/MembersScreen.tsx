import { Alert } from "@adeeb/design-system";
import { getMembers, type MemberStatus } from "./data";
import { MembersView } from "./MembersView";

/** شاشة الأعضاء الخادمية — تجلب البيانات وتمرّرها للعرض (اختياريًّا مثبّتة على حالة). */
export async function MembersScreen({ lockedStatus }: { lockedStatus?: MemberStatus }) {
  const { members, error } = await getMembers();

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

  return <MembersView members={members} lockedStatus={lockedStatus} />;
}
