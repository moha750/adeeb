import { Alert } from "@adeeb/design-system";
import { getMembers } from "../data";
import { CredentialsView, type CredMember } from "./CredentialsView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";

const Head = () => (
  <PageHeader title="تغيير بيانات الدخول" />
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

  // السارون وحدهم يُفتَح لهم باب: مفتاحُ من غادر لا يُبدَّل، ومن لم يُكمل تسجيله بابُه
  // «قيد الإكمال» لا هذا. والقاعدة واحدةٌ في اللوحة كلّها — لا كشفَ أعضاءٍ إلا للعضويّة
  // السارية، إلّا تبويبًا يُسمّي حالتَه في عنوانه.
  const lite: CredMember[] = members
    .filter((m) => m.status === "active")
    .map((m) => ({ id: m.id, name: m.name, email: m.email, avatar: m.avatar, gender: m.gender }))
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
