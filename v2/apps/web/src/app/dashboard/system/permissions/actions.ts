"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { DASHBOARD_CAPS } from "@/lib/capabilities";

export type PermResult = { ok: boolean; message: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * منح/سحب قدرةٍ لمنصب — الكتابة الوحيدة على role_permissions من الواجهة.
 *
 * أمن: بوّابة القدرة `manage_permissions` (لا رقم، لا اسم محفور) — هي نفسها تُدار من هذه اللوحة.
 * حارسٌ صلب: لا يُسحب آخر مانحٍ لـ`manage_permissions`، وإلّا أُقفلت اللوحة عن الجميع (طوبة لا رجعة منها).
 * ونطاقٌ صلب: لا تُبدَّل إلّا قدرةٌ تفتح غرفةً في اللوحة (`DASHBOARD_CAPS`) — فما لا يُعرَض لا يُكتب،
 * ولا يُغيَّر قفلٌ خفيٌّ برقمٍ مُلفَّق في الطلب.
 *
 * ملاحظة: هذا يغيّر بيانات الصلاحيات فقط. أثره على الفرض الحقيقيّ:
 * فوريّ على V2 (قدراتيّ أصلًا)، وعلى القاعدة (RLS) حين يكتمل قلب الفرض إلى القدرات.
 */
export async function setCapability(input: {
  roleName: string;
  permissionId: number;
  granted: boolean;
}): Promise<PermResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.caps.includes("manage_permissions")) {
    return { ok: false, message: "لا تملك صلاحية إدارة الصلاحيات." };
  }

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { roleName, permissionId, granted } = input;
  if (!roleName || !permissionId) return { ok: false, message: "لم يُحدَّد المنصب أو القدرة." };

  // القدرة المقصودة — ولا تُبدَّل إلّا إن كانت من قدرات اللوحة (ما تعرضه data.ts نفسه)
  const { data: perm, error: pErr } = await sb.from("permissions").select("permission_key").eq("id", permissionId).maybeSingle();
  if (pErr) return { ok: false, message: `تعذّر التحقّق: ${pErr.message}` };
  const permKey = perm?.permission_key as string | undefined;
  if (!permKey) return { ok: false, message: "القدرة غير موجودة." };
  if (!DASHBOARD_CAPS.includes(permKey)) {
    return { ok: false, message: "هذه القدرة لا تفتح شيئًا في اللوحة." };
  }

  if (granted) {
    // منح — إدراجٌ آمنٌ للتكرار على القيد الفريد `role_permissions_role_name_permission_key`.
    // ولا يُكتب `role_id`: تريغر `sync_role_key` يشتقّه من الاسم، ويرفض اسمًا لا دورَ له
    // (`لا دور باسم %`) — فالاسم المُلفَّق في الطلب يُردّ في القاعدة لا في الواجهة.
    const { error } = await sb
      .from("role_permissions")
      .upsert({ role_name: roleName, permission_id: permissionId }, { onConflict: "role_name,permission_id", ignoreDuplicates: true });
    if (error) return { ok: false, message: `تعذّر المنح: ${error.message}` };
    revalidatePath("/dashboard/system/permissions");
    return { ok: true, message: "مُنحت القدرة." };
  }

  // سحب — حارس آخر مانحٍ لـ manage_permissions
  if (permKey === "manage_permissions") {
    const { count, error: cErr } = await sb
      .from("role_permissions")
      .select("*", { count: "exact", head: true })
      .eq("permission_id", permissionId);
    if (cErr) return { ok: false, message: `تعذّر التحقّق: ${cErr.message}` };
    if ((count ?? 0) <= 1) {
      return { ok: false, message: "لا يمكن سحب آخر صلاحية «إدارة الصلاحيات». ستُقفَل اللوحة عن الجميع." };
    }
  }

  const { error } = await sb.from("role_permissions").delete().eq("role_name", roleName).eq("permission_id", permissionId);
  if (error) return { ok: false, message: `تعذّر السحب: ${error.message}` };
  revalidatePath("/dashboard/system/permissions");
  return { ok: true, message: "سُحبت القدرة." };
}
