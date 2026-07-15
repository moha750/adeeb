import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";

/** الحدّ الأدنى لمستوى الدور لدخول لوحة الإدارة والإجراءات الحسّاسة.
 *  مطابق لدوال الخلفية الطرفية: role_level ≥ 8 = صفّ الإدارة العليا
 *  (رئيس النادي 10، مستشار 9، رئيس المجلس التنفيذي/قادة الإدارات 8). */
export const ADMIN_MIN = 8;

export type CurrentAdmin = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  roleLevel: number; // أعلى مستوى دور نشط (الأكبر = الأعلى صلاحيةً)
  roleName: string | null;
  isAdmin: boolean; // roleLevel ≥ ADMIN_MIN
};

/**
 * المستخدم الحاليّ من الجلسة + أعلى دور نشط له. `null` إن لم تكن هناك جلسة.
 * نستخدم عميل الجلسة لتحديد الهويّة، ومفتاح الخدمة لقراءة الدور (يتجاوز RLS بأمان خادميّ).
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    // بلا مفتاح خدمة لا نستطيع قراءة الدور — نعامله كغير أدمن (آمن افتراضًا).
    return { id: user.id, email: user.email ?? null, fullName: null, avatarUrl: null, roleLevel: -1, roleName: null, isAdmin: false };
  }
  const svc = createAdeebServiceClient(url, key);

  const [profileRes, rolesRes] = await Promise.all([
    svc.from("profiles").select("full_name, email, avatar_url").eq("id", user.id).maybeSingle(),
    svc.from("user_roles").select("role:roles(role_level, role_name_ar)").eq("user_id", user.id).eq("is_active", true),
  ]);

  // أعلى دور = أكبر role_level بين الأدوار النشطة.
  // الربط المضمّن يُستنتَج مصفوفةً نوعيًّا لكنّه كائن وقت التشغيل (علاقة إلى-واحد) — نتعامل مع الحالتين.
  type Role = { role_level: number; role_name_ar: string };
  const rows = (rolesRes.data ?? []) as unknown as Array<{ role: Role | Role[] | null }>;
  let roleLevel = -1;
  let roleName: string | null = null;
  for (const ur of rows) {
    const role = Array.isArray(ur.role) ? ur.role[0] : ur.role;
    const lvl = role?.role_level ?? -1;
    if (lvl > roleLevel) { roleLevel = lvl; roleName = role?.role_name_ar ?? null; }
  }

  return {
    id: user.id,
    email: profileRes.data?.email ?? user.email ?? null,
    fullName: profileRes.data?.full_name ?? null,
    avatarUrl: profileRes.data?.avatar_url ?? null,
    roleLevel,
    roleName,
    isAdmin: roleLevel >= ADMIN_MIN,
  };
}
