"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsResult = { ok: boolean; message: string };

/**
 * أفعال المصادقة الثلاثة — كلُّها **بجلسة صاحبها** لا بمفتاح الخدمة، عن قصد:
 *
 * مسارُ الإدارة (`members/credentials`) يكتب البريد بمفتاح الخدمة ويُثبّته فورًا
 * (`email_confirm: true`) — وذلك صوابٌ لمديرٍ يتحقّق من العضو بنفسه، **وخطأٌ لو نُسخ هنا**:
 * لكتب العضو بريدًا لا يملكه فأقفل حسابه على نفسه. فالبريد يتغيّر بتأكيدٍ يصل العنوان الجديد،
 * وكلمةُ المرور لا تتغيّر إلّا بعد إثبات الحاليّة — ولا سبيل لأحدهما إلّا من جلسةٍ حيّة.
 */

/** الحدّ الأدنى — يطابق `password_min_length` في `scripts/auth-config.mjs` وشاشةَ التعيين. */
const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** أصلُ الموقع كما وصل الطلبُ فعلًا — فرابطُ التأكيد يعود إلى حيث كان صاحبُه (محلّيًّا أو حيًّا). */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "adeeb.club";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function changeMyPassword(
  input: { current: string; next: string; captchaToken?: string },
): Promise<SettingsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, message: "جلستك غير صالحة." };

  const current = input.current ?? "";
  const next = input.next ?? "";
  if (!current) return { ok: false, message: "أدخِل كلمة المرور الحاليّة." };
  if (next.length < PASSWORD_MIN) return { ok: false, message: `كلمة المرور الجديدة ${PASSWORD_MIN} محارف على الأقلّ.` };
  if (next === current) return { ok: false, message: "الجديدة هي الحاليّة نفسها. اختر غيرها." };

  // **إثباتُ الحاليّة قبل الجديدة**: الجلسة المفتوحة على جهازٍ متروك لا تكفي إذنًا لتبديل
  // المفتاح. والتحقّق بمحاولة دخولٍ حقيقيّة — لا تُقارَن كلماتُ المرور في كودنا أبدًا.
  //
  // **ولذلك يلزمها رمزُ درع**: هي دخولٌ حقيقيّ عند GoTrue (`/token`)، وقد صار مدروعًا
  // (٢٠٢٦-٠٨-٠٥). فالنافذةُ تحمل ودجةَ Turnstile كشاشة الدخول — ولولا ذلك لَردّ الخادمُ
  // «كلمة المرور الحاليّة غير صحيحة» وهي صحيحة، فيتّهم العضوُ نفسَه بخطأٍ ليس منه.
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
    options: { captchaToken: input.captchaToken },
  });
  if (authErr) {
    return authErr.message.toLowerCase().includes("captcha")
      ? { ok: false, message: "تعذّر التأكّد أنّك لست روبوتًا. أعِد المحاولة." }
      : { ok: false, message: "كلمة المرور الحاليّة غير صحيحة." };
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, message: `تعذّر تغيير كلمة المرور: ${error.message}` };

  return { ok: true, message: "غُيّرت كلمة المرور." };
}

export async function changeMyEmail(input: { email: string }): Promise<SettingsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة." };

  const email = input.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) return { ok: false, message: "بريد إلكترونيّ غير صالح." };
  if (email === user.email?.toLowerCase()) return { ok: false, message: "هذا بريدك الحاليّ." };

  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${await origin()}/dashboard/settings` },
  );
  if (error) return { ok: false, message: `تعذّر طلب تغيير البريد: ${error.message}` };

  // ولا يُكتب `profiles.email` هنا: تريغر `sync_profile_email_from_auth` يزامنه متى **تمّ**
  // التغيير في `auth.users` — فلا يسبق السجلُّ الحقيقةَ برايةٍ لم تُؤكَّد بعد.
  return { ok: true, message: `أُرسل رابط التأكيد إلى ${email}. لا يسري التغيير قبل فتحه.` };
}

/**
 * الخروج من كلّ الأجهزة — **ومنها هذا**: تُبطَل جلساتُ الحساب كلُّها عند GoTrue، فمن سرق
 * جلسةً من جهازٍ ضائعٍ خرج معها. والتحويل إلى الدخول يقع في الشاشة بعد نجاحه.
 */
export async function signOutEverywhere(): Promise<SettingsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة." };

  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) return { ok: false, message: `تعذّر إنهاء الجلسات: ${error.message}` };

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "أُنهيت جلساتك في كلّ الأجهزة." };
}
