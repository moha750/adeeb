"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { submitErrorMessage } from "@/app/dashboard/surveys/vocab";

export type SubmitResult = { ok: boolean; message: string };

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
