"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";

export type CertificateResult = {
  ok: boolean;
  message: string;
  /** اللقطة كما كُتبت في السجلّ — منها تُرسَم الورقة، فلا ترسم الواجهة من عندها. */
  issued?: {
    id: string;
    serial: string;
    holderName: string;
    positionTitle: string;
    periodFrom: string;
    periodTo: string;
  };
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * إصدار شهادة خبرة — **لا بوّابة قدرةٍ هنا، والحكم في القاعدة وحدها**: `issue_certificate`
 * تسأل `can_issue_certificate` (القدرةَ والمدى معًا)، وتبني اللقطة من القاعدة لا من المتصفّح.
 * والاسمُ والمسمّى يُمرَّران **تصحيحًا لما شذّ** لا كتابةً حرّة.
 */
export async function issueCertificate(input: {
  userId: string;
  name?: string | null;
  position?: string | null;
}): Promise<CertificateResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("issue_certificate", {
    p_actor: admin.id,
    p_user: input.userId,
    p_name: input.name?.trim() || null,
    p_position: input.position?.trim() || null,
  });
  if (error) return { ok: false, message: `تعذّر إصدار الشهادة: ${error.message}` };

  const r = (data ?? {}) as {
    ok?: boolean; message?: string; id?: string; serial?: string;
    holder_name?: string; position_title?: string; period_from?: string; period_to?: string;
  };
  if (r.ok) revalidatePath("/dashboard/members", "layout");

  return {
    ok: !!r.ok,
    message: r.message ?? (r.ok ? "صدرت الشهادة." : "تعذّر إصدار الشهادة."),
    issued: r.ok
      ? {
          id: r.id ?? "",
          serial: r.serial ?? "",
          holderName: r.holder_name ?? "",
          positionTitle: r.position_title ?? "",
          periodFrom: r.period_from ?? "",
          periodTo: r.period_to ?? "",
        }
      : undefined,
  };
}

/** إبطال شهادةٍ خرجت بخطأ — بقرارٍ مُسبَّب، وتبقى في السجلّ مشطوبة. */
export async function revokeCertificate(input: { id: string; reason: string }): Promise<CertificateResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("revoke_certificate", {
    p_actor: admin.id,
    p_id: input.id,
    p_reason: input.reason,
  });
  if (error) return { ok: false, message: `تعذّر إبطال الشهادة: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string };
  if (r.ok) revalidatePath("/dashboard/members", "layout");
  return { ok: !!r.ok, message: r.message ?? (r.ok ? "أُبطلت الشهادة." : "تعذّر إبطال الشهادة.") };
}
