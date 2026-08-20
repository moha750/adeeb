"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { getSessionAdmin } from "@/lib/auth";
import { PHONE_RE, PHONE_HINT } from "@/lib/membershipFields";
import { ARABIC_NAME_HINT, arabicNameError, normalizeName } from "@/lib/personName";
import { EXIT_REASON_MIN } from "./vocab";

export const myDataSchema = z.object({
  // بالعربيّة وحدها، ومطبَّعًا: ما يُحفظ هو ما يُطبع في ورقةٍ ويُنادى به في كشف.
  fullName: z.string().trim().min(1, "الاسم مطلوب").refine((v) => !arabicNameError(v), ARABIC_NAME_HINT),
  phone: z.string().trim().regex(PHONE_RE, PHONE_HINT),
  city: z.string().trim().max(60, "المدينة أطول من اللازم").optional().or(z.literal("")),
});
export type MyDataInput = z.infer<typeof myDataSchema>;

export type SaveResult = { ok: boolean; message: string; fieldErrors?: Partial<Record<keyof MyDataInput, string>> };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/**
 * حفظُ بيانات صاحب الحساب عن نفسه.
 *
 * **بالخادم لا بالمتصفّح** — وليس اختيارًا: صلاحيّةُ الكتابة في `profiles` نُزعت عن دور
 * `authenticated` (٢٠٢٦-٠٨-٠٥) لأنّ RLS يحرس الصفوف لا الأعمدة، فمن ملك صفَّه كان يملك
 * `account_status` و`joined_date` معه. فالحدُّ ههنا: **ثلاثةُ أعمدةٍ لا رابع لها.**
 *
 * **ولا يمسّها عضو**: اسمُ العضو يحكمه `profile_name_changes` وبياناتُه في ملفّه باللوحة —
 * فلو حُرّرت من ههنا لَصار للاسم بابان أحدُهما بلا حَكَم.
 */
export async function saveMyData(raw: MyDataInput): Promise<SaveResult> {
  const me = await getSessionAdmin();
  if (!me) return { ok: false, message: "جلستك غير صالحة. سجّل دخولك من جديد." };

  const parsed = myDataSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "راجع الحقول المميّزة بالأحمر.", fieldErrors };
  }
  const v = parsed.data;

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص. أبلغ الإدارة." };

  const { data: p, error: pErr } = await sb
    .from("profiles").select("joined_date").eq("id", me.id).maybeSingle();
  if (pErr) return { ok: false, message: "تعذّرت قراءة بياناتك. حاول مجدّدًا." };
  if (!p) return { ok: false, message: "لا بيانات لك بعد. أكمِلها أوّلًا." };
  if (p.joined_date != null) {
    return { ok: false, message: "بياناتُك عضوًا تُحرَّر من ملفّك في بوّابة أديب." };
  }

  const { error } = await sb
    .from("profiles")
    .update({ full_name: normalizeName(v.fullName), phone: v.phone, city: v.city?.trim() || null })
    .eq("id", me.id);
  if (error) return { ok: false, message: "تعذّر حفظ بياناتك. حاول مجدّدًا." };

  revalidatePath("/me");
  return { ok: true, message: "حُفظت بياناتك." };
}

/* ── حذفُ الحساب ─────────────────────────────────────────────────────────────
 * قرارُ المالك ١٩ أغسطس ٢٠٢٦، ونصُّه في `v2/ACCOUNT-DELETION.md`. وههنا **بابُه الوحيد**:
 * تناديه ثلاثُ شاشاتٍ (هذه الصفحة، وإعداداتُ اللوحة، وتبويبُ «أنا» في التطبيق) فلا يتفرّق
 * الفعلُ في ثلاثةِ نسخٍ تختلف غدًا.
 *
 * **والحُكمُ كلُّه في القاعدة** على مثال `revoke_my_session`: الفاعلُ من `auth.uid()` لا من
 * معرّفٍ يُمرَّر، ومنعُ حاملِ المنصب في الدالّة لا في هذا الملفّ. فما ههنا إلّا إثباتُ أنّ
 * الضاغطَ هو صاحبُ الحساب حقًّا، ثمّ نقلُ جوابِ القاعدة كما هو.
 */

export type DeletionResult = { ok: boolean; message: string; dueAt?: string };

/**
 * إثباتُ الحضور قبل الفعل: **جلسةٌ مفتوحةٌ على جهازٍ متروك ليست رضًا بحذف حساب** — وهي
 * الحجّةُ نفسُها التي بُني عليها تبديلُ كلمة المرور في الإعدادات، والفعلُ ههنا أشدُّ منه.
 *
 * ومن دخل بقوقل أو أبل فلا كلمةَ مرورٍ له تُثبِت، فيكفيه أن يكتب «حذف» بيده: أثبتُّ ما
 * يمكن إثباتُه ولم أُغلق البابَ في وجه من لا مفتاحَ نصيًّا له.
 */
async function proveItIsMe(input: { password?: string; captchaToken?: string }): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "جلستك غير صالحة. سجّل دخولك من جديد.";

  const hasPassword = (user.identities ?? []).some((i) => i.provider === "email");
  if (!hasPassword) return null;

  const password = input.password ?? "";
  if (!password) return "أدخِل كلمة المرور لتأكيد أنّك أنت.";

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password,
    options: { captchaToken: input.captchaToken },
  });
  if (!error) return null;
  return error.message.toLowerCase().includes("captcha")
    ? "تعذّر التأكّد أنّك لست روبوتًا. أعِد المحاولة."
    : "كلمة المرور غير صحيحة.";
}

/** طلبُ الحذف. تُعيد رسالةَ القاعدة كما هي — ومنها منعُ حاملِ المنصب باسم مقعده. */
export async function requestMyDeletion(
  input: { password?: string; captchaToken?: string; reason?: string } = {},
): Promise<DeletionResult> {
  const denied = await proveItIsMe(input);
  if (denied) return { ok: false, message: denied };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_my_account_deletion", {
    p_reason: input.reason?.trim() || null,
  });
  if (error) return { ok: false, message: "تعذّر تسجيل طلبك. حاول مجدّدًا." };

  const res = (data ?? {}) as { ok?: boolean; message?: string; dueAt?: string };
  revalidatePath("/me");
  revalidatePath("/dashboard/settings");
  if (!res.ok) return { ok: false, message: res.message ?? "تعذّر تسجيل طلبك." };
  return {
    ok: true,
    dueAt: res.dueAt,
    message: "سُجّل طلبُك. لك ثلاثون يومًا تعدل فيها إن شئت.",
  };
}

/** العدولُ داخل المهلة. وبعد التنفيذ لا جلسةَ تبلغ هذا الباب أصلًا. */
export async function cancelMyDeletion(): Promise<DeletionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة. سجّل دخولك من جديد." };

  const { data, error } = await supabase.rpc("cancel_my_account_deletion");
  if (error) return { ok: false, message: "تعذّر إلغاء الطلب. حاول مجدّدًا." };

  const res = (data ?? {}) as { ok?: boolean; message?: string };
  revalidatePath("/me");
  revalidatePath("/dashboard/settings");
  return { ok: res.ok === true, message: res.message ?? "تعذّر إلغاء الطلب." };
}

/* ── الخروجُ من العضويّة ─────────────────────────────────────────────────────
 * قرارُ المالك ٢٠ أغسطس ٢٠٢٦: العضويّةُ تُنهى **قبل** الحساب لا معه. وثلاثةُ أبوابٍ يقسمها
 * `membership_exit_door` في القاعدة: زرٌّ فوريٌّ لعضو اللجنة ومن لا مقعدَ له، وطلبٌ يُقرّ
 * لحامل المنصب القياديّ، وإخلاءُ مقعدٍ بيده للرئيسين.
 *
 * **والسببُ إجباريٌّ في البابين** بأمره، وحدُّه في القاعدة لا ههنا: خمسةُ محارف. وما في هذا
 * الملفّ إلّا فحصٌ أوّلٌ يريح صاحبَه من رحلةٍ إلى الخادم، والحُكمُ هناك.
 */

export async function endMyMembership(reason: string): Promise<DeletionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة. سجّل دخولك من جديد." };
  if (reason.trim().length < EXIT_REASON_MIN) return { ok: false, message: "اكتب سببًا لخروجك." };

  const { data, error } = await supabase.rpc("end_my_membership", { p_reason: reason.trim() });
  if (error) return { ok: false, message: "تعذّر إنهاء عضويّتك. حاول مجدّدًا." };

  const res = (data ?? {}) as { ok?: boolean; message?: string };
  revalidatePath("/me");
  revalidatePath("/dashboard", "layout");
  return { ok: res.ok === true, message: res.message ?? "تعذّر إنهاء عضويّتك." };
}

export async function requestMembershipExit(reason: string): Promise<DeletionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة. سجّل دخولك من جديد." };
  if (reason.trim().length < EXIT_REASON_MIN) return { ok: false, message: "اكتب سببًا لطلبك." };

  const { data, error } = await supabase.rpc("request_membership_exit", { p_reason: reason.trim() });
  if (error) return { ok: false, message: "تعذّر إرسال طلبك. حاول مجدّدًا." };

  const res = (data ?? {}) as { ok?: boolean; message?: string };
  revalidatePath("/me");
  revalidatePath("/dashboard/settings");
  return { ok: res.ok === true, message: res.message ?? "تعذّر إرسال طلبك." };
}

export async function withdrawMembershipExit(): Promise<DeletionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة. سجّل دخولك من جديد." };

  const { data, error } = await supabase.rpc("withdraw_membership_exit");
  if (error) return { ok: false, message: "تعذّر سحب طلبك. حاول مجدّدًا." };

  const res = (data ?? {}) as { ok?: boolean; message?: string };
  revalidatePath("/me");
  revalidatePath("/dashboard/settings");
  return { ok: res.ok === true, message: res.message ?? "تعذّر سحب طلبك." };
}
