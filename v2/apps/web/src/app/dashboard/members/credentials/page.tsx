import { Alert } from "@adeeb/design-system";
import { getMembers } from "../data";
import { CredentialsView, type CredMember } from "./CredentialsView";
import { denyUnless } from "@/app/dashboard/_shell/guard";

const Head = () => (
  <div className="ash-phead">
    <div>
      <div className="ash-crumb">أديب › أعضاء أديب › <b>بيانات الدخول</b></div>
      <h1>تغيير بيانات الدخول</h1>
    </div>
  </div>
);

export default async function CredentialsPage() {
  const denied = await denyUnless("/dashboard/members/credentials");
  if (denied) return denied;

  const { members, error } = await getMembers();

  if (error) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب الأعضاء">{error}</Alert>
      </>
    );
  }

  const lite: CredMember[] = members
    .map((m) => ({ id: m.id, name: m.name, email: m.email, avatar: m.avatar, gender: m.gender, status: m.status }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return (
    <>
      <Head />
      {/* حارس الهوية: تنسيقات `.cred-*` مؤقّتة — موسومة للإعادة تصميمها بمكوّنات الهوية */}
      <div data-needs="مكوّنات بيانات الدخول (بطاقة العضو/أدوات كلمة المرور)">
        <CredentialsView members={lite} />
      </div>
    </>
  );
}
