import "server-only";
import type { createAdeebServiceClient } from "@adeeb/core";

/** عميل الخدمة كما تصنعه النواة — لا نستورد نوع Supabase مباشرةً (ليس تابعًا مباشرًا للتطبيق). */
type Service = ReturnType<typeof createAdeebServiceClient>;

/**
 * **مقعد المعاينة** — كيف يُختبَر منصبٌ لا شاغلَ له.
 *
 * لا مهرب من شاغل: نطاقُ التبويبات الهويّاتيّة يُشتقّ من **صفٍّ حيّ** في `user_roles`
 * (`ledAdminUnit` في الشاشة، و`can_assign_role` في القاعدة). فمعاينةُ منصبٍ فارغ بلا صفٍّ
 * تعرض غرفةً فارغة وتُردّ عند الكتابة — أيْ لا تختبر شيئًا.
 *
 * فالحلّ **دُميةٌ واحدة** لا اثنتا عشرة:
 * - **حسابٌ محظور الدخول** في `auth.users` — لا مفرّ منه (`profiles_id_fkey` يفرضه)، فيُنشأ
 *   بكلمة مرورٍ عشوائيّة **لا تُحفَظ ولا تُعرَض** ثمّ **يُحظَر** (`ban_duration`): يُلبَس ولا يُدخَل به.
 * - **ملفٌّ حالته `inactive`** — فيسقط من تبويبات الأعضاء الثلاثة (نشط · قيد الإكمال · سابق):
 *   حاضرٌ للاختبار، غائبٌ عن السجلّ.
 * - **معرّفُه غير محفور** (GoTrue هو من يولّده) — فيُعرَف ببريده المحجوز `preview@adeeb.local`.
 *
 * ومقعده **يُحذف لا يُعطَّل** عند الإنهاء: الدُّمية تُخلي المنصب كما وجدَته، بلا صفٍّ خامل
 * يبقى في الهيكلة يقول إنّ فلانًا كان هنا. (يبقى الملفّ والحساب المحظور للمرّة القادمة.)
 */
export const PREVIEW_EMAIL = "preview@adeeb.local";
/**
 * واسمُها بحروفٍ عربيّةٍ محضة بلا قوسٍ ولا رمز: عمودُ الاسم صار مقيَّدًا بالعربيّة
 * (`profiles_full_name_arabic_check`)، والدُّميةُ تسكن العمودَ نفسَه فتخضع لحكمه.
 */
export const PREVIEW_NAME = "شاغل مؤقّت للمعاينة";
/**
 * رقمٌ محجوز للدُّمية — لا لأنّ لها هاتفًا، بل لأنّ `profiles.phone` صار `NOT NULL`
 * (٢٠٢٦-٠٨-٠٤): الجوّال إجباريّ في القاعدة نفسها لا في التطبيق وحده. وفُضّل رقمٌ اصطلاحيّ
 * على بندٍ في القيد يستثني الخاملين — ذاك بابٌ يفتحه كلّ من يضبط الحالة.
 * والدُّمية `inactive` فتسقط من تبويبات الأعضاء الثلاثة، فلا يظهر هذا الرقم في كشفٍ لأحد.
 */
export const PREVIEW_PHONE = "0500000000";

/**
 * نطاق المنصب — **مرآةُ `assign_position` في القاعدة** (كتلتا `v_needs_committee`
 * و`v_needs_department`). القاعدة هي المصدر والحَكَم؛ وهذه صورتها ليعرف المنتقي أيّ وحدةٍ
 * يسأل عنها قبل أن يسأل. غيّرتَ هناك — غيّر هنا. (كما تُرايء `supervision/model.ts` دالّة
 * `can_assign_role` بالشرط نفسه.)
 */
const NEEDS_COMMITTEE = new Set([
  "committee_leader", "deputy_committee_leader", "committee_member",
  "hr_admin_member", "qa_admin_member", "hr_committee_leader", "qa_committee_leader",
]);
const NEEDS_DEPARTMENT = new Set(["department_head"]);

export type SeatScope = "committee" | "department" | "none";

export function seatScope(roleName: string): SeatScope {
  if (NEEDS_DEPARTMENT.has(roleName)) return "department";
  if (NEEDS_COMMITTEE.has(roleName)) return "committee";
  return "none";
}

/** معرّف الدُّمية إن وُجدت — تُعرَف ببريدها المحجوز لا بمعرّفٍ محفور. */
export async function findPreviewUser(sb: Service): Promise<string | null> {
  const { data } = await sb.from("profiles").select("id").eq("email", PREVIEW_EMAIL).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** الدُّمية موجودة — تُنشأ عند أوّل معاينة، ثمّ تُعاد كما هي. */
export async function ensurePreviewUser(sb: Service): Promise<{ id: string } | { error: string }> {
  const existing = await findPreviewUser(sb);
  if (existing) return { id: existing };

  const { data, error } = await sb.auth.admin.createUser({
    email: PREVIEW_EMAIL,
    // لا تُحفَظ ولا تُعرَض — ومعرّفٌ واحد لا اثنان: bcrypt يرفض ما جاوز ٧٢ بايتًا (يُردّ 500)
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { preview_fixture: true },
  });
  if (error || !data?.user) return { error: error?.message ?? "تعذّر إنشاء الشاغل المؤقّت." };
  const id = data.user.id;

  // حظرُ الدخول — تُلبَس هذه الهويّة ولا تُفتَح بها جلسة أبدًا
  await sb.auth.admin.updateUserById(id, { ban_duration: "876000h" });

  // `joined_date` صراحةً: صار حدَّ العضويّة بعد توحيد الهويّة، وافتراضُه نُزع فلا تُمنح صمتًا.
  // والدُّميةُ تُجلَس على المناصب فلا بدّ أن تُعَدّ عضوًا وإلّا سقطت من كشوف الأعضاء.
  const { error: pErr } = await sb.from("profiles").insert({
    id, full_name: PREVIEW_NAME, email: PREVIEW_EMAIL, account_status: "inactive", phone: PREVIEW_PHONE,
    joined_date: new Date().toISOString().slice(0, 10),
  });
  if (pErr) return { error: pErr.message };
  return { id };
}

/** إخلاء كلّ مقعدٍ للدُّمية — يُستدعى عند الإنهاء وقبل كلّ إجلاسٍ جديد. */
export async function vacatePreviewSeats(sb: Service, userId?: string | null): Promise<void> {
  const id = userId ?? (await findPreviewUser(sb));
  if (!id) return;
  await sb.from("user_roles").delete().eq("user_id", id);
}

/**
 * إجلاسُ الدُّمية على منصب. إدراجٌ مباشر لا `assign_position` — عمدًا: تلك تُسجّل إسنادًا
 * حقيقيًّا بمُسنِدٍ ومؤرَّخ، وهذه تركيبةُ اختبارٍ تُحذف بعد حين. وحارسُ التفرّد يبقى قائمًا
 * على الجدول (`trg_enforce_position_uniqueness`) فلا تُزاحم الدُّميةُ شاغلًا حقيقيًّا.
 */
export async function seatPreview(
  sb: Service,
  userId: string,
  seat: { roleName: string; roleAr: string; committeeId: number | null; departmentId: number | null },
): Promise<string | null> {
  await vacatePreviewSeats(sb, userId);
  // اسم الدُّمية يحمل منصبها — فيقول شريطُ المعاينة «بأيّ منصبٍ تنظر» بلا استعلامٍ إضافيّ
  await sb.from("profiles").update({ full_name: `${PREVIEW_NAME} ${seat.roleAr}` }).eq("id", userId);
  // `role_id` لا يُكتب: تريغر `sync_role_key` يشتقّه من الاسم — والعمود مصيره الحذف (البند ١).
  const { error } = await sb.from("user_roles").insert({
    user_id: userId,
    role_name: seat.roleName,
    committee_id: seat.committeeId,
    department_id: seat.departmentId,
    is_active: true,
    notes: "مقعد معاينة مؤقّت، يُحذف بإنهاء المعاينة",
  });
  return error?.message ?? null;
}
