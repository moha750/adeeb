"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { DEGREE_VALUES, PHONE_HINT, PHONE_RE, SOCIAL_KEYS, hasAcademicFields, socialColumn, socialHandle, socialLabelOf } from "./vocab";

export type MemberResult = { ok: boolean; message: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/** يحوّل الفارغ إلى null (للأعمدة التي تقبله)، ويقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ. */
const clean = (v: string | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

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
 * الأعمدة: profiles.full_name/phone · member_details (أكاديميّ + تواصل اجتماعيّ).
 * قيود القاعدة المرعيّة هنا: academic_degree محصور بستّة و NOT NULL؛ والحقول الأكاديميّة تتبع الدرجة
 * (member_details_academic_fields_check)؛ و national_id/birth_date عمودان NOT NULL ليسا في النموذج
 * — لذا نُحدِّث member_details ولا نُنشئه (٢٨ عضوًا بلا سجلّ يُبلَّغ عنهم صراحةً).
 *
 * أمن: البوّابة على **المقصود** لا على المستدعي وحده — `can_edit_member_data` في القاعدة (نفس مدى
 * الإنهاء من `membership_authority`، ويزيد: لكلٍّ بياناتُ نفسه). كانت قدرةً واحدة تفتح كلّ عضو،
 * فصارت سلطةً منصبيّةً تُسأل عن هذا العضو بعينه. وبوّابةٌ ثانية: العضويّة المنتهية لا تُحرَّر (أدناه).
 */
export async function updateMember(input: MemberInput): Promise<MemberResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const userId = input.userId?.trim();
  if (!userId) return { ok: false, message: "لم يُحدَّد العضو." };

  // الحَكَم في القاعدة — نسأله قبل الكتابة لأنّ مفتاح الخدمة يتجاوز RLS
  const { data: mayEdit, error: aErr } = await sb.rpc("can_edit_member_data", { p_actor: admin.id, p_target: userId });
  if (aErr) return { ok: false, message: `تعذّر التحقّق من الصلاحية: ${aErr.message}` };
  if (!mayEdit) return { ok: false, message: "صلاحيتك لا تبلغ بيانات هذا العضو." };

  // عضويّة منتهية (account_status = 'suspended' ومعها terminated_at) سجلٌّ مغلق لا مادّةٌ تُحرَّر.
  // والحكم هنا لا في الواجهة وحدها: هذا المسار يكتب بمفتاح الخدمة فيتجاوز RLS، وحجب البند
  // من قائمة النقاط يُخفي الباب ولا يُغلقه — فمن نادى الإجراء مباشرةً كتب كما يشاء.
  // شرطه حالته لا تبويبه: يصمد في الشاشة المختلطة وفي أيّ مستدعٍ آخر يأتي لاحقًا.
  const { data: target, error: tErr } = await sb
    .from("profiles")
    .select("account_status")
    .eq("id", userId)
    .maybeSingle();
  if (tErr) return { ok: false, message: `تعذّر التحقّق من حالة العضو: ${tErr.message}` };
  if (!target) return { ok: false, message: "لا وجود لهذا العضو." };
  if (target.account_status === "suspended") {
    return { ok: false, message: "عضويّة منتهية — لا تُعدَّل بياناتها. أعِد العضوية أوّلًا ثمّ عدّلها." };
  }

  const name = clean(input.name);
  if (!name || name.length < 2) return { ok: false, message: "الاسم مطلوب (حرفان على الأقلّ)." };

  // الدرجة تُكتب رمزًا لا تسمية — القيد يرفض ما سواه، فنحرسه هنا أيضًا (لا نثق بالعميل)
  const degree = clean(input.degree);
  if (degree && !DEGREE_VALUES.includes(degree)) {
    return { ok: false, message: "درجة علمية غير معروفة." };
  }

  // الجوّال — نفس صيغة قيد القاعدة؛ نفحصها هنا كي تُردّ الاستدعاءات المتجاوزة للواجهة برسالة مفهومة لا بخطأ 23514
  const phone = clean(input.phone);
  if (phone && !PHONE_RE.test(phone)) return { ok: false, message: `${PHONE_HINT}.` };

  // الحقول الأكاديميّة تتبع الدرجة — قاعدة member_details_academic_fields_check نفسها، مفروضةً هنا كذلك:
  // فالقيد يحمي القاعدة، وهذا يحمي المستخدم برسالة عربيّة بدل خطأ 23514 خام. والمحو لا يُترك للعميل.
  const college = clean(input.college);
  const major = clean(input.major);
  const recordNo = clean(input.recordNo);
  const academic = !degree
    ? {} // لا درجة ⇒ لا سجلّ تفاصيل (العمود NOT NULL) ⇒ لا نمسّ الحقول الأكاديميّة أصلًا
    : hasAcademicFields(degree)
      ? { academic_degree: degree, college, major, academic_record_number: recordNo }
      : { academic_degree: degree, college: null, major: null, academic_record_number: null }; // ثانوية عامة · موظف
  if (hasAcademicFields(degree) && (!college || !major || !recordNo)) {
    return { ok: false, message: "الكلّية والتخصّص والرقم الأكاديميّ مطلوبة لهذه الدرجة العلمية." };
  }

  // معرّفات التواصل — تُطبَّع إلى الصيغة المعياريّة (المعرّف مجرّدًا) بنفس مُطبِّع النموذج وقيد القاعدة.
  // ما ليس معرّفًا يُردّ برسالته لا يُمحى صامتًا: المدير كتب شيئًا، فيُقال له لمَ رُفض.
  const socials: Record<string, string | null> = {};
  for (const key of SOCIAL_KEYS) {
    const res = socialHandle(key, input[key]);
    if (!res.ok) return { ok: false, message: `${socialLabelOf(key)} — ${res.reason}` };
    socials[socialColumn(key)] = res.handle;
  }

  // ١) الملفّ الشخصيّ — يُحدَّث للجميع (لا يعتمد على وجود سجلّ تفاصيل)
  const { error: pErr } = await sb
    .from("profiles")
    .update({ full_name: name, phone })
    .eq("id", userId);
  if (pErr) return { ok: false, message: `تعذّر تحديث الملفّ الشخصيّ: ${pErr.message}` };

  // ٢) التفاصيل — تحديث لا إنشاء. select() يكشف عدد الصفوف المتأثّرة، فنعرف يقينًا هل وُجد السجلّ.
  const { data: touched, error: dErr } = await sb
    .from("member_details")
    .update({
      ...academic,
      ...socials,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id");
  if (dErr) return { ok: false, message: `حُفظ الاسم والجوّال، لكن تعذّر تحديث التفاصيل: ${dErr.message}` };

  revalidatePath("/dashboard/members", "layout");

  if (!touched || touched.length === 0) {
    return {
      ok: false,
      message: "حُفظ الاسم ورقم الجوّال. أمّا البيانات الأكاديميّة والتواصل الاجتماعيّ فلا سجلّ تفاصيل لهذا العضو يحملها — تُنشأ عند إكمال بيانات الالتحاق.",
    };
  }

  return { ok: true, message: "حُفظت بيانات العضو بنجاح." };
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
