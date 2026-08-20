"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { BIO_MAX, PROVIDER_LABEL, type ProviderKey } from "./vocab";

export type SettingsResult = { ok: boolean; message: string };

/**
 * أفعالُ هذه الغرفة كلُّها **بجلسة صاحبها** لا بمفتاح الخدمة، عن قصد:
 *
 * مسارُ الإدارة (`members/credentials`) يكتب البريد بمفتاح الخدمة ويُثبّته فورًا
 * (`email_confirm: true`) — وذلك صوابٌ لمديرٍ يتحقّق من العضو بنفسه، **وخطأٌ لو نُسخ هنا**:
 * لكتب العضو بريدًا لا يملكه فأقفل حسابه على نفسه. فالبريد يتغيّر بتأكيدٍ يصل العنوان الجديد،
 * وكلمةُ المرور لا تتغيّر إلّا بعد إثبات الحاليّة — ولا سبيل لأحدهما إلّا من جلسةٍ حيّة.
 *
 * والقاعدةُ تمتدّ إلى ما أُضيف بعدُ: الجلسةُ تُنهى بدالّةٍ تقرأ `auth.uid()`، وفكُّ الربط
 * بنداءِ المصادقة نفسِه.
 *
 * **ويُستثنى كاتبان اثنان** — النبذةُ ورسائلُ النادي: سياسةُ `profiles_update_own` قائمةٌ
 * في القاعدة، لكنّ دورَ `authenticated` **لا يملك `UPDATE` على `profiles` أصلًا**، فالسياسةُ
 * لا تُبلَغ ويردّ الخادم `permission denied for table profiles`. فيكتبهما مفتاحُ الخدمة كما
 * يفعل «الملفّ الشخصيّ» سواءً — **والهدفُ صاحبُ الجلسة نفسُه** (`getUser().id`) لا معرّفٌ
 * يُمرَّر من المتصفّح، ولا عمودٌ غيرُ العمود المقصود.
 *
 * وهو حلٌّ **بالنمط القائم لا بالجذر**: جذرُه `grant update (bio, accepts_marketing)` —
 * ترحيلٌ مكتوبٌ ينتظر إذنًا، وعندَه يعود الكاتبان إلى جلستهما ويسقط هذا الاستثناء.
 */

/** مفتاحُ الخدمة — يُنقّى من محارفَ دخيلةٍ قد تلتصق عند اللصق (JWT لا يحوي إلّا هذه). */
function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";

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
  revalidatePath("/dashboard/settings");
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

/**
 * إنهاءُ جلسةٍ واحدة — بدالّة `revoke_my_session` التي لا تحذف إلّا صفَّ `auth.uid()`.
 *
 * والمعرّفُ يُمرَّر كما جاء من الشاشة بلا فحصٍ ههنا عمدًا: لو فحصناه هنا لصار **الفحصُ هو
 * الحارس**، ولانتقل الأمانُ من القاعدة إلى الكود. وهو في القاعدة مقرونٌ بشرط المالك في
 * جملة الحذف نفسِها، فمعرّفُ جلسةِ غيرِك يمرّ ولا يحذف شيئًا. (والصفرُ يُقال صدقًا أدناه.)
 */
export async function revokeMySession(sessionId: string): Promise<SettingsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة." };

  const { data, error } = await supabase.rpc("revoke_my_session", { p_session_id: sessionId });
  if (error) return { ok: false, message: `تعذّر إنهاء الجلسة: ${error.message}` };

  revalidatePath("/dashboard/settings");
  return Number(data) > 0
    ? { ok: true, message: "أُنهيت الجلسة على ذلك الجهاز." }
    : { ok: true, message: "تلك الجلسة منتهيةٌ أصلًا." };
}

/* ── رسائل النادي ────────────────────────────────────────────────────────────
 * `accepts_marketing` كان يُكتب `true` عند كلّ التحاقٍ وحجز، ولا بابَ للعضو ينزعه —
 * فصار قبولًا يُفترَض لا يُختار. وهذا بابُه.
 */
export async function setMyMarketing(on: boolean): Promise<SettingsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { error } = await sb.from("profiles").update({ accepts_marketing: on }).eq("id", user.id);
  if (error) return { ok: false, message: `تعذّر حفظ التفضيل: ${error.message}` };

  revalidatePath("/dashboard/settings");
  return { ok: true, message: on ? "ستصلك رسائل أديب." : "لن تصلك رسائل أديب." };
}

/* ── النبذة العلنيّة ─────────────────────────────────────────────────────────
 * `profiles.bio` يُقرأ في `/m/<slug>` وفي وصف مشاركتها، ولم يكن له محرّرٌ في المنتج كلِّه —
 * فكان العضو يُعرَض عنه نصٌّ لا يملك كتابته. وهي **نصٌّ حرٌّ بالعربيّة**: لا حارسَ محارف
 * عليها (خلافًا للاسم) لأنّها جملةُ تعريفٍ لا اسمُ إنسان.
 */
export async function updateMyBio(input: { bio: string }): Promise<SettingsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة." };

  // الأسطرُ تُطوى إلى مسافة: النبذةُ سطرٌ يُعرَض في رأس صفحةٍ وفي وصف مشاركة، لا فقرات
  const bio = (input.bio ?? "").replace(/\s+/g, " ").trim();
  if (bio.length > BIO_MAX) return { ok: false, message: `النبذة ${BIO_MAX} محرفًا على الأكثر.` };

  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  // الفارغةُ تُكتب `null` لا `""` — فالعمود يقول «لا نبذة» بلغته، وصفحةُ `/m` تقرأ الغياب
  const { error } = await sb.from("profiles").update({ bio: bio || null }).eq("id", user.id);
  if (error) return { ok: false, message: `تعذّر حفظ النبذة: ${error.message}` };

  revalidatePath("/dashboard/settings");
  return { ok: true, message: bio ? "حُفظت نبذتك." : "أُزيلت نبذتك." };
}

/* ── فكُّ ربط مزوّد ──────────────────────────────────────────────────────────
 * الفعلُ خادميٌّ لا عميليّ خلافًا للربط: الربطُ مغادرةٌ إلى المزوّد وعودة، وهذا نداءٌ واحد.
 *
 * **وحارسُ «آخرِ طريق» عندنا لا عند GoTrue وحده**: GoTrue يمنع فكَّ الهويّة الأخيرة، وذلك
 * يمنع الحبسَ الكامل ولا يمنع نصفَه — فمن فكّ `email` وأبقى قوقل خرج بحسابٍ لا كلمةَ مرورَ
 * له ولا استعادةَ. فالشرطُ ههنا **اثنتان تبقى بعد الفكّ إحداهما `email`**، وإلّا رُدّ الفعلُ
 * بعلّته مسمّاةً لا برسالةٍ إنجليزيّةٍ من المزوّد.
 */
export async function unlinkMyIdentity(identityId: string): Promise<SettingsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة." };

  const identities = user.identities ?? [];
  const target = identities.find((i) => i.identity_id === identityId);
  if (!target) return { ok: false, message: "لا طريقَ بهذا المعرّف في حسابك." };

  const rest = identities.filter((i) => i.identity_id !== identityId);
  if (rest.length === 0) return { ok: false, message: "هذا آخرُ طريقٍ لدخولك، ولا يُفكّ. أضِف غيره أوّلًا." };
  if (!rest.some((i) => i.provider === "email")) {
    return { ok: false, message: "لا يبقى لك بريدٌ وكلمةُ مرور بعد فكّه، فيُغلق بابُ الاستعادة عليك." };
  }

  const { error } = await supabase.auth.unlinkIdentity(target);
  if (error) {
    // **الربطُ اليدويّ عَلَمٌ في إعداد المصادقة** (`security_manual_linking_enabled`)، ولو
    // كان مطفأً ردّ GoTrue «Manual linking is disabled» — عبارةٌ لا تقول للعضو شيئًا.
    return {
      ok: false,
      message: error.message.toLowerCase().includes("manual linking")
        ? "ربطُ الحسابات غير مفعَّلٍ في إعداد المصادقة بعد."
        : `تعذّر فكّ الربط: ${error.message}`,
    };
  }

  const label = PROVIDER_LABEL[target.provider as ProviderKey] ?? target.provider;
  revalidatePath("/dashboard/settings");
  return { ok: true, message: `فُكّ ربطُ ${label}.` };
}
