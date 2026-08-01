"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getSurveyManager } from "@/lib/surveys/authz";
import {
  ACCESS_TYPES, QUESTION_TYPE_VALUES, SCALE_MAX, SCALE_MIN, STATUS_OPS,
  hasChoices, hasScale,
  type AccessType, type Choice, type QuestionType, type StatusOp, type SurveyStatus,
} from "./vocab";
import { toPublicSurvey, toPublicQuestions } from "@/app/surveys/[id]/public";
import type { PublicSurvey, PublicQuestion } from "@/app/surveys/[id]/SurveyRespond";

export type SurveyResult = { ok: boolean; message: string; id?: number };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/** يحوّل الفارغ إلى null ويقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ. */
const clean = (v: string | null | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

export type QuestionInput = {
  /** id في القاعدة — null للسؤال الجديد. */
  id: number | null;
  text: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  /** خيارات الأنواع الاختياريّة — الموجود يحمل هُويّته، والجديد id فارغ يعيّنه الخادم. */
  choices?: { id: string | null; label: string }[];
  scale?: { min: number; max: number };
};

export type SurveyInput = {
  title: string;
  description?: string;
  access: AccessType;
  allowMultiple: boolean;
  allowAnonymous: boolean;
  showProgress: boolean;
  showResults: boolean;
  startDate?: string | null; // ISO أو null
  endDate?: string | null;
  welcome?: string;
  thankYou?: string;
  closedMessage?: string;
  questions: QuestionInput[];
};

/* ── التحقّق المشترك — نفس قيود القاعدة برسائل عربيّة (لا نثق بالعميل) ── */

function validateSurvey(input: SurveyInput): string | null {
  if (!clean(input.title)) return "عنوان الاستبيان مطلوب.";
  if (!ACCESS_TYPES.some((a) => a.value === input.access)) return "نوع وصول غير معروف.";
  if (input.startDate && input.endDate && new Date(input.startDate) >= new Date(input.endDate)) {
    return "تاريخ النهاية يجب أن يلي تاريخ البداية.";
  }
  for (const q of input.questions) {
    if (!clean(q.text)) return "كلّ سؤال يحتاج نصًّا.";
    if (!QUESTION_TYPE_VALUES.includes(q.type)) return "نوع سؤال غير معروف.";
    if (hasChoices(q.type)) {
      const labels = (q.choices ?? []).map((c) => clean(c.label)).filter(Boolean);
      if (labels.length < 2) return `السؤال «${q.text.slice(0, 40)}» يحتاج خيارين على الأقلّ.`;
      if (new Set(labels).size !== labels.length) return `السؤال «${q.text.slice(0, 40)}» فيه خيارات مكرّرة.`;
    }
    if (hasScale(q.type)) {
      const s = q.scale ?? { min: 1, max: 5 };
      if (!Number.isInteger(s.min) || !Number.isInteger(s.max) || s.min < SCALE_MIN || s.max > SCALE_MAX || s.min >= s.max) {
        return `مقياس السؤال «${q.text.slice(0, 40)}» غير صالح (من ${SCALE_MIN} إلى ${SCALE_MAX} والبداية قبل النهاية).`;
      }
    }
  }
  return null;
}

/** أعمدة surveys من مُدخَل النموذج — مكان واحد للإنشاء والتحديث معًا. */
function surveyColumns(input: SurveyInput) {
  return {
    title: clean(input.title),
    description: clean(input.description),
    access_type: input.access,
    allow_multiple_responses: input.allowMultiple,
    allow_anonymous: input.allowAnonymous,
    show_progress_bar: input.showProgress,
    show_results_to_participants: input.showResults,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    welcome_message: clean(input.welcome),
    thank_you_message: clean(input.thankYou),
    closed_message: clean(input.closedMessage),
  };
}

/**
 * بناء عمود options لسؤال — هُويّات الخيارات ثابتة:
 * الموجود يحتفظ بهُويّته، والجديد يأخذ التالية، والمحذوف **ذو الإجابات** يتقاعد
 * (retired) فلا يُعرض للمجيب ويبقى تجميعه صادقًا — لا حذف يُيتّم إجابات.
 */
function buildOptions(
  q: QuestionInput,
  existing: Choice[] | null,
  hasAnswers: boolean,
): { choices?: Choice[]; scale?: { min: number; max: number } } | null {
  if (hasChoices(q.type)) {
    const prior = existing ?? [];
    const nextIndex = () =>
      1 + prior.concat(result).reduce((mx, c) => {
        const m = /^c(\d+)$/.exec(c.id);
        return m ? Math.max(mx, Number(m[1])) : mx;
      }, 0);
    const result: Choice[] = [];
    const seen = new Set<string>();
    for (const c of q.choices ?? []) {
      const label = clean(c.label);
      if (!label) continue;
      const id = c.id && prior.some((p) => p.id === c.id) ? c.id : `c${nextIndex()}`;
      result.push({ id, label });
      seen.add(id);
    }
    // المحذوف ذو الإجابات يتقاعد بدل أن يُمحى — والمتقاعد سلفًا يبقى متقاعدًا
    for (const p of prior) {
      if (seen.has(p.id)) continue;
      if (p.retired || hasAnswers) result.push({ id: p.id, label: p.label, retired: true });
    }
    return { choices: result };
  }
  if (hasScale(q.type)) return { scale: q.scale ?? { min: 1, max: 5 } };
  return null;
}

/* ── الإنشاء ── */

export async function createSurvey(input: SurveyInput, publish = false): Promise<SurveyResult> {
  const mgr = await getSurveyManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الاستبيانات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const invalid = validateSurvey(input);
  if (invalid) return { ok: false, message: invalid };
  // حارس النشر المباشر — كـ setSurveyStatus('publish'): لا نشرَ بلا سؤال (والموجودُ صحّحه validateSurvey)
  if (publish && input.questions.length === 0) return { ok: false, message: "أضِف سؤالًا واحدًا على الأقلّ قبل النشر." };

  // يُنشأ مسودّةً ثمّ تُدرَج الأسئلة ثمّ يُنشَر (إن طُلب): فإن فشل إدراج الأسئلة بقي مسودّةً — لا يُنشَر بلا أسئلته
  const { data: created, error } = await sb
    .from("surveys")
    .insert({ ...surveyColumns(input), status: "draft", created_by: mgr.userId })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: `تعذّر إنشاء الاستبيان: ${error?.message ?? "بلا تفاصيل"}` };

  if (input.questions.length) {
    const rows = input.questions.map((q, i) => ({
      survey_id: created.id,
      question_text: clean(q.text),
      question_description: clean(q.description),
      question_type: q.type,
      question_order: i,
      is_required: q.required,
      options: buildOptions(q, null, false),
    }));
    const { error: qErr } = await sb.from("survey_questions").insert(rows);
    if (qErr) return { ok: false, message: `أُنشئ الاستبيان لكن تعذّر حفظ الأسئلة: ${qErr.message}`, id: created.id };
  }

  if (publish) {
    const { error: pErr } = await sb
      .from("surveys")
      .update({ status: "active", published_at: new Date().toISOString() })
      .eq("id", created.id);
    if (pErr) return { ok: false, message: `حُفظ مسودّةً لكن تعذّر النشر: ${pErr.message}`, id: created.id };
  }

  revalidatePath("/dashboard/surveys", "layout");
  return { ok: true, message: publish ? "نُشِر الاستبيان." : "أُنشئ الاستبيان مسودّةً.", id: created.id };
}

/* ── التحديث التفاضليّ ── */

/**
 * تحديث استبيان وأسئلته **في مكانها** — لا حذفَ الكلّ وإعادة الإدراج:
 * ذاك كان عطب V1 الأسوأ (كلّ حفظٍ يعيد إصدار ids فتسقط الإجابات المرتبطة سلسلةً).
 * الموجود يُحدَّث بهُويّته، والجديد يُدرَج، والمحذوف وحده يُحذف (وإجاباته معه — واجهة
 * البنّاء تُصادق على ذلك صراحةً). والسؤال **المُجاب** لا يتغيّر نوعه: قيمه مخزّنة
 * بعمود نوعه، وتغييره يجعل القديم غير مقروء.
 */
export async function updateSurvey(surveyId: number, input: SurveyInput): Promise<SurveyResult> {
  const mgr = await getSurveyManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الاستبيانات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const invalid = validateSurvey(input);
  if (invalid) return { ok: false, message: invalid };

  const { data: existing, error: eErr } = await sb
    .from("survey_questions")
    .select("id, question_type, options")
    .eq("survey_id", surveyId);
  if (eErr) return { ok: false, message: `تعذّر قراءة الأسئلة الحاليّة: ${eErr.message}` };

  const existingById = new Map((existing ?? []).map((q) => [q.id as number, q]));

  // عدد الإجابات لكلّ سؤال موجود — يحكم تقاعد الخيارات ومنع تغيير النوع
  const answerCount = new Map<number, number>();
  if (existingById.size) {
    const aRes = await sb.from("survey_answers").select("question_id").in("question_id", [...existingById.keys()]);
    if (aRes.error) return { ok: false, message: `تعذّر فحص الإجابات: ${aRes.error.message}` };
    for (const a of aRes.data ?? []) answerCount.set(a.question_id, (answerCount.get(a.question_id) ?? 0) + 1);
  }

  for (const q of input.questions) {
    if (q.id != null) {
      const cur = existingById.get(q.id);
      if (!cur) return { ok: false, message: "أحد الأسئلة لم يعد موجودًا — حدّث الصفحة وأعد المحاولة." };
      if ((answerCount.get(q.id) ?? 0) > 0 && cur.question_type !== q.type) {
        return { ok: false, message: `السؤال «${q.text.slice(0, 40)}» له إجابات مخزّنة — لا يتغيّر نوعه. أضِف سؤالًا جديدًا بدله.` };
      }
    }
  }

  const { error: sErr } = await sb.from("surveys").update(surveyColumns(input)).eq("id", surveyId);
  if (sErr) return { ok: false, message: `تعذّر حفظ الإعدادات: ${sErr.message}` };

  const keptIds = new Set<number>();
  for (let i = 0; i < input.questions.length; i++) {
    const q = input.questions[i];
    const cur = q.id != null ? existingById.get(q.id) : undefined;
    const priorChoices = cur ? (((cur.options ?? null) as { choices?: Choice[] } | null)?.choices ?? null) : null;
    const columns = {
      question_text: clean(q.text),
      question_description: clean(q.description),
      question_type: q.type,
      question_order: i,
      is_required: q.required,
      options: buildOptions(q, priorChoices, (q.id != null ? answerCount.get(q.id) ?? 0 : 0) > 0),
    };
    if (q.id != null && cur) {
      keptIds.add(q.id);
      const { error } = await sb.from("survey_questions").update(columns).eq("id", q.id);
      if (error) return { ok: false, message: `تعذّر حفظ السؤال «${q.text.slice(0, 40)}»: ${error.message}` };
    } else {
      const { error } = await sb.from("survey_questions").insert({ survey_id: surveyId, ...columns });
      if (error) return { ok: false, message: `تعذّر إضافة السؤال «${q.text.slice(0, 40)}»: ${error.message}` };
    }
  }

  const removed = [...existingById.keys()].filter((id) => !keptIds.has(id));
  if (removed.length) {
    const { error } = await sb.from("survey_questions").delete().in("id", removed);
    if (error) return { ok: false, message: `تعذّر حذف أسئلة أُزيلت: ${error.message}` };
  }

  revalidatePath("/dashboard/surveys", "layout");
  return { ok: true, message: "حُفظت التغييرات.", id: surveyId };
}

/* ── دورة الحياة ── */

/** ينفّذ فعلًا من STATUS_OPS — التحقّق على الحالة **والعلمين** الحقيقيّين لا على ما تعرضه الواجهة. */
export async function setSurveyStatus(surveyId: number, op: StatusOp): Promise<SurveyResult> {
  const mgr = await getSurveyManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الاستبيانات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const spec = STATUS_OPS[op];
  if (!spec) return { ok: false, message: "إجراء غير معروف." };

  const { data: survey, error } = await sb.from("surveys").select("id, status, title, published_at, archived_at, deleted_at").eq("id", surveyId).maybeSingle();
  if (error) return { ok: false, message: `تعذّر قراءة الاستبيان: ${error.message}` };
  if (!survey) return { ok: false, message: "لا وجود لهذا الاستبيان." };

  // الحارس على الحالة والعلمين (الأرشفة/الحذف صارا عَلَمين متعامدين)
  const state = { status: survey.status as SurveyStatus, archived: survey.archived_at != null, deleted: survey.deleted_at != null };
  if (!spec.when(state)) {
    return { ok: false, message: `لا يصحّ «${spec.label}» على هذا الاستبيان في وضعه الحاليّ.` };
  }

  // النشر وإعادة الفتح كلاهما يُصيّره نشطًا — واستبيان بلا أسئلة لا يُجاب
  if (op === "publish" || op === "reopen") {
    const { count, error: cErr } = await sb.from("survey_questions").select("id", { count: "exact", head: true }).eq("survey_id", surveyId);
    if (cErr) return { ok: false, message: `تعذّر فحص الأسئلة: ${cErr.message}` };
    if (!count) return { ok: false, message: "أضِف سؤالًا واحدًا على الأقلّ قبل النشر." };
  }

  const now = new Date().toISOString();
  // الأثر: انتقالات الحالة تكتب `status` (+طوابع)؛ وأفعال العَلَم تضبط/تمسح العَلَم دون مساس الحالة.
  // «إعادة الفتح» تعيد للنشط وتمسح `end_date` (سببَ الإغلاق) و`closed_at`.
  const effects: Record<StatusOp, Record<string, unknown>> = {
    publish:    { status: "active", published_at: survey.published_at ?? now },
    pause:      { status: "paused" },
    close:      { status: "closed", closed_at: now },
    reopen:     { status: "active", end_date: null, closed_at: null },
    archive:    { archived_at: now, archived_by: mgr.userId },
    unarchive:  { archived_at: null, archived_by: null },
    softDelete: { deleted_at: now, deleted_by: mgr.userId },
    restore:    { deleted_at: null, deleted_by: null },
  };

  const { error: uErr } = await sb.from("surveys").update(effects[op]).eq("id", surveyId);
  if (uErr) return { ok: false, message: `تعذّر التنفيذ: ${uErr.message}` };

  revalidatePath("/dashboard/surveys", "layout");
  const msg = op === "reopen"
    ? `أُعيد فتح «${survey.title}» — نشطٌ الآن بلا موعد نهاية؛ اضبط موعدًا جديدًا من التحرير إن شئت.`
    : `${spec.label}: تمّ لـ«${survey.title}».`;
  return { ok: true, message: msg };
}

/** حذف نهائيّ — للمحذوف ناعمًا وحده، ويُسقط أسئلته ومشاركاته وإجاباته سلسلةً. */
export async function deleteSurveyPermanently(surveyId: number): Promise<SurveyResult> {
  const mgr = await getSurveyManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الاستبيانات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data: survey, error } = await sb.from("surveys").select("id, status, title").eq("id", surveyId).maybeSingle();
  if (error) return { ok: false, message: `تعذّر قراءة الاستبيان: ${error.message}` };
  if (!survey) return { ok: false, message: "لا وجود لهذا الاستبيان." };
  // بوّابة على حالة الهدف: النهائيّ يمرّ عبر المحذوفات أوّلًا — خطوتان لا خطوة واحدة قاتلة
  if (survey.status !== "deleted") return { ok: false, message: "انقله إلى المحذوفات أوّلًا، ثمّ احذفه نهائيًّا من هناك." };

  const { error: dErr } = await sb.from("surveys").delete().eq("id", surveyId);
  if (dErr) return { ok: false, message: `تعذّر الحذف النهائيّ: ${dErr.message}` };

  revalidatePath("/dashboard/surveys", "layout");
  return { ok: true, message: `حُذف «${survey.title}» نهائيًّا بمشاركاته.` };
}

/* ── معاينة المدير — تفاصيل الاستبيان بشكل صفحة الاستبيان، لأيّ حالة، بلا بوّابةٍ ولا عدّ مشاهدة ──
   يُغذّي الطبقةَ الحيّة (SurveyPreview) في القائمة كما تُغذّى في البنّاء — نفس المُحوّل ونفس الراسم. */
export async function getSurveyPreview(surveyId: number): Promise<
  { ok: true; survey: PublicSurvey; questions: PublicQuestion[] } | { ok: false; message: string }
> {
  const mgr = await getSurveyManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الاستبيانات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const [sRes, qRes] = await Promise.all([
    sb.from("surveys").select("id, title, description, welcome_message, thank_you_message, show_progress_bar, show_results_to_participants, end_date").eq("id", surveyId).maybeSingle(),
    sb.from("survey_questions").select("id, question_text, question_description, question_type, is_required, options").eq("survey_id", surveyId).order("question_order", { ascending: true }),
  ]);
  if (sRes.error) return { ok: false, message: `تعذّر جلب الاستبيان: ${sRes.error.message}` };
  if (!sRes.data) return { ok: false, message: "لا وجود لهذا الاستبيان." };
  if (qRes.error) return { ok: false, message: `تعذّر جلب الأسئلة: ${qRes.error.message}` };

  return { ok: true, survey: toPublicSurvey(sRes.data), questions: toPublicQuestions(qRes.data ?? []) };
}
