"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";

export type ActionResult = { ok: boolean; message: string; code?: string; currentUserId?: string };

/**
 * بوّابة أوّليّة للإسناد والإزالة — **ترشيحٌ سريع لا حكم**. الحكم الدقيق (أيّ دور
 * في أيّ نطاق) في القاعدة وحدها: `can_assign_role` تقرؤها `assign_position`
 * و`revoke_position` معًا. فمن مرّ من هنا بلا سلطةٍ حقيقيّة ردّته القاعدة.
 *
 * البابان: `assign_positions` (تُشتقّ من `position_authority` — من له صفُّ سلطةٍ له المفتاح) ·
 * `assign_unit_members` (قائد وحدةٍ يوزّع دور عضوها من شاشة «إدارتي»).
 */
const MAY_ASSIGN = ["assign_positions", "assign_unit_members"];
const mayAssign = (caps: readonly string[]) => caps.some((c) => MAY_ASSIGN.includes(c));

/** المسارات التي تعرض التعيينات — تُبطَل معًا بعد كلّ إسنادٍ أو إزالة (ومنها تبويبات
 *  الهويّة الثلاثة: تعرض ما يُسنَد ولو لم تُسنِده هي). */
const TOUCHED = [
  "/dashboard/members/structure", "/dashboard/members/assignments",
  "/dashboard/unit", "/dashboard/department", "/dashboard/committee",
  // وكشوفُ الأعضاء معها: صفُّ العضو يحمل دورَه ولجنتَه، فالإسناد (والنقلُ من قائمته) يغيّر ما تعرضه.
  "/dashboard/members/active", "/dashboard/members/suspended",
];
const revalidateAll = () => TOUCHED.forEach((p) => revalidatePath(p));

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
  roleName: string;
  committeeId?: number | null;
  departmentId?: number | null;
  replace?: boolean;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !mayAssign(admin.caps)) return { ok: false, message: "لا تملك صلاحية إدارة الهيكلة." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("assign_position", {
    p_actor: admin.id,
    p_user: input.userId,
    p_role_name: input.roleName,
    p_committee: input.committeeId ?? null,
    p_department: input.departmentId ?? null,
    p_replace: input.replace ?? false,
  });
  if (error) return { ok: false, message: `تعذّر الإسناد: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string; code?: string; current_user_id?: string };
  if (r.ok) revalidateAll();
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "تمّ." : "تعذّر الإسناد."), code: r.code, currentUserId: r.current_user_id };
}

/**
 * إزالة منصب — عبر `revoke_position`، نظيرة `assign_position`. إلغاء تفعيل لا حذف صلب،
 * وقد يسحب ترشّحًا انتخابيًّا نشطًا (تريغر قاعدة). رئيس النادي محميّ.
 *
 * كانت تحديثًا مباشرًا على `user_roles` بمفتاح الخدمة — فضوابطُ الإزالة تُكتب هنا وضوابطُ
 * الإسناد في القاعدة، وبابان لفعلين متناظرين يفترقان يومًا. الآن يقرأ الفعلان الحَكَم نفسه.
 */
export async function removePosition(input: {
  userId: string;
  roleName: string;
  committeeId?: number | null;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !mayAssign(admin.caps)) return { ok: false, message: "لا تملك صلاحية إدارة الهيكلة." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("revoke_position", {
    p_actor: admin.id,
    p_user: input.userId,
    p_role_name: input.roleName,
    p_committee: input.committeeId ?? null,
  });
  if (error) return { ok: false, message: `تعذّرت الإزالة: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string; code?: string };
  if (r.ok) revalidateAll();
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "تمّت الإزالة." : "تعذّرت الإزالة."), code: r.code };
}

/**
 * توزيع الإشراف — `assign_supervision`. **ليست إسنادَ منصب:** لا تكتب في `user_roles` بل
 * في `committee_supervision`، وتشترط أن يكون العضو في الإدارة أصلًا (فالضمّ سابقٌ للتوزيع).
 * والحَكَم واحد: الدالّة تقرأ `can_assign_role` نفسها التي يقرؤها الإسناد.
 */
export async function assignSupervision(input: {
  userId: string;
  committeeId: number;
  unitId: number;
  replace?: boolean;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !mayAssign(admin.caps)) return { ok: false, message: "لا تملك صلاحية توزيع الإشراف." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("assign_supervision", {
    p_actor: admin.id,
    p_user: input.userId,
    p_committee: input.committeeId,
    p_unit: input.unitId,
    p_replace: input.replace ?? false,
  });
  if (error) return { ok: false, message: `تعذّر التوزيع: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string; code?: string; current_user_id?: string };
  if (r.ok) revalidateAll();
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "تمّ." : "تعذّر التوزيع."), code: r.code, currentUserId: r.current_user_id };
}

/** سحب الإشراف — نظيرة `assignSupervision`، وتقرأ الحَكَم نفسه. حذفٌ صلب: تكليفٌ لا منصب. */
export async function revokeSupervision(input: {
  userId: string;
  committeeId: number;
  unitId: number;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !mayAssign(admin.caps)) return { ok: false, message: "لا تملك صلاحية توزيع الإشراف." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("revoke_supervision", {
    p_actor: admin.id,
    p_user: input.userId,
    p_committee: input.committeeId,
    p_unit: input.unitId,
  });
  if (error) return { ok: false, message: `تعذّر السحب: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string; code?: string };
  if (r.ok) revalidateAll();
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "سُحب الإشراف." : "تعذّر السحب."), code: r.code };
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
  if (!admin || !admin.caps.includes("manage_positions")) return { ok: false, message: "لا تملك صلاحية تعديل الهيكلة." };
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
