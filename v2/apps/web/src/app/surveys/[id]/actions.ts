"use server";

import { headers } from "next/headers";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { submitErrorMessage } from "@/app/dashboard/surveys/vocab";

export type SubmitResult = { ok: boolean; message: string };

/**
 * درع Turnstile — يتحقّق من رمز العميل لدى Cloudflare قبل قبول الإرسال.
 * غياب المفتاح السرّيّ (تجربةٌ محليّة بلا إعداد) يُسقط الدرع؛ وجودُه (الإنتاج) يفرضه.
 * يعيد رسالة خطأٍ عربيّة عند الفشل، أو null عند المرور.
 */
async function verifyTurnstile(token: string | undefined): Promise<string | null> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return null; // الدرع غير مُفعَّل هنا
  if (!token) return "تعذّر التحقّق من أنّك لست روبوتًا. حدّث الصفحة وأعد المحاولة.";

  const form = new URLSearchParams({ secret, response: token });
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) form.append("remoteip", ip);

  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = (await resp.json()) as { success?: boolean };
    if (data.success === true) return null;
  } catch { /* تعذّر الوصول لـCloudflare — نرفض بأمان */ }
  return "فشل التحقّق من أنّك لست روبوتًا. حدّث الصفحة وأعد المحاولة.";
}

/**
 * إرسال مشاركة — الطريق الوحيد للكتابة: لا سياسة RLS تسمح بإدراجٍ من المتصفّح،
 * وكلّ الفرض (النافذة الزمنيّة · العضويّة · الاستجابة الواحدة · صحّة كلّ إجابة بنوعها)
 * في دالّة القاعدة submit_survey_response (SECURITY DEFINER، ذرّيّة، لا يستدعيها إلا الخادم).
 * الهويّة تُقرأ من الجلسة هنا — لا يُؤتمن العميل على p_user_id.
 */
export async function submitSurveyResponse(input: {
  surveyId: number;
  /** {questionId: قيمة بحسب النوع} — الدالّة تتحقّق من كلّ قيمة. */
  answers: Record<string, unknown>;
  seconds?: number;
  device?: string;
  /** رمز Turnstile من الودجة — يُتحقَّق منه قبل لمس القاعدة. */
  turnstileToken?: string;
}): Promise<SubmitResult> {
  if (!Number.isInteger(input.surveyId) || input.surveyId <= 0) return { ok: false, message: "استبيان غير معروف." };
  if (!input.answers || typeof input.answers !== "object") return { ok: false, message: "لا إجابات لإرسالها." };

  // درع مكافحة الروبوتات أوّلًا — قبل أيّ استعلامٍ أو كتابة
  const shieldError = await verifyTurnstile(input.turnstileToken);
  if (shieldError) return { ok: false, message: shieldError };

  // هويّة المجيب إن كان مسجَّلًا — اختياريّة؛ الزائر يمرّ بلا جلسة
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { ok: false, message: "إعداد الخادم ناقص. أبلغ الإدارة." };
  const sb = createAdeebServiceClient(url, key);

  const device = ["mobile", "tablet", "desktop"].includes(input.device ?? "") ? input.device : null;
  const seconds = Number.isFinite(input.seconds) && (input.seconds as number) >= 0 ? Math.round(input.seconds as number) : null;

  const { error } = await sb.rpc("submit_survey_response", {
    p_survey_id: input.surveyId,
    p_user_id: user?.id ?? null,
    p_answers: input.answers,
    p_time_spent_seconds: seconds,
    p_device_type: device,
  });
  if (error) return { ok: false, message: submitErrorMessage(error.message) };

  return { ok: true, message: "أُرسلت إجاباتك، شكرًا لمشاركتك." };
}
