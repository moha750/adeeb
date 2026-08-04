"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { writeMemberData } from "@/lib/memberData";

export type MemberResult = { ok: boolean; message: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export type MemberInput = {
  userId: string;
  name: string;
  phone?: string;
  college?: string;
  degree?: string;
  major?: string;
  recordNo?: string;
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
};

/**
 * تحديث بيانات العضو — خادميّ حصرًا عبر مفتاح الخدمة.
 *
 * النطاق مقصود: القسم والدور والحالة **ليست هنا** — يملكها `assignments/` عبر assign_position RPC.
 * والبريد **ليس هنا** — يملكه `credentials/` لأنّه هويّة مصادقة تُزامَن مع auth.users، فكتابته منفردًا تفكّ المزامنة.
 *
 * **والكتابة نفسها ليست هنا:** يملكها `lib/memberData` مصدرًا واحدًا يشاركه «الملفّ الشخصيّ»
 * (حيث يحرّر العضو بياناته بنفسه) — فالقيود والرسائل واحدةٌ لا نسختان تفترقان. وهذه الدالّة
 * بابُ الإدارة إليه: تتحقّق من الجلسة، وتمرّر الحقول التي تملكها الإدارة (ومنها الاسم)، وتُنعش.
 *
 * أمن: البوّابة على **المقصود** لا على المستدعي وحده — `can_edit_member_data` في القاعدة (نفس مدى
 * الإنهاء من `membership_authority`، ويزيد: لكلٍّ بياناتُ نفسه)، والعضويّة المنتهية لا تُحرَّر.
 */
export async function updateMember(input: MemberInput): Promise<MemberResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const userId = input.userId?.trim();
  if (!userId) return { ok: false, message: "لم يُحدَّد العضو." };

  const res = await writeMemberData(sb, admin.id, userId, {
    name: input.name,
    phone: input.phone ?? "",
    degree: input.degree,
    college: input.college,
    major: input.major,
    recordNo: input.recordNo,
    twitter: input.twitter,
    instagram: input.instagram,
    tiktok: input.tiktok,
    linkedin: input.linkedin,
  });

  // الإنعاش على الشقّ الناجح كذلك: الرسالةُ الجزئيّة (بلا سجلّ تفاصيل) تُبلِّغ عن نقصٍ بعد أن
  // كُتب الاسم والجوّال فعلًا — فالشاشة يجب أن تُظهرهما.
  revalidatePath("/dashboard/members", "layout");

  return res.ok ? { ok: true, message: "حُفظت بيانات العضو بنجاح." } : res;
}

/**
 * إنهاء العضوية وإعادتها — عبر `terminate_membership` / `restore_membership` (SECURITY DEFINER).
 *
 * **لا بوّابة قدرةٍ هنا، والحكم في القاعدة وحدها** — عن قصد: سلطة الإنهاء منصبيّةٌ مكتوبة في
 * `membership_termination_authority` (لكلّ منصبٍ مداه ومن يُحجب عنه)، وقدرات اللوحة تفتح الغرف
 * لا الأفعال. فحصُ قدرةٍ هنا كان سيردّ عضوَ إدارة الموارد وهو صاحب سلطةٍ حقيقيّة على من يشرف عليهم.
 *
 * والحَكَم `can_end_membership` تقرؤه الدالّتان ومرآةُ الواجهة (`members_i_may_end`) معًا، وكتابةُ
 * `account_status` مباشرةً مقفولةٌ بتريغرٍ يسري على مفتاح الخدمة نفسه — فلم يبقَ للفعلين إلّا هذا الباب.
 */
export async function endMembership(input: { userId: string; reason: string }): Promise<MemberResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("terminate_membership", {
    p_actor: admin.id,
    p_user: input.userId,
    p_reason: input.reason,
  });
  if (error) return { ok: false, message: `تعذّر إنهاء العضوية: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string };
  if (r.ok) revalidatePath("/dashboard/members", "layout");
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "أُنهيت العضوية." : "تعذّر إنهاء العضوية.") };
}

export async function restoreMembership(input: { userId: string }): Promise<MemberResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("restore_membership", { p_actor: admin.id, p_user: input.userId });
  if (error) return { ok: false, message: `تعذّرت إعادة العضوية: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string };
  if (r.ok) revalidatePath("/dashboard/members", "layout");
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "أُعيدت العضوية." : "تعذّرت إعادة العضوية.") };
}
