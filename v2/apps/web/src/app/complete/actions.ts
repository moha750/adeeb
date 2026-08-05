"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { getSessionAdmin } from "@/lib/auth";
import { hasAcademicFields, socialHandle, SOCIAL_KEYS } from "@/lib/membershipFields";
import { completeSchema, type CompleteInput } from "./vocab";

export type CompleteResult = { ok: boolean; message: string; fieldErrors?: Partial<Record<keyof CompleteInput, string>> };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * إنشاء سجلّ `member_details` لصاحب الجلسة — **المُنشئ الوحيد** بعد نحر نظام التسجيل.
 *
 * الهدف هو المستدعي دائمًا: لا معرّفَ يُمرَّر من المتصفّح، والجلسةُ هي الإذن (لا توكن ولا بريد).
 * وصاحبُ **الجلسة** لا الهويّة المُعارة — فمن عاين غيره لا يكتب سجلَّه بيده.
 *
 * ولا يمسّ `account_status` بحال: العضويّة قرارُ إدارةٍ لا ثمرةُ نموذج. هذه الشاشة تسدّ نقصَ
 * سجلٍّ لا تفتح بابَ عضويّة — وهذا ما يفرقها عن `/onboarding` الذي كان يُفعّل الحساب.
 */
export async function completeMyRecord(raw: CompleteInput): Promise<CompleteResult> {
  const me = await getSessionAdmin();
  if (!me) return { ok: false, message: "جلستك غير صالحة — سجّل دخولك من جديد." };

  const parsed = completeSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "راجع الحقول المميّزة بالأحمر.", fieldErrors };
  }
  const v = parsed.data;

  const sb = serviceClient();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص — أبلغ الإدارة." };

  // عضويّة منتهية سجلٌّ مغلق لا يُحرَّر — الحكم نفسه الذي يحرسه `lib/memberData`.
  const { data: profile, error: pErr } = await sb.from("profiles").select("account_status").eq("id", me.id).maybeSingle();
  if (pErr) return { ok: false, message: `تعذّر التحقّق من حسابك: ${pErr.message}` };
  if (profile?.account_status === "suspended") {
    return { ok: false, message: "عضويّتك منتهية — تواصل مع الإدارة." };
  }

  // member_details — الحقول الأكاديميّة تُفرَّغ لغير الجامعيّ، والتواصل مطبَّعٌ لمعرّفٍ مجرّد
  const academic = hasAcademicFields(v.academic_degree);
  const social: Record<string, string | null> = {};
  for (const k of SOCIAL_KEYS) {
    const res = socialHandle(k, v[k]);
    social[`${k}_account`] = res.ok ? res.handle : null;
  }
  const { error: mdError } = await sb.from("member_details").upsert(
    {
      user_id: me.id,
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

  // الجنس والجوّال في `profiles` (لا عمود لهما في التفاصيل) — والقيد `profiles_phone_check` يحرس الصيغة
  const { error: profileError } = await sb.from("profiles").update({ gender: v.gender, phone: v.phone }).eq("id", me.id);
  if (profileError) return { ok: false, message: "حُفظ سجلُّك، لكن تعذّر حفظ الجوّال أو الجنس." };

  // سجلّ النشاط (أفضل جهد). أسماءُ الأعمدة `action_type`/`target_type`/`target_id` وثلاثتُها
  // NOT NULL و`target_id` **نصٌّ** لا uuid — والخطأ يُبتلع ههنا، فلا يكشفه إلّا فحصُ الجدول.
  await sb.from("activity_log").insert({
    user_id: me.id,
    action_type: "complete_member_record",
    target_type: "profile",
    target_id: me.id,
    details: { via: "v2_complete" },
  });

  return { ok: true, message: "اكتمل سجلُّك." };
}
