"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SECTION_CAP } from "@/lib/capabilities";
import { notificationsDb } from "@/lib/notifications/db";
import { drainEmails, enqueueEmail } from "@/lib/email/outbox";
import { firstNameOf } from "@/lib/personName";

/**
 * **فعلا سجلّ البريد** (٢٠٢٦-١٠-١٨): إعادةُ رسالةٍ تعثّرت، ورسالةُ تجربة. وكلاهما يطرق المُرسِلَ فورًا
 * بعد أن يكتب في الصادر، فلا ينتظر صاحبُه مهمّةَ الدقيقة (`email-drain`).
 *
 * **والهويّةُ من الجلسة لا من «المعاينة كعضو»** (`lib/view-as.ts`): التجربةُ تذهب إلى بريد من ضغط حقًّا.
 */
export type MailResult = { ok: boolean; message: string };

const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";
const NO_PERM = "لا تملك صلاحية سجلّ البريد.";

async function manager(): Promise<{ id: string; email: string | null } | null> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  const sb = notificationsDb();
  if (!user || !sb) return null;
  const { data, error } = await sb.rpc("check_user_permission", {
    p_user_id: user.id,
    p_permission_key: SECTION_CAP["/dashboard/system/email"],
  });
  return !error && data === true ? { id: user.id, email: user.email ?? null } : null;
}

/** يعيد رسالةً ماتت إلى الطابور. والقاعدةُ (`retry_email`) ترفض رسالةَ المصادقة: رمزُها مات. */
export async function retryMail(id: number): Promise<MailResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "رسالةٌ غيرُ معروفة." };
  const sb = notificationsDb();
  if (!sb) return { ok: false, message: NO_KEY };
  if (!(await manager())) return { ok: false, message: NO_PERM };

  const { data, error } = await sb.rpc("retry_email", { p_id: id });
  if (error) return { ok: false, message: "تعذّرت الإعادة. حاول بعد قليل." };
  if (data !== true) return { ok: false, message: "لا تُعاد هذه الرسالة: لم تتعثّر، أو هي رسالةُ مصادقة." };

  const out = await drainEmails(5);
  revalidatePath("/dashboard/system/email");
  return out.sent
    ? { ok: true, message: "خرجت الرسالة." }
    : { ok: true, message: "عادت الرسالةُ إلى الطابور، وتخرج في الدقيقة القادمة." };
}

/** رسالةُ تجربةٍ إلى بريد من طلبها: تمرّ بالطريق كلّه (الصادر، المُرسِل، المزوّد) كأيّ رسالة. */
export async function sendTestMail(): Promise<MailResult> {
  const sb = notificationsDb();
  if (!sb) return { ok: false, message: NO_KEY };
  const me = await manager();
  if (!me) return { ok: false, message: NO_PERM };
  if (!me.email) return { ok: false, message: "لا بريدَ في حسابك تصله التجربة." };

  const { data: p } = await sb.from("profiles").select("full_name").eq("id", me.id).maybeSingle();
  const name = (p as { full_name: string | null } | null)?.full_name;
  const id = await enqueueEmail("system.test", me.email, { by: name ? firstNameOf(name) : "صاحبُ الحساب" }, { user: me.id });
  if (!id) return { ok: false, message: "تعذّرت كتابةُ الرسالة في الصادر." };

  const out = await drainEmails(5);
  revalidatePath("/dashboard/system/email");
  return out.sent
    ? { ok: true, message: `خرجت التجربةُ إلى ${me.email}.` }
    : { ok: true, message: "كُتبت التجربةُ في الصادر، وتخرج في الدقيقة القادمة." };
}

/**
 * يرفع إيقافَ عنوانٍ ارتدّ أو شكا (`unsuppress_email`): بعد أن يُصحَّح العنوانُ في ملفّ صاحبه، أو يقول صاحبُه إنّ
 * صندوقَه عاد يستقبل. ولا يُعيد ما مات من رسائله: تلك تُعاد بزرّها إن لزم.
 */
export async function liftSuppression(email: string): Promise<MailResult> {
  const addr = email?.trim().toLowerCase();
  if (!addr || !addr.includes("@")) return { ok: false, message: "عنوانٌ غيرُ صالح." };
  const sb = notificationsDb();
  if (!sb) return { ok: false, message: NO_KEY };
  if (!(await manager())) return { ok: false, message: NO_PERM };

  const { data, error } = await sb.rpc("unsuppress_email", { p_email: addr });
  if (error) return { ok: false, message: "تعذّر رفعُ الإيقاف. حاول بعد قليل." };
  revalidatePath("/dashboard/system/email");
  return data === true
    ? { ok: true, message: "رُفع الإيقاف، ويُراسَل العنوانُ من جديد." }
    : { ok: true, message: "العنوانُ ليس موقوفًا." };
}
