import "server-only";
import { evaluationService } from "@/lib/evaluation/db";
import { createClient } from "@/lib/supabase/server";
import type { Branch, Cancelled, CycleStatus, EvaluatedRole, Excluded, Part, Verdict } from "./vocab";

/**
 * **قراءاتُ تقييم القيادات.** غرفةُ الإدارة بعميل الخدمة بعد أن يسأل الخادمُ عن القدرة (دوالُّها بلا منح)،
 * وورقةُ المقيِّم ونتيجتي بعميل الجلسة (دوالُّهما تقرأ `auth.uid()` وحده). ولا تُقرأ ورقةٌ هنا أبدًا:
 * كلُّ ما يعود أعدادٌ ومجاميع.
 */

type Read<T> = { data: T; error: string | null };
const fail = <T>(data: T, error: string): Read<T> => ({ data, error });

// ══ غرفة الإدارة ══════════════════════════════════════════════════════════

export type CycleRow = {
  id: number;
  due_on: string;
  opens_at: string;
  closes_at: string;
  status: CycleStatus;
  executed_at: string | null;
  blocked: boolean;
  targets: number;
  excluded: number;
  raters: number;
  ballots: number;
  kept: number;
  removed: number;
  no_result: number;
};

export async function getCycles(): Promise<Read<CycleRow[]>> {
  const svc = evaluationService();
  if (!svc) return fail([], "إعداد الخادم ناقص (مفتاح الخدمة).");
  const { data, error } = await svc.rpc("evaluation_admin_cycles");
  if (error) return fail([], "تعذّرت قراءة مواعيد التقييم.");
  return { data: (data ?? []) as CycleRow[], error: null };
}

export type TargetRow = {
  id: number;
  user_id: string | null;
  full_name: string;
  gender: "male" | "female" | null;
  role_name: EvaluatedRole;
  committee_id: number | null;
  department_id: number | null;
  unit_name: string;
  seat_assigned_at: string;
  excluded: Excluded | null;
  cancelled: Cancelled | null;
  members_eligible: number;
  members_ballots: number;
  council_eligible: number;
  council_ballots: number;
  members_quorum: boolean | null;
  branch: Branch | null;
  members_num: number | null;
  members_den: number | null;
  council_num: number | null;
  council_den: number | null;
  final_num: number | null;
  final_den: number | null;
  verdict: Verdict | null;
  removed_at: string | null;
  returned_to: number | null;
  awaiting_return: boolean;
  restored_at: string | null;
  /**
   * **ما يُخفى من الأرقام عن قائدَي الموارد والضمان** (الكشف، محمد ٢٠٢٦-١١-٢٣): هما يريان من قيّم،
   * فشقٌّ قيّم فيه واحدٌ أو اثنان يكشف رقمُه تقييمَ صاحبه. فيُخفى الشقّان كلاهما، وتبقى النهائيّةُ والحكم (محمد ٢٠٢٦-١١-٢٣).
   */
  hidden?: { members?: boolean; council?: boolean };
};

/**
 * مقيَّمو دورة. **النتائجُ تُنزع لمن لا يملك `view_leader_evaluation_results`** (أحكامٌ عامّة: «يطّلع على
 * النتائج التفصيليّة الرئيسان وقائدا الإدارتين»)، فلا تبلغ متصفّحَه أصلًا.
 */
export async function getTargets(cycleId: number, withResults: boolean, hideFew = false): Promise<Read<TargetRow[]>> {
  const svc = evaluationService();
  if (!svc) return fail([], "إعداد الخادم ناقص (مفتاح الخدمة).");
  const { data, error } = await svc.rpc("evaluation_admin_targets", { p_cycle: cycleId });
  if (error) return fail([], "تعذّرت قراءة المقيَّمين.");
  const rows = (data ?? []) as TargetRow[];
  // **قائدا الموارد والضمان** يريان من قيّم ولا يريان ماذا أعطى (الكشف، ٢٠٢٦-١١-٢٣): شقٌّ قيّم فيه واحدٌ أو اثنان يكشف رقمُه
  // تقييمَهما، فيُنزع الشقّان كلاهما (من النهائيّة والشقّ الظاهر يُحسب المخفيّ)، وتبقى النهائيّةُ والحكم (محمد: «لا داعي لإخفاء النتيجة»)
  const few = (n: number) => n >= 1 && n <= 2;
  if (withResults && hideFew) {
    return {
      data: rows.map((r) =>
        r.verdict !== null && (few(r.members_ballots) || few(r.council_ballots))
          ? { ...r, members_num: null, members_den: null, council_num: null, council_den: null, hidden: { members: true, council: true } }
          : r,
      ),
      error: null,
    };
  }
  if (withResults) return { data: rows, error: null };
  return {
    data: rows.map((r) => ({
      ...r,
      members_quorum: null,
      branch: null,
      members_num: null,
      members_den: null,
      council_num: null,
      council_den: null,
      final_num: null,
      final_den: null,
      verdict: null,
    })),
    error: null,
  };
}

/** `supervisor`: في شقّ المجلس لأنّه يشرف على اللجنة (م٤/1) لا لأنّه من المجلس الإداريّ، فيُوسَم «مشرف». */
export type ElectorRow = {
  rater_id: string | null;
  full_name: string | null;
  part: Part;
  added_by_correction: boolean;
  removed: boolean;
  supervisor?: boolean;
  /** في شقّ المجلس لأنّه إداريٌّ في الإدارة التنفيذيّة (م٤ المعدّلة، محمد ٢٠٢٦-١١-٢٢)، فيُجمع تحت اسم إدارته. */
  executive?: boolean;
  /** منصبُه الحاضر بمسمّى المنصّة (`position_title_of`)، يُؤنَّث بجنسه في الواجهة (`rankFor`). */
  seat_title?: string | null;
  gender?: "male" | "female" | null;
  /** **الكشف** (محمد ٢٠٢٦-١١-٢٣): هل قيّم؟ لصاحب `view_leader_evaluation_participation`. */
  rated?: boolean | null;
  /** **الكشف**: تقييمُه كما أرسله، لصاحب `view_leader_evaluation_ballots` (الرئيسان). */
  ballot?: { scores: number[]; keep: string | null; change: string | null } | null;
};

/**
 * مقيِّمو مقيَّمٍ واحد: أسماؤهم وشقُّهم، ومعها **بقدر قدرة الناظر** (الكشف، محمد ٢٠٢٦-١١-٢٣): «قيّم أو لم يقيّم» لصاحب
 * `seesParticipation`، وتقييمُه كلُّه لصاحب `seesBallots`. وما لا يحقّ للناظر لا يُجلب أصلًا، فلا يبلغ متصفّحَه.
 */
export async function getElectorate(targetId: number, sees: { participation: boolean; ballots: boolean }): Promise<Read<ElectorRow[]>> {
  const svc = evaluationService();
  if (!svc) return fail([], "إعداد الخادم ناقص (مفتاح الخدمة).");
  const [el, bs] = await Promise.all([
    svc.rpc("evaluation_admin_electorate", { p_target: targetId }),
    sees.participation ? svc.rpc("evaluation_admin_ballots", { p_target: targetId }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (el.error || bs.error) return fail([], "تعذّرت قراءة المقيِّمين.");
  const rows = (el.data ?? []) as ElectorRow[];
  if (!sees.participation) return { data: rows, error: null };
  type B = { rater_id: string; scores: number[]; keep_text: string | null; change_text: string | null };
  const by = new Map(((bs.data ?? []) as B[]).map((b) => [b.rater_id, b]));
  return {
    data: rows.map((r) => {
      const b = r.rater_id ? by.get(r.rater_id) : undefined;
      return {
        ...r,
        rated: !!b,
        ...(sees.ballots && b ? { ballot: { scores: b.scores, keep: b.keep_text, change: b.change_text } } : {}),
      };
    }),
    error: null,
  };
}

export type LogRow = { at: string; event: string; target_id: number | null; actor_name: string | null; reason: string | null; details: Record<string, unknown> };

export async function getLog(cycleId: number): Promise<Read<LogRow[]>> {
  const svc = evaluationService();
  if (!svc) return fail([], "إعداد الخادم ناقص (مفتاح الخدمة).");
  const { data, error } = await svc.rpc("evaluation_admin_log", { p_cycle: cycleId });
  if (error) return fail([], "تعذّرت قراءة السجلّ.");
  return { data: (data ?? []) as LogRow[], error: null };
}

/** لجانُ المجلس التشغيليّ القائمة: يختار منها قائدُ الموارد لجنةَ المنسّق المستبعَد (المسألة ٤). */
export async function getReturnCommittees(): Promise<Read<{ id: number; name: string; department_id: number | null }[]>> {
  const svc = evaluationService();
  if (!svc) return fail([], "إعداد الخادم ناقص (مفتاح الخدمة).");
  const { data, error } = await svc
    .from("committees")
    .select("id, committee_name_ar, department_id")
    .eq("is_active", true)
    .eq("council_id", "executive")
    .order("committee_name_ar");
  if (error) return fail([], "تعذّرت قراءة اللجان.");
  return {
    data: ((data ?? []) as { id: number; committee_name_ar: string; department_id: number | null }[]).map((c) => ({
      id: c.id,
      name: c.committee_name_ar,
      department_id: c.department_id,
    })),
    error: null,
  };
}

// ══ المقيِّم ونتيجتي (بالجلسة) ══════════════════════════════════════════════

export type SheetRow = {
  target_id: number;
  cycle_id: number;
  closes_at: string;
  last_day: string;
  part: Part;
  full_name: string;
  gender: "male" | "female" | null;
  role_name: EvaluatedRole;
  unit_name: string;
  done: boolean;
};

export async function getMySheets(): Promise<Read<SheetRow[]>> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("evaluation_my_sheets");
  if (error) return fail([], "تعذّرت قراءة التقييمات.");
  return { data: (data ?? []) as SheetRow[], error: null };
}

export type MyResultRow = {
  target_id: number;
  due_on: string;
  role_name: EvaluatedRole;
  unit_name: string;
  verdict: Verdict;
  branch: Branch | null;
  final_num: number | null;
  final_den: number | null;
  /** النهائيّةُ وحدها بلا الشقّين (محمد ٢٠٢٦-١١-٢٣؛ `20261123135950_evaluation_disclosure`): الشقّان معها كانا يكشفان المخفيَّ بالحساب. */
  members_ballots: number | null;
  members_eligible: number | null;
  council_ballots: number | null;
  comments: number;
  removed_at: string | null;
  restored_at: string | null;
  cancelled: Cancelled | null;
  /** اللجنةُ التي عاد إليها المستبعَد عضوًا، وهل ينتظر لجنةً بعدُ (`20261120193547_evaluation_my_results_returned_to`).
   *  اختياريّان: الحكمُ وحده يُكتب إن لم يعودا. */
  returned_unit?: string | null;
  awaiting_return?: boolean | null;
};

export async function getMyResults(): Promise<Read<MyResultRow[]>> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("evaluation_my_results");
  if (error) return fail([], "تعذّرت قراءة نتيجتك.");
  return { data: (data ?? []) as MyResultRow[], error: null };
}

/** إجاباتُ السؤال المفتوح بلا أسماء وبترتيبٍ عشوائيّ (م١٠/2). */
export async function getMyComments(targetId: number): Promise<Read<{ keep_text: string | null; change_text: string | null }[]>> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("evaluation_my_comments", { p_target: targetId });
  if (error) return fail([], "تعذّرت قراءة الإجابات.");
  return { data: (data ?? []) as { keep_text: string | null; change_text: string | null }[], error: null };
}

// ══ لصفحة الغرفة ═════════════════════════════════════════════════════════

/** أسماءُ الأقسام، تُعنوَن بها كروتُ الغرفة. */
export async function getDepartments(): Promise<Record<number, string>> {
  const svc = evaluationService();
  if (!svc) return {};
  const { data } = await svc.from("departments").select("id, name_ar");
  return Object.fromEntries(((data ?? []) as { id: number; name_ar: string }[]).map((d) => [d.id, d.name_ar]));
}

/**
 * أعضاءُ أدِيب الأحياء: منهم يُختار مقيِّمٌ سقط من اللقطة خطأً (م١٠/3). أسماءٌ ومعرّفات وحدها، ولصاحب
 * `manage_leader_evaluation` وحده (تسأل الصفحةُ قبل أن تنادي).
 */
export async function getCorrectionPeople(): Promise<{ id: string; name: string }[]> {
  const svc = evaluationService();
  if (!svc) return [];
  const { data } = await svc
    .from("profiles")
    .select("id, full_name")
    .not("joined_date", "is", null)
    // حدُّ العضويّة كما في `is_adeeb_member`: انضمّ ولم تُنهَ عضويّتُه
    .or("account_status.is.null,account_status.neq.suspended")
    .order("full_name");
  return ((data ?? []) as { id: string; full_name: string }[]).map((p) => ({ id: p.id, name: p.full_name }));
}
