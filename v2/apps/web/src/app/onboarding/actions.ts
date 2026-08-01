"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { hasAcademicFields, socialHandle, SOCIAL_KEYS } from "@/lib/membershipFields";
import { onboardingSchema, type OnboardingInput } from "./vocab";

export type OnboardingResult = { ok: boolean; message: string; fieldErrors?: Partial<Record<keyof OnboardingInput, string>> };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * إكمال بيانات العضو وتفعيل حسابه — يوازي دالّة الحافة complete-member-onboarding بنمط V2.
 * التوكن (بلا جلسة) هو رمز الوصول؛ الكتابة بمفتاح الخدمة + auth.admin (كنمط credentials/actions).
 * القاعدة الأكاديميّة الثنائيّة تُنفَّذ هنا: غير الجامعيّ تُفرَّغ حقوله الثلاثة (NULL) كما يفرض القيد.
 * الجوّال في profiles لا member_details (لا عمود له فيه)، والبريد واللجنة صدىً لا يُكتبان.
 */
export async function completeOnboarding(token: string, raw: OnboardingInput): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "راجع الحقول المميّزة بالأحمر.", fieldErrors };
  }
  const v = parsed.data;

  if (!token?.trim()) return { ok: false, message: "رابط غير صالح." };

  const sb = serviceClient();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص — أبلغ الإدارة." };

  // التحقّق من التوكن
  const { data: tok } = await sb
    .from("member_onboarding_tokens")
    .select("user_id, is_used, expires_at")
    .eq("token", token.trim())
    .maybeSingle();
  if (!tok) return { ok: false, message: "رابط غير صالح." };
  if (tok.is_used) return { ok: false, message: "تمّ إكمال التسجيل بهذا الرابط مسبقًا." };
  if (new Date(tok.expires_at) < new Date()) return { ok: false, message: "انتهت صلاحية الرابط. تواصل مع إدارة الموارد البشريّة." };

  const userId = tok.user_id as string;

  // 1) كلمة المرور (auth.admin)
  const { error: pwError } = await sb.auth.admin.updateUserById(userId, { password: v.password });
  if (pwError) return { ok: false, message: "تعذّر ضبط كلمة المرور، حاول لاحقًا." };

  // 2) member_details — الحقول الأكاديميّة تُفرَّغ لغير الجامعيّ، والتواصل مطبَّعٌ لمعرّفٍ مجرّد
  const academic = hasAcademicFields(v.academic_degree);
  const social: Record<string, string | null> = {};
  for (const k of SOCIAL_KEYS) {
    const res = socialHandle(k, v[k]);
    social[`${k}_account`] = res.ok ? res.handle : null;
  }
  const { error: mdError } = await sb.from("member_details").upsert(
    {
      user_id: userId,
      full_name_triple: v.full_name_triple,
      national_id: v.national_id,
      birth_date: v.birth_date,
      academic_degree: v.academic_degree,
      college: academic ? v.college : null,
      major: academic ? v.major : null,
      academic_record_number: academic ? v.academic_record_number : null,
      favorite_color: v.favorite_color?.trim() || null,
      twitter_account: social.twitter_account,
      instagram_account: social.instagram_account,
      tiktok_account: social.tiktok_account,
      linkedin_account: social.linkedin_account,
    },
    { onConflict: "user_id" },
  );
  if (mdError) return { ok: false, message: "تعذّر حفظ بياناتك، تحقّق من الحقول." };

  // 3) تفعيل الحساب (يحمل الجنس والجوّال — قيد profiles_phone_check يردّ ما ليس على صيغته)
  const { error: profileError } = await sb
    .from("profiles")
    .update({ account_status: "active", gender: v.gender, phone: v.phone })
    .eq("id", userId);
  if (profileError) return { ok: false, message: "تعذّر تفعيل الحساب، تحقّق من رقم الجوّال." };

  // 4) تفعيل الدور (أُنشئ نشطًا عند الترحيل — تأكيدٌ احتياطيّ)
  await sb.from("user_roles").update({ is_active: true }).eq("user_id", userId);

  // 5) ختم التوكن
  await sb.from("member_onboarding_tokens").update({ is_used: true, used_at: new Date().toISOString() }).eq("token", token.trim());

  // 6) سجلّ النشاط (أفضل جهد)
  await sb.from("activity_log").insert({
    user_id: userId,
    action: "complete_onboarding",
    entity_type: "user",
    entity_id: userId,
    details: { via: "v2_onboarding", completed_at: new Date().toISOString() },
  });

  return { ok: true, message: "تم تفعيل حسابك بنجاح." };
}
