"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdeebServiceClient } from "@adeeb/core";
import { getSessionAdmin } from "@/lib/auth";
import { VIEW_AS_CAP, VIEW_AS_COOKIE } from "@/lib/view-as";
import { ensurePreviewUser, seatPreview, seatScope, vacatePreviewSeats } from "@/lib/preview-seat";

export type ViewAsResult = { ok: boolean; message: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/** الكوكي وحدَه — تُستعمَل حيث فُحص الإذن سلفًا. */
async function wearIdentity(userId: string) {
  (await cookies()).set(VIEW_AS_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 2, // ساعتان — المعاينة جلسةُ فحصٍ لا حالةٌ دائمة، فتنتهي بنفسها
  });
}

/**
 * بدء المعاينة — استعارةُ هويّة عضوٍ قائم.
 *
 * الحارس **`getSessionAdmin`** لا `getCurrentAdmin`: لو قرأنا الهويّة الفعليّة لَفتَح المُعايَنُ
 * معاينةً بقدرةٍ استعارها منّا — سُلّمٌ يصعده من لا يملك الصعود.
 */
export async function startViewAs(userId: string): Promise<ViewAsResult> {
  const me = await getSessionAdmin();
  if (!me || !me.caps.includes(VIEW_AS_CAP)) {
    return { ok: false, message: "لا تملك صلاحية المعاينة." };
  }
  if (userId === me.id) return { ok: false, message: "هذه هويّتك أصلًا." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  // العضو موجودٌ فعلًا — لا نُخزّن معرّفًا مُلفَّقًا في الكوكي
  const { data, error } = await sb.from("profiles").select("id, full_name").eq("id", userId).maybeSingle();
  if (error) return { ok: false, message: `تعذّر التحقّق: ${error.message}` };
  if (!data) return { ok: false, message: "العضو غير موجود." };

  await vacatePreviewSeats(sb); // معاينةُ شخصٍ حقيقيّ تُنهي مقعد الدُّمية إن كان قائمًا
  await wearIdentity(userId);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: `تعاين اللوحة الآن بعينَي ${data.full_name ?? "العضو"}.` };
}

/**
 * معاينة **منصبٍ شاغر** — تُجلِس الدُّمية عليه ثمّ تلبس هويّتها.
 *
 * النطاق يُقرأ من القاعدة لا من الطلب: الدور يُجلَب باسمه، ونطاقُه من `seatScope`،
 * فوحدةٌ زائدة تُطرَح ووحدةٌ ناقصة تُردّ — لا يُدرَج صفٌّ بنطاقٍ لا يخصّه.
 */
export async function previewVacantPosition(input: { roleName: string; unitId: number | null }): Promise<ViewAsResult> {
  const me = await getSessionAdmin();
  if (!me || !me.caps.includes(VIEW_AS_CAP)) {
    return { ok: false, message: "لا تملك صلاحية المعاينة." };
  }

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data: role, error: rErr } = await sb
    .from("roles").select("role_name, role_name_ar").eq("role_name", input.roleName).maybeSingle();
  if (rErr) return { ok: false, message: `تعذّر التحقّق: ${rErr.message}` };
  if (!role) return { ok: false, message: "المنصب غير موجود." };

  const scope = seatScope(role.role_name as string);
  if (scope !== "none" && input.unitId == null) {
    return { ok: false, message: scope === "committee" ? "هذا المنصب يتطلّب تحديد لجنة." : "هذا المنصب يتطلّب تحديد قسم." };
  }

  const puppet = await ensurePreviewUser(sb);
  if ("error" in puppet) return { ok: false, message: `تعذّر تهيئة الشاغل المؤقّت: ${puppet.error}` };

  const seatErr = await seatPreview(sb, puppet.id, {
    roleName: role.role_name as string,
    roleAr: (role.role_name_ar as string) ?? (role.role_name as string),
    committeeId: scope === "committee" ? input.unitId : null,
    departmentId: scope === "department" ? input.unitId : null,
  });
  // أشهرُ ردٍّ هنا حارسُ التفرّد على الجدول — أيْ أنّ المقعد لم يكن شاغرًا حقًّا
  if (seatErr) return { ok: false, message: `تعذّر إجلاس الشاغل المؤقّت: ${seatErr}` };

  await wearIdentity(puppet.id);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: `تعاين اللوحة الآن بمنصب «${role.role_name_ar ?? role.role_name}».` };
}

/**
 * إنهاء المعاينة — بلا حارس: الرجوع إلى نفسك مباحٌ دائمًا، وحجبُه يحبس المُعاين في هويّةٍ مستعارة.
 * ويُخلي معه مقعدَ الدُّمية — فلا يبقى منصبٌ مشغولًا بمن لا وجود له.
 */
export async function stopViewAs(): Promise<ViewAsResult> {
  (await cookies()).delete(VIEW_AS_COOKIE);
  const sb = service();
  if (sb) await vacatePreviewSeats(sb);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "عُدتَ إلى حسابك." };
}
