import { getMembers } from "../data";
import { CredentialsRoom, type CredMember } from "@/app/_ad/rooms/CredentialsRoom";
import { denyUnless } from "@/app/dashboard/_shell/guard";

/** على قالب «النموذج» منذ ٢٠٢٦-١١-١٣ (`_ad/rooms/CredentialsRoom`)؛ والقديمُ (`./CredentialsView`) يقرؤه المختبرُ للمقارنة. */
export const metadata = { title: "تغيير بيانات الدخول، بوّابة أدِيب" };

export default async function CredentialsPage() {
  const denied = await denyUnless("/dashboard/members/credentials");
  if (denied) return denied;

  const { members, error } = await getMembers();
  if (error) return <CredentialsRoom members={[]} error={error} />;

  // السارون وحدهم يُفتَح لهم باب: مفتاحُ من غادر لا يُبدَّل، ومن لم يُكمل تسجيله بابُه
  // «قيد الإكمال» لا هذا. والقاعدة واحدةٌ في اللوحة كلّها — لا كشفَ أعضاءٍ إلا للعضويّة
  // السارية، إلّا تبويبًا يُسمّي حالتَه في عنوانه.
  const lite: CredMember[] = members
    .filter((m) => m.status === "active")
    .map((m) => ({ id: m.id, name: m.name, email: m.email, avatar: m.avatar, gender: m.gender }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return <CredentialsRoom members={lite} />;
}
