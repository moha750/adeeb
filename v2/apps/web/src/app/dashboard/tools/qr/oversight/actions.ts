"use server";

import { revalidatePath } from "next/cache";
import { getSessionAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * **فعلُ الإشراف الوحيد: إيقافُ باركودٍ أو تشغيلُه.**
 *
 * ولا تعديلَ وجهةٍ ولا اسمٍ ولا حذف: الإشرافُ رؤيةٌ، وهذا استثناءٌ واحدٌ مسمًّى لأنّ ملصقًا
 * حُوِّلت وجهتُه إلى صفحةِ تصيّدٍ لا يُنتظَر فيه صاحبُه.
 *
 * **والحارسُ في القاعدة لا هنا**: الدالّةُ `qr_admin_set_active` تفحص القدرةَ بنفسها وتكتب
 * عمودَ الحال وحدَه، فلا سياسةَ كتابةٍ فُتحت على صفوف الناس. وهذا الفحصُ هنا تجربةٌ لا
 * حراسة: يردّ الرسالةَ بالعربيّة قبل السفر، ومن تجاوزه ردّته القاعدة.
 *
 * **وصاحبُ الجلسة لا المُعايَن**: `auth.uid()` في القاعدة يقول حقيقةَ من يفعل، فالسجلُّ
 * يقيّد الواقعةَ باسمه (حدُّ المعاينة الموصوف في `lib/view-as`).
 */
export type OversightResult = { ok: boolean; message: string };

const CAP = "oversee_qr";

export async function adminSetQrActive(id: string, active: boolean): Promise<OversightResult> {
  const me = await getSessionAdmin();
  if (!me) return { ok: false, message: "جلستك غير صالحة." };
  if (!me.caps.includes(CAP)) return { ok: false, message: "لا تملك صلاحية الإشراف على الباركود." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("qr_admin_set_active", { p_id: id, p_active: active });
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "لم يُعثر على الباركود." };

  revalidatePath("/dashboard/tools/qr/oversight");
  revalidatePath(`/dashboard/tools/qr/${id}`);
  return {
    ok: true,
    message: active
      ? "شُغّل الباركود، ومن يمسحه الآن يصل إلى وجهته."
      : "أُوقف الباركود، ومن يمسحه الآن يرى صفحةً تقول إنّه غير متاح.",
  };
}

/**
 * **نقلُ ملكيّة باركود** — أصولُ نادٍ لا أصولُ أفراد.
 *
 * علّتُه أنّ الصفَّ يُحذف بحذف حساب صاحبه (`on delete cascade`)، فمن غادر ذهبت ملصقاتُه
 * المطبوعةُ معه. والنقلُ فعلُ إشرافٍ لا فعلُ مالك: عمودُ `owner_id` ممنوعٌ من التحديث في
 * امتياز المتصفّح أصلًا، فالدالّةُ في القاعدة هي البابُ الوحيد.
 */
export async function transferQrOwner(id: string, toUserId: string): Promise<OversightResult> {
  const me = await getSessionAdmin();
  if (!me) return { ok: false, message: "جلستك غير صالحة." };
  if (!me.caps.includes(CAP)) return { ok: false, message: "لا تملك صلاحية الإشراف على الباركود." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("qr_transfer_owner", { p_id: id, p_to: toUserId });
  if (error) {
    // رسائلُ الدالّة رموزٌ تُترجَم هنا، فلا يقرأ صاحبُ الشاشة لسانَ القاعدة.
    const why = error.message.includes("TARGET_LACKS_CAPABILITY")
      ? "من تنقل إليه لا يملك صلاحية مولّد الباركود، فلن يرى الباركود بعد النقل."
      : error.message.includes("NO_SUCH_PROFILE")
        ? "لم يُعثر على العضو."
        : error.message;
    return { ok: false, message: why };
  }
  if (!data) return { ok: false, message: "لم يُعثر على الباركود." };

  revalidatePath("/dashboard/tools/qr/oversight");
  return { ok: true, message: "نُقلت ملكيّةُ الباركود، وقُيّد ذلك في السجلّ." };
}

/**
 * **حذفُ باركودٍ من غرفة الإشراف** (أمرُ المالك ٢٠٢٦-٠٩-٠٥: «أضِف للإيقاف حذفًا»).
 *
 * وباركودٌ صُنع تصيّدًا لا يكفيه الإيقاف. والحذفُ دالّةٌ في القاعدة لا سياسةُ حذفٍ مفتوحة،
 * فما لم تأذن به الدالّةُ يبقى ممنوعًا. والمسحاتُ تذهب معه، وتبقى واقعةُ الحذف في السجلّ.
 */
export async function adminDeleteQr(id: string): Promise<OversightResult> {
  const me = await getSessionAdmin();
  if (!me) return { ok: false, message: "جلستك غير صالحة." };
  if (!me.caps.includes(CAP)) return { ok: false, message: "لا تملك صلاحية الإشراف على الباركود." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("qr_admin_delete", { p_id: id });
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "لم يُعثر على الباركود." };

  revalidatePath("/dashboard/tools/qr/oversight");
  revalidatePath("/dashboard/tools/qr");
  return { ok: true, message: "حُذف الباركود ومسحاتُه، وبقيت الواقعةُ في السجلّ." };
}
