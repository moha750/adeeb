import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getAuthority } from "./data";
import { AuthorityRoom } from "@/app/_ad/rooms/AuthorityRoom";

/**
 * لوحةُ السلطة — تعديلُ حدود المناصب من الشاشة لا بـSQL.
 *
 * قفلُها `manage_permissions` كلوحة الصلاحيات: من يملك توزيع القدرات يملك رسم الحدود.
 * وهي مرآةُ جدولين تقرؤهما القاعدة وحدها (`position_authority` · `membership_authority`)،
 * فلا حكمَ يُستنسَخ هنا — ما تُظهره الشاشة هو ما تحكم به `can_assign_role`.
 * على قالب «الحساب» منذ ٢٠٢٦-١١-١٤ (`_ad/rooms/AuthorityRoom`)؛ والقديمُ (`./AuthorityBoard`) باقٍ بلا استعمال حتى التنظيف.
 */
export const metadata = { title: "السلطة، بوّابة أدِيب" };

export default async function AuthorityPage() {
  const denied = await denyUnless("/dashboard/system/authority");
  if (denied) return denied;
  const { roles, position, membership, error } = await getAuthority();
  return <AuthorityRoom roles={roles} position={position} membership={membership} error={error} />;
}
