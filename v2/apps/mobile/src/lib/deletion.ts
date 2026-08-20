import { fmtDate } from "@adeeb/core/dates";

import { supabase } from "./supabase";

/**
 * حذفُ الحساب من التطبيق.
 *
 * **وليس ترفًا**: أبل تشترط على كلّ تطبيقٍ يُنشئ الحسابات أن يفتح بابَ حذفها **داخله** لا
 * أن يحيل إلى موقع. ودخولُ هذا التطبيق بأبل وحدَه اليوم، فالشرطُ واقعٌ علينا لا نظريّ.
 *
 * والحُكمُ كلُّه في القاعدة كما في الويب سواءً (`request_my_account_deletion`): الفاعلُ من
 * `auth.uid()`، ومنعُ حاملِ المنصب هناك، والمهلةُ ثلاثون يومًا. فما ههنا إلّا نقلُ الجواب.
 */

export type DeletionState = { requestedAt: string | null; dueAt: string | null };

export type DeletionResult = { ok: boolean; message: string };

/**
 * «١٨ سبتمبر ٢٠٢٦» بتوقيت الرياض لا بساعة الجهاز، فقد يكون صاحبُه مسافرًا.
 * والرسّامُ واحدٌ للويب والتطبيق (`@adeeb/core/dates`) منذ ٢٠٢٦-٠٨-٢٠: شهرٌ واحدٌ
 * بحروفٍ واحدةٍ في الشاشتين.
 */
export const dueLabel = (iso: string | null): string | null => (iso ? fmtDate(iso) || null : null);

export async function getMyDeletion(): Promise<DeletionState> {
  const { data, error } = await supabase.rpc("my_account_deletion");
  if (error || !data) return { requestedAt: null, dueAt: null };
  const d = data as { requestedAt?: string | null; dueAt?: string | null };
  return { requestedAt: d.requestedAt ?? null, dueAt: d.dueAt ?? null };
}

export async function requestDeletion(): Promise<DeletionResult> {
  const { data, error } = await supabase.rpc("request_my_account_deletion", { p_reason: null });
  if (error) return { ok: false, message: "تعذّر تسجيل طلبك. حاول مجدّدًا." };
  const res = (data ?? {}) as { ok?: boolean; message?: string };
  return res.ok
    ? { ok: true, message: "سُجّل طلبُك. لك ثلاثون يومًا تعدل فيها إن شئت." }
    : { ok: false, message: res.message ?? "تعذّر تسجيل طلبك." };
}

export async function cancelDeletion(): Promise<DeletionResult> {
  const { data, error } = await supabase.rpc("cancel_my_account_deletion");
  if (error) return { ok: false, message: "تعذّر إلغاء الطلب. حاول مجدّدًا." };
  const res = (data ?? {}) as { ok?: boolean; message?: string };
  return { ok: res.ok === true, message: res.message ?? "تعذّر إلغاء الطلب." };
}
