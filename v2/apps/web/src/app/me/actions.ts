"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdeebServiceClient } from "@adeeb/core";
import { getSessionAdmin } from "@/lib/auth";
import { PHONE_RE, PHONE_HINT } from "@/lib/membershipFields";

export const myDataSchema = z.object({
  fullName: z.string().trim().min(1, "الاسم مطلوب"),
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
    .update({ full_name: v.fullName, phone: v.phone, city: v.city?.trim() || null })
    .eq("id", me.id);
  if (error) return { ok: false, message: "تعذّر حفظ بياناتك. حاول مجدّدًا." };

  revalidatePath("/me");
  return { ok: true, message: "حُفظت بياناتك." };
}
