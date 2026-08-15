import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getAuthority } from "./data";
import { AuthorityBoard } from "./AuthorityBoard";
import { PageHeader } from "../../_components/PageHeader";

const Head = () => (
  <PageHeader title="لوحة السلطة" />
);

/**
 * لوحةُ السلطة — تعديلُ حدود المناصب من الشاشة لا بـSQL.
 *
 * قفلُها `manage_permissions` كلوحة الصلاحيات: من يملك توزيع القدرات يملك رسم الحدود.
 * وهي مرآةُ جدولين تقرؤهما القاعدة وحدها (`position_authority` · `membership_authority`)،
 * فلا حكمَ يُستنسَخ هنا — ما تُظهره الشاشة هو ما تحكم به `can_assign_role`.
 */
export default async function AuthorityPage() {
  const denied = await denyUnless("/dashboard/system/authority");
  if (denied) return denied;

  const { roles, position, membership, error } = await getAuthority();

  if (error) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب السلطة">{error}</Alert>
      </>
    );
  }

  return (
    <>
      <Head />
      <AuthorityBoard roles={roles} position={position} membership={membership} />
    </>
  );
}
