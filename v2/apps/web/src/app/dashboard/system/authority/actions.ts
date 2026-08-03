"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";

export type AuthResult = { ok: boolean; message: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/** بوّابةٌ واحدة للكتابتين: القدرة التي تحكم لوحة الصلاحيات تحكم لوحة السلطة. */
async function gate() {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.caps.includes("manage_permissions")) {
    return { admin: null, sb: null, err: "لا تملك صلاحية إدارة الصلاحيات." as string };
  }
  const sb = service();
  if (!sb) return { admin, sb: null, err: "إعداد الخادم ناقص (مفتاح الخدمة)." as string };
  return { admin, sb, err: null };
}

/** ثلاثيّةُ المقعد: لا يبلغه · يبلغه في كلّ النادي · يبلغه في وحدته وحدها. */
export type SeatMode = "none" | "all" | "own";

/**
 * ضبطُ ما يبلغه دورٌ من المقاعد — الكتابة الوحيدة على `position_authority` من الواجهة.
 *
 * حارسان صلبان:
 *   · لا يُنزَع آخرُ من يبلغ `club_president`، وإلّا صار مقعدُ الرئاسة لا يُسنَد أبدًا
 *     (طوبةٌ لا رجعة منها، كحارس آخر مانحٍ لـ`manage_permissions`).
 *   · الأسماء تُفحَص في `roles` — فلا اسمٌ مُلفَّقٌ في الطلب يُكتب في المصفوفة.
 *
 * والصفُّ يُنشأ عند أوّل منحٍ ويُحذف حين يخلو — فمن لا صفَّ له لا سلطةَ له، والتريغر
 * يزرع مفتاح التبويب (`assign_positions`) ويقلعه تبعًا لذلك.
 */
export async function setSeatAuthority(input: {
  roleName: string;
  targetRole: string;
  mode: SeatMode;
}): Promise<AuthResult> {
  const { sb, err } = await gate();
  if (err || !sb) return { ok: false, message: err ?? "تعذّر." };

  const { roleName, targetRole, mode } = input;
  if (!roleName || !targetRole) return { ok: false, message: "لم يُحدَّد المنصب أو المقعد." };

  const { data: known, error: kErr } = await sb.from("roles").select("role_name").in("role_name", [roleName, targetRole]);
  if (kErr) return { ok: false, message: `تعذّر التحقّق: ${kErr.message}` };
  if ((known ?? []).length < (roleName === targetRole ? 1 : 2)) return { ok: false, message: "منصبٌ غير موجود." };

  const { data: rows, error: gErr } = await sb.from("position_authority").select("role_name, target_roles, own_unit_roles, blocked_roles");
  if (gErr) return { ok: false, message: `تعذّر الجلب: ${gErr.message}` };

  const mine = (rows ?? []).find((r) => r.role_name === roleName);
  const targets = new Set<string>((mine?.target_roles as string[]) ?? []);
  const ownUnit = new Set<string>((mine?.own_unit_roles as string[]) ?? []);

  // حارس مقعد الرئاسة: من يبلغه غيري؟
  if (targetRole === "club_president" && mode === "none") {
    const others = (rows ?? []).filter((r) => r.role_name !== roleName && ((r.target_roles as string[]) ?? []).includes("club_president"));
    if (targets.has("club_president") && others.length === 0) {
      return { ok: false, message: "لا يمكن نزع آخر من يبلغ مقعد رئيس النادي — لن يُسنَد بعدها أبدًا." };
    }
  }

  if (mode === "none") { targets.delete(targetRole); ownUnit.delete(targetRole); }
  if (mode === "all")  { targets.add(targetRole);    ownUnit.delete(targetRole); }
  if (mode === "own")  { targets.add(targetRole);    ownUnit.add(targetRole); }

  const blocked = ((mine?.blocked_roles as string[]) ?? []);
  const empty = targets.size === 0 && blocked.length === 0;

  if (empty && mine) {
    const { error } = await sb.from("position_authority").delete().eq("role_name", roleName);
    if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };
  } else if (!empty) {
    const { error } = await sb.from("position_authority").upsert(
      { role_name: roleName, target_roles: [...targets], own_unit_roles: [...ownUnit], blocked_roles: blocked },
      { onConflict: "role_name" },
    );
    if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };
  }

  revalidatePath("/dashboard/system/authority");
  return { ok: true, message: "حُفظ." };
}

/** ضبطُ من لا تطوله يدُ دورٍ عند السحب (`blocked_roles`). */
export async function setBlockedRole(input: {
  roleName: string;
  blockedRole: string;
  on: boolean;
}): Promise<AuthResult> {
  const { sb, err } = await gate();
  if (err || !sb) return { ok: false, message: err ?? "تعذّر." };

  const { roleName, blockedRole, on } = input;
  const { data: mine, error: gErr } = await sb
    .from("position_authority").select("target_roles, own_unit_roles, blocked_roles").eq("role_name", roleName).maybeSingle();
  if (gErr) return { ok: false, message: `تعذّر الجلب: ${gErr.message}` };
  if (!mine) return { ok: false, message: "هذا المنصب لا يُسنِد شيئًا — امنحه مقعدًا أوّلًا." };

  const blocked = new Set<string>((mine.blocked_roles as string[]) ?? []);
  if (on) blocked.add(blockedRole); else blocked.delete(blockedRole);

  const { error } = await sb.from("position_authority").update({ blocked_roles: [...blocked] }).eq("role_name", roleName);
  if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };

  revalidatePath("/dashboard/system/authority");
  return { ok: true, message: "حُفظ." };
}

/**
 * ضبطُ مدى سلطة العضويّة (الإنهاء والاستعادة وتعديل البيانات) — جدولٌ آخر وبابٌ آخر.
 * `none` تعني حذف الصفّ: من لا صفَّ له في `membership_authority` لا يبلغ أحدًا.
 */
export async function setMembershipScope(input: {
  roleName: string;
  scope: "all" | "supervised" | "none";
}): Promise<AuthResult> {
  const { sb, err } = await gate();
  if (err || !sb) return { ok: false, message: err ?? "تعذّر." };

  const { roleName, scope } = input;
  if (scope === "none") {
    const { count } = await sb.from("membership_authority").select("*", { count: "exact", head: true }).eq("scope", "all");
    const { data: mine } = await sb.from("membership_authority").select("scope").eq("role_name", roleName).maybeSingle();
    // حارس: لا يبقى النادي بلا من يُنهي عضويّةً أصلًا
    if (mine?.scope === "all" && (count ?? 0) <= 1) {
      return { ok: false, message: "لا يمكن نزع آخر سلطةٍ لإنهاء العضويّة." };
    }
    const { error } = await sb.from("membership_authority").delete().eq("role_name", roleName);
    if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };
  } else {
    const { error } = await sb.from("membership_authority")
      .upsert({ role_name: roleName, scope }, { onConflict: "role_name" });
    if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };
  }

  revalidatePath("/dashboard/system/authority");
  return { ok: true, message: "حُفظ." };
}

/** ضبطُ من يُحجب عن سلطة العضويّة (`membership_authority.blocked_roles`). */
export async function setMembershipBlocked(input: {
  roleName: string;
  blockedRole: string;
  on: boolean;
}): Promise<AuthResult> {
  const { sb, err } = await gate();
  if (err || !sb) return { ok: false, message: err ?? "تعذّر." };

  const { roleName, blockedRole, on } = input;
  const { data: mine, error: gErr } = await sb
    .from("membership_authority").select("blocked_roles").eq("role_name", roleName).maybeSingle();
  if (gErr) return { ok: false, message: `تعذّر الجلب: ${gErr.message}` };
  if (!mine) return { ok: false, message: "هذا المنصب لا يبلغ أحدًا — امنحه مدًى أوّلًا." };

  const blocked = new Set<string>((mine.blocked_roles as string[]) ?? []);
  if (on) blocked.add(blockedRole); else blocked.delete(blockedRole);

  const { error } = await sb.from("membership_authority").update({ blocked_roles: [...blocked] }).eq("role_name", roleName);
  if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };

  revalidatePath("/dashboard/system/authority");
  return { ok: true, message: "حُفظ." };
}
