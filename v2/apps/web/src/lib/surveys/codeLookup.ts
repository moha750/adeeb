import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { isSurveyCode } from "./code";

/**
 * **بين الرمز والرقم** — للخادم وحده (مفتاحُ الخدمة).
 *
 * الرمزُ وجهُ الرابط، والرقمُ مفتاحُ كلّ ما سواه (الأسئلة، الإجابات، التجميع). فمن دخل
 * بالرمز يُترجَم إلى رقمه، ومن دخل برابطٍ قديمٍ بالرقم يُترجَم إلى رمزه ليُحوَّل.
 * والفشلُ (مفتاحٌ غائب، شكلٌ خاطئ، لا وجود) كلُّه `null`: النداءُ يعامله «غير موجود».
 */
function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export async function surveyIdByCode(code: string): Promise<number | null> {
  if (!isSurveyCode(code)) return null;
  const sb = service();
  if (!sb) return null;
  const { data } = await sb.from("surveys").select("id").eq("code", code).maybeSingle();
  return typeof data?.id === "number" ? data.id : null;
}

export async function surveyCodeById(id: number): Promise<string | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const sb = service();
  if (!sb) return null;
  const { data } = await sb.from("surveys").select("code").eq("id", id).maybeSingle();
  return typeof data?.code === "string" && isSurveyCode(data.code) ? data.code : null;
}
