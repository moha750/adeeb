"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { describeCandidates, type ActingCandidate } from "@/lib/actingCandidates";
import { isCatalogIcon } from "@/lib/unitIconCatalog";

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
 * وقد يسحب ترشّحًا انتخابيًّا نشطًا (تريغر قاعدة). رئيس أدِيب محميّ.
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

/* ══ التكليف (20261010) ═════════════════════════════════════════════════════════════════
 * مقعدٌ مؤقّتٌ فوق المنصب الأصيل. الأبوابُ الثلاثة تنادي دوالَّ القاعدة بمفتاح الخدمة، وهي الحَكَم:
 * `assign_acting` و`extend_acting` و`end_acting`. والبوّابةُ هنا ترشيحٌ سريع كأخواتها، لا حكم. */

export type { ActingCandidate } from "@/lib/actingCandidates";

/**
 * بِركةُ التكليف لهذا الدور على يد هذا المُنفّذ — تُسأل عنها القاعدة (`actable_members`) لا تُحسَب هنا:
 * أعضاءٌ أحياء لا تكليفَ لهم الآن، تبلغهم يدُه، ولا يُكلَّف عضو إدارةٍ بمقعدٍ تشغيليّ. وتُجلب عند فتح
 * النافذة لأنّها تتبع الدور، ومعها موضعُ كلٍّ الأصيل (`describeCandidates`).
 */
export async function loadActingCandidates(roleName: string): Promise<{ ok: boolean; message?: string; members: ActingCandidate[] }> {
  const admin = await getCurrentAdmin();
  if (!admin || !mayAssign(admin.caps)) return { ok: false, message: "لا تملك صلاحية التكليف.", members: [] };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة).", members: [] };

  const pool = await sb.rpc("actable_members", { p_actor: admin.id, p_role_name: roleName });
  if (pool.error) return { ok: false, message: `تعذّر جلب المرشّحين: ${pool.error.message}`, members: [] };
  const r = await describeCandidates(sb, (pool.data ?? []) as string[]);
  if (r.error) return { ok: false, message: `تعذّر جلب المرشّحين: ${r.error}`, members: [] };
  return { ok: true, members: r.members };
}

/** تكليفٌ بمقعد — `assign_acting`. آخرُ يومٍ إلزاميّ إلّا على مقعدٍ مجمَّد (ينتهي بعودة صاحبه). */
export async function assignActing(input: {
  userId: string;
  roleName: string;
  committeeId?: number | null;
  departmentId?: number | null;
  until: string | null;
  freeze: boolean;
  reason: string;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !mayAssign(admin.caps)) return { ok: false, message: "لا تملك صلاحية التكليف." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };
  if (input.reason.trim().length < 5) return { ok: false, message: "اكتب سبب التكليف، خمسة أحرفٍ فأكثر." };

  const { data, error } = await sb.rpc("assign_acting", {
    p_actor: admin.id,
    p_user: input.userId,
    p_role_name: input.roleName,
    p_committee: input.committeeId ?? null,
    p_department: input.departmentId ?? null,
    p_until: input.until,
    p_freeze: input.freeze,
    p_reason: input.reason.trim(),
  });
  if (error) return { ok: false, message: `تعذّر التكليف: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string; code?: string };
  if (r.ok) { revalidateAll(); revalidatePath("/"); }
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "تمّ التكليف." : "تعذّر التكليف."), code: r.code };
}

/** تعديل آخر يومٍ في التكليف — `extend_acting`. والتابعُ لا تاريخ له (ينتهي بعودة صاحب المقعد). */
export async function extendActing(input: { rowId: number; until: string }): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !mayAssign(admin.caps)) return { ok: false, message: "لا تملك صلاحية التكليف." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("extend_acting", { p_actor: admin.id, p_row: input.rowId, p_until: input.until });
  if (error) return { ok: false, message: `تعذّر التعديل: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string; code?: string };
  if (r.ok) revalidateAll();
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "عُدِّل آخر يوم." : "تعذّر التعديل."), code: r.code };
}

/** إنهاء التكليف قبل أجله — `end_acting`. يعود الأصيل المجمَّد، وينتهي التابعون. */
export async function endActing(input: { rowId: number }): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !mayAssign(admin.caps)) return { ok: false, message: "لا تملك صلاحية التكليف." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("end_acting", { p_actor: admin.id, p_row: input.rowId });
  if (error) return { ok: false, message: `تعذّر الإنهاء: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string; code?: string };
  if (r.ok) { revalidateAll(); revalidatePath("/"); }
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "انتهى التكليف." : "تعذّر الإنهاء."), code: r.code };
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
 * تحرير البيانات الوصفيّة لوحدة تنظيميّة — الأيقونةُ والوصفُ ورابطُ قروب الواتساب (الاسم غير قابل للتعديل).
 * والوصفُ والرابطُ إلزاميّان هنا وفي الإنشاء (المالك ٢٠٢٦-١٠-١١)، والأيقونةُ اختياريّة.
 * منخفض الخطر (لا يمسّ التعيينات ولا سلامة الهيكل). وبابُه نافذةُ «تعديل الوحدة» في «تعيين المناصب»
 * (٢٠٢٦-١٠-١٠)، والقفلُ `manage_positions` كما كان.
 *
 * والأيقونةُ للقسم واللجنة وحدهما (المجلسُ لا عمودَ له)، ومفتاحُها من مكتبة الأيقونات (`lib/unitIconCatalog.ts`)
 * أو فارغ: مفتاحٌ لا تعرفه المكتبةُ يُردّ هنا، فلا يُخزَّن ما سيُرسم عامًّا بلا علم صاحبه.
 */
export async function updateOrgUnit(input: {
  kind: "council" | "department" | "committee";
  id: string | number;
  description?: string | null;
  groupLink?: string | null;
  icon?: string | null;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.caps.includes("manage_positions")) return { ok: false, message: "لا تملك صلاحية تعديل الهيكلة." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  // الوصفُ والرابطُ إلزاميّان (المالك ٢٠٢٦-١٠-١١)
  const description = input.description?.trim() || null;
  const link = input.groupLink?.trim() || null;
  if (!description) return { ok: false, message: "الوصف مطلوب." };
  if (!link) return { ok: false, message: "رابط قروب الواتساب مطلوب." };
  if (!/^https?:\/\/\S+$/i.test(link)) return { ok: false, message: "رابط القروب غير صالح (يبدأ بـ http/https)." };

  if (input.icon !== undefined && input.kind === "council") return { ok: false, message: "المجلس لا أيقونةَ له." };
  if (input.icon != null && !isCatalogIcon(input.icon)) return { ok: false, message: "أيقونةٌ غير معروفة." };

  const patch: { description: string | null; group_link: string | null; icon?: string | null } = {
    description, group_link: link,
  };
  if (input.icon !== undefined) patch.icon = input.icon;
  const table = input.kind === "council" ? "councils" : input.kind === "department" ? "departments" : "committees";

  const { error } = await sb.from(table).update(patch).eq("id", input.id);
  if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };

  revalidatePath("/dashboard/members/structure");
  revalidatePath("/dashboard/members/assignments");
  return { ok: true, message: "حُفظت البيانات." };
}

/**
 * **إنشاء وحدة** — قسمٌ في المجلس التشغيليّ، أو لجنةٌ في قسم (المالك ٢٠٢٦-١٠-١١). بابُه نافذةُ الوحدة نفسُها
 * في «تعيين المناصب»، وقفلُه `manage_positions` كالتعديل.
 *
 * والمقاعدُ لا تُنشأ هنا: تُشتقّ من الوحدة (`buildPositions`)، فالقسمُ الجديد يولد بمقعد منسّقٍ شاغر، واللجنةُ
 * بمقعدَي القائد والنائب شاغرَين. واللجنةُ تأخذ مجلسَ قسمها (تريغرُ القاعدة يرفض المخالفة) ودورَي اللجان
 * التشغيليّة؛ فلجانُ المجلس الإداريّ (الإدارات) ليست من هذا الباب. والقسمُ آخرُ الأقسام ترتيبًا.
 */
export async function createOrgUnit(input: {
  kind: "department" | "committee";
  name: string;
  departmentId?: number | null;
  description?: string | null;
  groupLink?: string | null;
  icon?: string | null;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.caps.includes("manage_positions")) return { ok: false, message: "لا تملك صلاحية تعديل الهيكلة." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 60) return { ok: false, message: "الاسم بين ٣ و٦٠ حرفًا." };
  const description = input.description?.trim() || null;
  const link = input.groupLink?.trim() || null;
  if (!description) return { ok: false, message: "الوصف مطلوب." };
  if (!link) return { ok: false, message: "رابط قروب الواتساب مطلوب." };
  if (!/^https?:\/\/\S+$/i.test(link)) return { ok: false, message: "رابط القروب غير صالح (يبدأ بـ http/https)." };
  if (input.icon != null && !isCatalogIcon(input.icon)) return { ok: false, message: "أيقونةٌ غير معروفة." };
  const meta = { description, group_link: link, icon: input.icon ?? null };

  if (input.kind === "department") {
    const last = await sb.from("departments").select("display_order").order("display_order", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (last.error) return { ok: false, message: `تعذّر الحفظ: ${last.error.message}` };
    const { error } = await sb.from("departments").insert({ name_ar: name, council_id: "executive", display_order: (last.data?.display_order ?? 0) + 1, ...meta });
    if (error) return { ok: false, message: error.code === "23505" ? "يوجد قسمٌ بهذا الاسم." : `تعذّر الحفظ: ${error.message}` };
  } else {
    if (input.departmentId == null) return { ok: false, message: "اللجنة تُضاف إلى قسم." };
    const dept = await sb.from("departments").select("id, council_id").eq("id", input.departmentId).eq("is_active", true).maybeSingle();
    if (dept.error) return { ok: false, message: `تعذّر الحفظ: ${dept.error.message}` };
    if (!dept.data) return { ok: false, message: "القسم غير موجود." };
    const { error } = await sb.from("committees").insert({
      committee_name_ar: name, department_id: dept.data.id, council_id: dept.data.council_id,
      leader_role_name: "committee_leader", member_role_name: "committee_member", supervises: false, ...meta,
    });
    if (error) return { ok: false, message: error.code === "23505" ? "توجد لجنةٌ بهذا الاسم." : `تعذّر الحفظ: ${error.message}` };
  }

  revalidateAll();
  return { ok: true, message: input.kind === "department" ? "أُضيف القسم." : "أُضيفت اللجنة." };
}
