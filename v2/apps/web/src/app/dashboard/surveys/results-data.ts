// المشاركات الفرديّة بهويّات أصحابها — للوحة وحدها (لا تستوردها صفحة عامّة أبدًا).
// التجميع المجرّد من الهويّات في lib/surveys/aggregate.ts يخدم اللوحة والعموم معًا.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { Choice, QuestionType } from "./vocab";
import { fmtDateTime } from "./data";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export type ResponseRow = {
  id: number;
  /** اسم المجيب أو null للمجهول. */
  name: string | null;
  date: string;
  dateRaw: string;
  seconds: number | null;
  device: string | null;
  /** قيمة كلّ سؤال منسّقة نصًّا للعرض والتصدير — المفتاح id السؤال. */
  answers: Record<number, string>;
};

type QuestionMeta = { id: number; type: QuestionType; choices: Map<string, Choice> };

/** ينسّق قيمة إجابة واحدة نصًّا — هُويّات الخيارات تُترجم إلى تسمياتها. */
function formatAnswer(
  q: QuestionMeta,
  a: { answer_text: string | null; answer_number: number | null; answer_date: string | null; answer_time: string | null; answer_datetime: string | null; answer_boolean: boolean | null; answer_json: unknown },
): string {
  if (q.type === "yes_no") return a.answer_boolean == null ? "" : a.answer_boolean ? "نعم" : "لا";
  if (a.answer_number != null) return String(a.answer_number);
  if (a.answer_text != null) return a.answer_text;
  if (a.answer_date != null) return a.answer_date;
  if (a.answer_time != null) return a.answer_time;
  if (a.answer_datetime != null) return String(a.answer_datetime);
  const v = a.answer_json;
  const label = (id: unknown) => (typeof id === "string" ? q.choices.get(id)?.label ?? id : "");
  if (typeof v === "string") return label(v);
  if (Array.isArray(v)) return v.map(label).filter(Boolean).join("، ");
  return "";
}

/** مشاركات الاستبيان المكتملة بأسماء أصحابها وإجاباتهم المنسّقة (للجدول والتفصيل والتصدير). */
export async function getSurveyResponses(surveyId: number): Promise<{ rows: ResponseRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { rows: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const [qRes, rRes] = await Promise.all([
    sb.from("survey_questions").select("id, question_type, options").eq("survey_id", surveyId),
    sb.from("survey_responses").select("id, user_id, completed_at, time_spent_seconds, device_type").eq("survey_id", surveyId).eq("status", "completed").order("completed_at", { ascending: false }),
  ]);
  const firstErr = qRes.error || rRes.error;
  if (firstErr) return { rows: [], error: firstErr.message };

  const questions = new Map<number, QuestionMeta>(
    (qRes.data ?? []).map((q) => {
      const choices = new Map<string, Choice>();
      const opts = (q.options ?? null) as { choices?: Choice[] } | null;
      for (const c of opts?.choices ?? []) choices.set(c.id, c);
      return [q.id, { id: q.id, type: q.question_type as QuestionType, choices }];
    }),
  );

  const responses = rRes.data ?? [];
  const responseIds = responses.map((r) => r.id);
  const userIds = [...new Set(responses.map((r) => r.user_id).filter((u): u is string => !!u))];

  const [aRes, pRes] = await Promise.all([
    responseIds.length
      ? sb.from("survey_answers").select("response_id, question_id, answer_text, answer_number, answer_date, answer_time, answer_datetime, answer_boolean, answer_json").in("response_id", responseIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? sb.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const secondErr = aRes.error || pRes.error;
  if (secondErr) return { rows: [], error: secondErr.message };

  const nameByUser = new Map((pRes.data ?? []).map((p) => [p.id as string, p.full_name as string]));
  const answersByResponse = new Map<number, Record<number, string>>();
  for (const a of aRes.data ?? []) {
    const q = questions.get(a.question_id);
    if (!q) continue;
    const rec = answersByResponse.get(a.response_id) ?? {};
    rec[a.question_id] = formatAnswer(q, a);
    answersByResponse.set(a.response_id, rec);
  }

  const rows: ResponseRow[] = responses.map((r) => ({
    id: r.id,
    name: r.user_id ? nameByUser.get(r.user_id) ?? null : null,
    date: fmtDateTime(r.completed_at),
    dateRaw: r.completed_at ?? "",
    seconds: r.time_spent_seconds ?? null,
    device: r.device_type ?? null,
    answers: answersByResponse.get(r.id) ?? {},
  }));

  return { rows, error: null };
}
