"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { EMAIL_HINT, isEmail } from "@/lib/fieldFormats";

export type CredResult = { ok: boolean; message: string };

/**
 * تغيير بريد و/أو كلمة مرور عضو — خادميّ حصرًا عبر مفتاح الخدمة (Auth Admin API).
 * profiles.id هو نفسه معرّف مستخدم المصادقة (auth.users.id)، فيُمرَّر مباشرةً.
 * عند تغيير البريد نُزامن profiles.email كي تبقى قائمة الأعضاء متّسقة (data.ts يقرأ منه).
 *
 * أمن: يتحقّق من قدرة `manage_member_data` قبل أيّ تعديل — دفاعٌ في العمق فوق حراسة اللوحة (صفر role_level).
 */
export async function updateCredentials(input: {
  userId: string;
  email?: string;
  password?: string;
}): Promise<CredResult> {
  // بوّابة القدرة — تغيير بيانات الدخول جزءٌ من إدارة بيانات العضو
  const admin = await getCurrentAdmin();
  if (!admin || !admin.caps.includes("manage_member_data")) {
    return { ok: false, message: "لا تملك صلاحية تنفيذ هذا الإجراء." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { ok: false, message: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }

  const userId = input.userId?.trim();
  const email = input.email?.trim();
  const password = input.password;

  if (!userId) return { ok: false, message: "لم يُحدَّد العضو." };
  if (!email && !password) return { ok: false, message: "أدخِل بريدًا جديدًا أو كلمة مرور جديدة." };
  if (email && !isEmail(email)) return { ok: false, message: `${EMAIL_HINT}.` };
  if (password && password.length < 8) return { ok: false, message: "كلمة المرور يجب ألّا تقلّ عن ٨ محارف." };

  const sb = createAdeebServiceClient(url, key);

  // تحديث المصادقة (تأكيد البريد فورًا عند تغييره — كما في create-member-directly)
  const payload: { email?: string; password?: string; email_confirm?: boolean } = {};
  if (email) { payload.email = email; payload.email_confirm = true; }
  if (password) payload.password = password;

  const { error: authErr } = await sb.auth.admin.updateUserById(userId, payload);
  if (authErr) return { ok: false, message: `تعذّر تحديث بيانات الدخول: ${authErr.message}` };

  // مزامنة البريد في الملف الشخصيّ
  if (email) {
    const { error: profErr } = await sb.from("profiles").update({ email }).eq("id", userId);
    if (profErr) {
      return { ok: false, message: `حُدّثت بيانات الدخول لكن تعذّرت مزامنة الملف الشخصيّ: ${profErr.message}` };
    }
  }

  revalidatePath("/dashboard/members/credentials");

  const parts = [email ? "البريد الإلكترونيّ" : null, password ? "كلمة المرور" : null].filter(Boolean);
  return { ok: true, message: `تمّ تحديث ${parts.join(" و")} بنجاح.` };
}
