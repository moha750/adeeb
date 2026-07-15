"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";

export type ActionResult = { ok: boolean; message: string; code?: string; currentUserId?: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * إسناد/إحلال منصب — عبر الدالّة الذرّيّة assign_position (SECURITY DEFINER).
 * الدالّة تفرض الصلاحية والنطاق والتفرّد خادميًّا؛ نمرّر هويّة الأدمن كـ p_actor للتدقيق ودفاع العمق.
 */
export async function assignPosition(input: {
  userId: string;
  roleId: number;
  committeeId?: number | null;
  departmentId?: number | null;
  replace?: boolean;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.isAdmin) return { ok: false, message: "لا تملك صلاحية إدارة الهيكلة." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("assign_position", {
    p_actor: admin.id,
    p_user: input.userId,
    p_role: input.roleId,
    p_committee: input.committeeId ?? null,
    p_department: input.departmentId ?? null,
    p_replace: input.replace ?? false,
  });
  if (error) return { ok: false, message: `تعذّر الإسناد: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string; code?: string; current_user_id?: string };
  if (r.ok) { revalidatePath("/dashboard/members/structure"); revalidatePath("/dashboard/members/assignments"); }
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "تمّ." : "تعذّر الإسناد."), code: r.code, currentUserId: r.current_user_id };
}

/**
 * إزالة منصب — إلغاء تفعيل التعيين (لا حذف صلب). قد يسحب ترشّحًا انتخابيًّا نشطًا (تريغر قاعدة).
 * رئيس النادي محميّ من الإزالة من هنا.
 */
export async function removePosition(input: {
  userId: string;
  roleId: number;
  committeeId?: number | null;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.isAdmin) return { ok: false, message: "لا تملك صلاحية إدارة الهيكلة." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data: role } = await sb.from("roles").select("role_name").eq("id", input.roleId).maybeSingle();
  if (role?.role_name === "club_president") return { ok: false, message: "لا يمكن إزالة رئيس النادي من هنا." };

  let q = sb
    .from("user_roles")
    .update({ is_active: false })
    .eq("user_id", input.userId)
    .eq("role_id", input.roleId)
    .eq("is_active", true);
  q = input.committeeId == null ? q.is("committee_id", null) : q.eq("committee_id", input.committeeId);

  const { error } = await q;
  if (error) return { ok: false, message: `تعذّرت الإزالة: ${error.message}` };

  revalidatePath("/dashboard/members/structure");
  revalidatePath("/dashboard/members/assignments");
  return { ok: true, message: "تمّت الإزالة." };
}

/**
 * تحرير البيانات الوصفيّة لوحدة تنظيميّة — الوصف ورابط قروب الواتساب فقط (الاسم غير قابل للتعديل).
 * منخفض الخطر (لا يمسّ التعيينات ولا سلامة الهيكل).
 */
export async function updateOrgUnit(input: {
  kind: "council" | "department" | "committee";
  id: string | number;
  description?: string | null;
  groupLink?: string | null;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.isAdmin) return { ok: false, message: "لا تملك صلاحية تعديل الهيكلة." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const link = input.groupLink?.trim() || null;
  if (link && !/^https?:\/\/\S+$/i.test(link)) return { ok: false, message: "رابط القروب غير صالح (يبدأ بـ http/https)." };

  const patch = { description: input.description?.trim() || null, group_link: link };
  const table = input.kind === "council" ? "councils" : input.kind === "department" ? "departments" : "committees";

  const { error } = await sb.from(table).update(patch).eq("id", input.id);
  if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };

  revalidatePath("/dashboard/members/structure");
  return { ok: true, message: "حُفظت البيانات." };
}
