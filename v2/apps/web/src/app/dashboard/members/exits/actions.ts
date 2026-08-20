"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * القضاءُ في طلب إنهاء العضويّة — قبولًا أو ردًّا.
 *
 * **والحارسُ في القاعدة لا ههنا** (`decide_membership_exit` تنادي `can_decide_membership_exit`
 * وتقرأ `auth.uid()`): فمعرّفُ الطلب الممرَّرُ من الشاشة **مرشّحٌ لا إذن**، ومن نادى بغير
 * حقٍّ ردّته الدالّةُ بجوابها العربيّ الذي يُعرَض كما هو.
 */
export type DecideResult = { ok: boolean; message: string };

export async function decideExit(
  input: { id: string; approve: boolean; reason?: string },
): Promise<DecideResult> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, message: "جلستك غير صالحة." };

  const { data, error } = await sb.rpc("decide_membership_exit", {
    p_request: input.id,
    p_approve: input.approve,
    p_reason: input.reason?.trim() || null,
  });
  if (error) return { ok: false, message: "تعذّر تنفيذ القرار. حاول مجدّدًا." };

  const res = (data ?? {}) as { ok?: boolean; message?: string };
  revalidatePath("/dashboard/members/exits");
  return { ok: res.ok === true, message: res.message ?? "تعذّر تنفيذ القرار." };
}
