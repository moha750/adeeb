// يُستورَد فقط من مكوّنات خادميّة (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { fmtDate } from "@/lib/dates";
import { getSurveyRoleMap } from "@/lib/surveys/authz";
import { isShareLevel, type AccessType, type Choice, type QuestionOptions, type QuestionType, type ShareLevel, type SurveyRole, type SurveyStatus } from "./vocab";

/** تاريخ عربيّ مختصر من ISO — الاسم القديم محفوظٌ لمستهلكيه، والتنفيذ من مصدر التنسيق الواحد (`./format`). */
export const fmtDateTime = fmtDate;

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export type SurveyRow = {
  id: number;
  title: string;
  description: string | null;
  status: SurveyStatus;
  access: AccessType;
  /** نشط وبدايته لم تحن بعد — يُعرض «مجدول» دون أن تكون حالةً مخزّنة. */
  scheduled: boolean;
  /** نشط وانتهت مدّته — يُعرض «انتهت مدّته» (الإرسال مقفل في القاعدة أصلًا). */
  expired: boolean;
  /** عَلَما الأرشفة والحذف المتعامدان (فوق الحالة) — يحدّدان الموضع: الأرشيف/المحذوفات. */
  archived: boolean;
  deleted: boolean;
  questions: number;
  responses: number;
  views: number;
  /** دورُ المستخدم الحاليّ فيه (من القاعدة): يحكم ما يظهر له من أفعال. */
  role: SurveyRole;
  /** اسم منشئ الاستبيان — من هويّة الاستبيان لا من نتائجه (يُعرض في كرت الهويّة). */
  createdBy: string | null;
  created: string;
  createdRaw: string;
  startDate: string | null;
  endDate: string | null;
};

/**
 * استبياناتُ المستخدم وحده مع أعدادها: ما يملكه، وما شُورك معه، وما يرعاه حسابُ النادي.
 * القائمةُ تُقصَر **في المصدر** على ما يردّه `survey_access_list` (لا تُجلب الكلّ ثمّ تُرشَّح)،
 * فلا يعبر استبيانُ غيره إلى المتصفّح أصلًا. والعدّادات تُحسب من الصفوف لا من أعمدة مخزّنة.
 */
export async function getSurveys(userId: string): Promise<{ surveys: SurveyRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { surveys: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const roleOf = await getSurveyRoleMap(userId);
  if (!roleOf) return { surveys: [], error: "تعذّر التحقّق من استبياناتك. حدّث الصفحة." };
  const ids = [...roleOf.keys()];
  if (!ids.length) return { surveys: [], error: null };

  const [sRes, qRes, rRes] = await Promise.all([
    sb.from("surveys").select("id, title, description, status, access_type, start_date, end_date, archived_at, deleted_at, total_views, created_at, created_by").in("id", ids).order("created_at", { ascending: false }),
    sb.from("survey_questions").select("survey_id").in("survey_id", ids),
    sb.from("survey_responses").select("survey_id").in("survey_id", ids).eq("status", "completed"),
  ]);
  const firstErr = sRes.error || qRes.error || rRes.error;
  if (firstErr) return { surveys: [], error: firstErr.message };

  // أسماء المنشئين — جمعةٌ واحدة بالهُويّات المتمايزة (لا جمعة لكلّ صفّ)
  const creatorIds = [...new Set((sRes.data ?? []).map((s) => s.created_by).filter(Boolean))] as string[];
  const creatorName = new Map<string, string>();
  if (creatorIds.length) {
    const pRes = await sb.from("profiles").select("id, full_name").in("id", creatorIds);
    if (pRes.error) return { surveys: [], error: pRes.error.message };
    for (const p of pRes.data ?? []) creatorName.set(p.id, p.full_name);
  }

  const qCount = new Map<number, number>();
  for (const q of qRes.data ?? []) qCount.set(q.survey_id, (qCount.get(q.survey_id) ?? 0) + 1);
  const rCount = new Map<number, number>();
  for (const r of rRes.data ?? []) rCount.set(r.survey_id, (rCount.get(r.survey_id) ?? 0) + 1);

  const now = Date.now();
  const surveys: SurveyRow[] = (sRes.data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description ?? null,
    status: s.status as SurveyStatus,
    access: s.access_type as AccessType,
    scheduled: s.status === "active" && !!s.start_date && new Date(s.start_date).getTime() > now,
    expired: s.status === "active" && !!s.end_date && new Date(s.end_date).getTime() < now,
    archived: s.archived_at != null,
    deleted: s.deleted_at != null,
    questions: qCount.get(s.id) ?? 0,
    responses: rCount.get(s.id) ?? 0,
    views: s.total_views ?? 0,
    role: roleOf.get(s.id) as SurveyRole, // الاستعلام مقصورٌ على مفاتيح الخريطة
    createdBy: s.created_by ? creatorName.get(s.created_by)?.trim() || null : null,
    created: fmtDateTime(s.created_at),
    createdRaw: s.created_at ?? "",
    startDate: s.start_date ?? null,
    endDate: s.end_date ?? null,
  }));

  return { surveys, error: null };
}

export type SurveyDetail = {
  id: number;
  title: string;
  description: string | null;
  status: SurveyStatus;
  access: AccessType;
  /** عَلَما الركن: يحكمان مع الدور من يحرّره (`canEditSurvey`). */
  archived: boolean;
  deleted: boolean;
  allowMultiple: boolean;
  allowAnonymous: boolean;
  showProgress: boolean;
  showResults: boolean;
  startDate: string | null; // ISO كما في القاعدة
  endDate: string | null;
  welcome: string | null;
  thankYou: string | null;
  closedMessage: string | null;
  questions: SurveyQuestion[];
};

export type SurveyQuestion = {
  id: number;
  text: string;
  description: string | null;
  type: QuestionType;
  order: number;
  required: boolean;
  choices: Choice[];
  scale: { min: number; max: number } | null;
  /** كم إجابة مخزّنة لهذا السؤال — يحكم ما يُسمح به في التحرير (نوعٌ لا يتغيّر، وحذفٌ يُصادَق عليه). */
  answers: number;
};

/**
 * استبيان واحد بأسئلته للبنّاء — مع عدد الإجابات لكلّ سؤال (يقيّد التحرير الآمن).
 * **لا يحرس نفسه**: مفتاحُ الخدمة يقرأ كلَّ شيء، فالصفحةُ تسأل `authorizeSurvey` قبله.
 */
export async function getSurveyDetail(id: number): Promise<{ survey: SurveyDetail | null; error: string | null }> {
  const sb = service();
  if (!sb) return { survey: null, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const [sRes, qRes] = await Promise.all([
    sb.from("surveys").select("*").eq("id", id).maybeSingle(),
    sb.from("survey_questions").select("*").eq("survey_id", id).order("question_order", { ascending: true }),
  ]);
  if (sRes.error) return { survey: null, error: sRes.error.message };
  if (!sRes.data) return { survey: null, error: null };
  if (qRes.error) return { survey: null, error: qRes.error.message };

  const qIds = (qRes.data ?? []).map((q) => q.id);
  const answerCount = new Map<number, number>();
  if (qIds.length) {
    const aRes = await sb.from("survey_answers").select("question_id").in("question_id", qIds);
    if (aRes.error) return { survey: null, error: aRes.error.message };
    for (const a of aRes.data ?? []) answerCount.set(a.question_id, (answerCount.get(a.question_id) ?? 0) + 1);
  }

  const s = sRes.data;
  const survey: SurveyDetail = {
    id: s.id,
    title: s.title,
    description: s.description ?? null,
    status: s.status as SurveyStatus,
    access: s.access_type as AccessType,
    archived: s.archived_at != null,
    deleted: s.deleted_at != null,
    allowMultiple: !!s.allow_multiple_responses,
    allowAnonymous: !!s.allow_anonymous,
    showProgress: !!s.show_progress_bar,
    showResults: !!s.show_results_to_participants,
    startDate: s.start_date ?? null,
    endDate: s.end_date ?? null,
    welcome: s.welcome_message ?? null,
    thankYou: s.thank_you_message ?? null,
    closedMessage: s.closed_message ?? null,
    questions: (qRes.data ?? []).map((q) => {
      const options = (q.options ?? null) as QuestionOptions;
      return {
        id: q.id,
        text: q.question_text,
        description: q.question_description ?? null,
        type: q.question_type as QuestionType,
        order: q.question_order,
        required: !!q.is_required,
        choices: options?.choices ?? [],
        scale: options?.scale ?? null,
        answers: answerCount.get(q.id) ?? 0,
      };
    }),
  };
  return { survey, error: null };
}

/* ── شركاءُ الاستبيان — لصاحبه وحده ── */

export type SurveyShareRow = { userId: string; name: string; access: ShareLevel };
export type SurveyShareCandidate = { id: string; name: string };

/**
 * شركاءُ الاستبيان ومن يصلح شريكًا: كلُّ حاملٍ لصلاحية الاستبيانات سوى صاحبه، ومن شُورِك سلفًا
 * يخرج من المرشّحين (لوحُ الشركاء يستثنيه أيضًا، والاستثناءُ هنا يُبقي القائمةَ صادقةً وحدها).
 * **لا يحرس نفسه**: الصفحةُ لا تناديه إلّا لمن كان دورُه `owner` (والأفعالُ تُعيد الفحص).
 */
export async function getSurveySharing(surveyId: number, ownerId: string): Promise<{
  rows: SurveyShareRow[];
  candidates: SurveyShareCandidate[];
  error: string | null;
}> {
  const sb = service();
  if (!sb) return { rows: [], candidates: [], error: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const [shRes, cRes] = await Promise.all([
    sb.from("survey_shares").select("user_id, access, created_at").eq("survey_id", surveyId).order("created_at", { ascending: true }),
    sb.rpc("survey_share_candidates"),
  ]);
  if (shRes.error) return { rows: [], candidates: [], error: shRes.error.message };
  if (cRes.error) return { rows: [], candidates: [], error: cRes.error.message };

  const shares = ((shRes.data ?? []) as { user_id: string; access: string }[]).filter((r) => isShareLevel(r.access));
  const ids = shares.map((r) => r.user_id);
  const pRes = ids.length ? await sb.from("profiles").select("id, full_name").in("id", ids) : { data: [], error: null };
  if (pRes.error) return { rows: [], candidates: [], error: pRes.error.message };
  const nameOf = new Map(((pRes.data ?? []) as { id: string; full_name: string | null }[]).map((p) => [p.id, (p.full_name ?? "").trim()]));

  const rows: SurveyShareRow[] = shares.map((r) => ({
    userId: r.user_id,
    name: nameOf.get(r.user_id) || "بلا اسم",
    access: r.access as ShareLevel,
  }));
  const shared = new Set(ids);
  const candidates = ((cRes.data ?? []) as { id: string; full_name: string | null }[])
    .filter((c) => c.id !== ownerId && !shared.has(c.id))
    .map((c) => ({ id: c.id, name: (c.full_name ?? "").trim() || "بلا اسم" }));

  return { rows, candidates, error: null };
}
