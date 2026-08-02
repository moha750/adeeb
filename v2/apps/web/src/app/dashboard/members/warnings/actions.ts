"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";

export type WarningResult = {
  ok: boolean;
  message: string;
  /** رتبةُ الإنذار الصادر — منها يُبنى الخطاب والرسالة. */
  ordinal?: number;
  activeCount?: number;
  limit?: number;
  /** هل سُحبت العضويّة ببلوغ الحدّ؟ */
  terminated?: boolean;
  /** (للإلغاء) كان هذا الإنذار هو الذي سحب العضويّة، وصاحبه ما زال موقوفًا. */
  offerRestore?: boolean;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * إصدار إنذار — **لا بوّابة قدرةٍ هنا، والحكم في القاعدة وحدها** (كما في إنهاء العضوية):
 * `issue_warning` تسأل `can_issue_warning` — قدرةَ الفعل ومدى السلطة معًا — فلا يُردّ صاحبُ
 * سلطةٍ حقيقيّة ولا يمرّ من لا يملكها. وبلوغُ الحدّ يسحب العضويّة داخل الدالّة نفسها.
 */
export async function issueWarning(input: {
  userId: string;
  category: string;
  reason: string;
  committeeId?: number | null;
  occurredOn?: string | null;
}): Promise<WarningResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("issue_warning", {
    p_actor: admin.id,
    p_user: input.userId,
    p_category: input.category,
    p_reason: input.reason,
    p_committee: input.committeeId ?? null,
    p_occurred: input.occurredOn || null,
  });
  if (error) return { ok: false, message: `تعذّر تسجيل الإنذار: ${error.message}` };

  const r = (data ?? {}) as {
    ok?: boolean; message?: string; ordinal?: number; active_count?: number; limit?: number; terminated?: boolean;
  };
  if (r.ok) {
    revalidatePath("/dashboard/members", "layout");
    revalidatePath("/dashboard");
  }
  return {
    ok: !!r.ok,
    message: r.message ?? (r.ok ? "سُجِّل الإنذار." : "تعذّر تسجيل الإنذار."),
    ordinal: r.ordinal,
    activeCount: r.active_count,
    limit: r.limit,
    terminated: !!r.terminated,
  };
}

/** إلغاء إنذار بقرارٍ مُسبَّب — يخرج من العدّ ويبقى في السجلّ مشطوبًا. */
export async function cancelWarning(input: { warningId: string; reason: string }): Promise<WarningResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("cancel_warning", {
    p_actor: admin.id,
    p_warning: input.warningId,
    p_reason: input.reason,
  });
  if (error) return { ok: false, message: `تعذّر إلغاء الإنذار: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string; was_termination?: boolean; member_suspended?: boolean };
  if (r.ok) {
    revalidatePath("/dashboard/members", "layout");
    revalidatePath("/dashboard");
  }
  return {
    ok: !!r.ok,
    message: r.message ?? (r.ok ? "أُلغي الإنذار." : "تعذّر إلغاء الإنذار."),
    // العضويّة لا تُعاد صامتةً: نقول للواجهة أن تعرض الزرّ، وسلطتُه سلطةُ الإعادة لا الإلغاء.
    offerRestore: !!r.was_termination && !!r.member_suspended,
  };
}
