// تجميع نتائج الاستبيان — مصدر واحد لقارئين: شاشة النتائج في اللوحة،
// وصفحة النتائج العامّة للمشاركين (حين يفعّل المالك «إظهار النتائج»).
// خادميّ حصرًا (مفتاح الخدمة)، ولا يحمل هويّات المجيبين — الهويّات تُجلب
// في طبقة اللوحة وحدها (dashboard/surveys/results-data.ts).
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { Choice, QuestionType } from "@/app/dashboard/surveys/vocab";
import { hasChoices } from "@/app/dashboard/surveys/vocab";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export type ChoiceCount = { id: string; label: string; retired: boolean; count: number };

export type QuestionAgg = {
  qid: number;
  text: string;
  type: QuestionType;
  required: boolean;
  answered: number;
} & (
  | { kind: "choice"; items: ChoiceCount[] }
  | { kind: "boolean"; yes: number; no: number }
  | { kind: "number"; avg: number | null; min: number | null; max: number | null; dist: { value: number; count: number }[]; scale: { min: number; max: number } | null }
  | { kind: "text"; samples: string[] }
);

export type SurveyAggregates = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  access: string; // access_type — لبوّابة النتائج العلنيّة (للأعضاء فقط)
  archived: boolean;
  deleted: boolean;
  showResults: boolean;
  totals: {
    responses: number;
    views: number;
    avgSeconds: number | null;
    lastAt: string | null; // ISO آخر مشاركة
  };
  questions: QuestionAgg[];
};

type AnswerRow = {
  response_id: number;
  question_id: number;
  answer_text: string | null;
  answer_number: number | null;
  answer_date: string | null;
  answer_time: string | null;
  answer_datetime: string | null;
  answer_boolean: boolean | null;
  answer_json: unknown;
};

/** يجمع نتائج استبيان — المشاركات المكتملة وحدها (الصفوف التاريخيّة غير المكتملة تُستثنى). */
export async function getSurveyAggregates(surveyId: number, opts?: { includeText?: boolean }): Promise<{ agg: SurveyAggregates | null; error: string | null }> {
  // النصوص الحرّة الفرديّة (آراءٌ = PII) للوحة وحدها؛ المسار العلنيّ لا يتلقّاها أصلًا (دفاعٌ في العمق)
  const includeText = opts?.includeText ?? false;
  const sb = service();
  if (!sb) return { agg: null, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const [sRes, qRes, rRes] = await Promise.all([
    sb.from("surveys").select("id, title, description, status, access_type, archived_at, deleted_at, show_results_to_participants, total_views").eq("id", surveyId).maybeSingle(),
    sb.from("survey_questions").select("id, question_text, question_type, question_order, is_required, options").eq("survey_id", surveyId).order("question_order", { ascending: true }),
    sb.from("survey_responses").select("id, completed_at, time_spent_seconds").eq("survey_id", surveyId).eq("status", "completed"),
  ]);
  const firstErr = sRes.error || qRes.error || rRes.error;
  if (firstErr) return { agg: null, error: firstErr.message };
  if (!sRes.data) return { agg: null, error: null };

  const responses = rRes.data ?? [];
  const responseIds = new Set(responses.map((r) => r.id));

  let answers: AnswerRow[] = [];
  if (responseIds.size) {
    const aRes = await sb
      .from("survey_answers")
      .select("response_id, question_id, answer_text, answer_number, answer_date, answer_time, answer_datetime, answer_boolean, answer_json")
      .in("response_id", [...responseIds]);
    if (aRes.error) return { agg: null, error: aRes.error.message };
    answers = (aRes.data ?? []) as AnswerRow[];
  }

  const byQuestion = new Map<number, AnswerRow[]>();
  for (const a of answers) {
    const list = byQuestion.get(a.question_id) ?? [];
    list.push(a);
    byQuestion.set(a.question_id, list);
  }

  const questions: QuestionAgg[] = (qRes.data ?? []).map((q) => {
    const rows = byQuestion.get(q.id) ?? [];
    const base = {
      qid: q.id as number,
      text: q.question_text as string,
      type: q.question_type as QuestionType,
      required: !!q.is_required,
      answered: rows.length,
    };
    const options = (q.options ?? null) as { choices?: Choice[]; scale?: { min: number; max: number } } | null;

    if (hasChoices(q.question_type)) {
      // العدّ بهُويّة الخيار. المقام = الإجاباتُ **المعدودة فعلًا** (لا الصفوف الخام الفارغة/التالفة)،
      // فتبلغ النِّسَب ١٠٠٪ للاختيار الواحد. المتعدّد يتجاوزها بطبعه (كلّ مجيبٍ عدّة اختيارات).
      const counts = new Map<string, number>();
      let answered = 0;
      for (const a of rows) {
        const v = a.answer_json;
        if (typeof v === "string") { counts.set(v, (counts.get(v) ?? 0) + 1); answered++; }
        else if (Array.isArray(v) && v.length) {
          for (const c of v) if (typeof c === "string") counts.set(c, (counts.get(c) ?? 0) + 1);
          answered++;
        }
      }
      const known = new Set((options?.choices ?? []).map((c) => c.id));
      const items: ChoiceCount[] = (options?.choices ?? []).map((c) => ({
        id: c.id,
        label: c.label,
        retired: !!c.retired,
        count: counts.get(c.id) ?? 0,
      }));
      // خيارات أُزيلت من النموذج **نهائيًّا** (لا مجرّد متقاعدة) ولها إجابات تاريخيّة — تُعرَض بعدّها لا تُسقَط
      for (const [cid, cnt] of counts) if (!known.has(cid)) items.push({ id: cid, label: "(خيار محذوف)", retired: false, count: cnt });
      return { ...base, answered, kind: "choice", items };
    }

    if (q.question_type === "yes_no") {
      let yes = 0, no = 0;
      for (const a of rows) {
        if (a.answer_boolean === true) yes++;
        else if (a.answer_boolean === false) no++;
      }
      return { ...base, kind: "boolean", yes, no };
    }

    if (q.question_type === "number" || q.question_type === "rating_stars" || q.question_type === "linear_scale") {
      const nums = rows.map((a) => Number(a.answer_number)).filter((n) => Number.isFinite(n));
      const dist = new Map<number, number>();
      for (const n of nums) dist.set(n, (dist.get(n) ?? 0) + 1);
      return {
        ...base,
        kind: "number",
        avg: nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100 : null,
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
        dist: [...dist.entries()].sort((a, b) => a[0] - b[0]).map(([value, count]) => ({ value, count })),
        scale: options?.scale ?? null,
      };
    }

    // النصوص والقيم (بريد/جوّال/رابط/تاريخ/وقت) — للوحة وحدها؛ العلنيّ يأخذ العدّ بلا أيّ نصّ فرديّ
    const samples = includeText
      ? rows
          .map((a) => a.answer_text ?? a.answer_date ?? a.answer_time ?? (a.answer_datetime ? String(a.answer_datetime) : null))
          .filter((v): v is string => v != null && v !== "")
      : [];
    return { ...base, kind: "text", samples };
  });

  const seconds = responses.map((r) => r.time_spent_seconds).filter((n): n is number => typeof n === "number" && n > 0);
  const lastAt = responses.reduce<string | null>((acc, r) => (r.completed_at && (!acc || r.completed_at > acc) ? r.completed_at : acc), null);

  return {
    agg: {
      id: sRes.data.id,
      title: sRes.data.title,
      description: sRes.data.description ?? null,
      status: sRes.data.status,
      access: sRes.data.access_type,
      archived: sRes.data.archived_at != null,
      deleted: sRes.data.deleted_at != null,
      showResults: !!sRes.data.show_results_to_participants,
      totals: {
        responses: responses.length,
        views: sRes.data.total_views ?? 0,
        avgSeconds: seconds.length ? Math.round(seconds.reduce((s, n) => s + n, 0) / seconds.length) : null,
        lastAt,
      },
      questions,
    },
    error: null,
  };
}
