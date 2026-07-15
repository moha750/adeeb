"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { DEGREE_VALUES, PHONE_HINT, PHONE_RE, hasAcademicFields } from "./vocab";

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
 * أمن: بوّابة الأدمن (role_level ≥ 8) قبل أيّ كتابة — دفاعٌ في العمق فوق حراسة اللوحة.
 */
export async function updateMember(input: MemberInput): Promise<MemberResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.isAdmin) return { ok: false, message: "لا تملك صلاحية تعديل بيانات الأعضاء." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const userId = input.userId?.trim();
  if (!userId) return { ok: false, message: "لم يُحدَّد العضو." };

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
      twitter_account: clean(input.twitter),
      instagram_account: clean(input.instagram),
      tiktok_account: clean(input.tiktok),
      linkedin_account: clean(input.linkedin),
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
