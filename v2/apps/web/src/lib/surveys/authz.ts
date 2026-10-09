// تفويض الاستبيانات — **قدرة لا رتبة**. لا `role_level` هنا ولا في أيّ ملفّ استبيان:
// من يُدير الاستبيانات = من مُنحت له قدرة `manage_surveys` عبر أدواره، مهما كانت رتبته.
// (عضو لجنة الضمان أو الموارد البشريّة يملكها فعلًا، ورتبته دون الإدارة العليا —
// فالترقيم كان يُقصيه ظلمًا.) القدرة تُقرأ من user_roles→role_permissions→permissions،
// بلا أيّ عتبة رقميّة.
//
// **والقدرةُ تفتح الغرفةَ لا الاستبيانات** (2026-10-08): الاستبيانُ لصاحبه، ولا يراه غيرُه
// إلّا بمشاركة. الدورُ في كلّ استبيان تحسبه القاعدةُ وحدها (`survey_access_list`)، وهذا
// الملفّ بابُه الوحيد إليها. والهويّةُ **من الجلسة الحقيقيّة** دائمًا لا من «المعاينة
// كعضو» (`lib/view-as.ts`): من عاين حسابَ غيره لا يرى استبياناتِ ذلك الغير.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { canSurvey, isSurveyRole, type SurveyRole, type SurveyCan } from "@/app/dashboard/surveys/vocab";

export type SurveyManager = { userId: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * المستخدم الحاليّ إن كان يملك قدرة `manage_surveys`، وإلّا `null`.
 * الهويّة من الجلسة، والقدرة من `check_user_permission` (SECURITY DEFINER،
 * يمرّ عبر role_permissions بالاسم — صفر role_level).
 */
export async function getSurveyManager(): Promise<SurveyManager | null> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;

  const svc = service();
  if (!svc) return null;

  const { data, error } = await svc.rpc("check_user_permission", {
    p_user_id: user.id,
    p_permission_key: "manage_surveys",
  });
  if (error || data !== true) return null;
  return { userId: user.id };
}

/**
 * أدوارُ المستخدم في كلّ استبيانٍ له فيه دور — ما ليس هنا لا يُعرض له إطلاقًا.
 * يرجع `null` عند تعذّر السؤال (فشلٌ آمن: لا قائمةَ خيرٌ من قائمةٍ كاملة).
 */
export async function getSurveyRoleMap(userId: string): Promise<Map<number, SurveyRole> | null> {
  const svc = service();
  if (!svc) return null;
  const { data, error } = await svc.rpc("survey_access_list", { p_user: userId });
  if (error) return null;
  const out = new Map<number, SurveyRole>();
  for (const r of (data ?? []) as { survey_id: number; access: string }[]) {
    if (isSurveyRole(r.access)) out.set(r.survey_id, r.access);
  }
  return out;
}

export type SurveyGrant =
  | { ok: true; userId: string; role: SurveyRole }
  | { ok: false; message: string; found: boolean };

/**
 * حارسُ الفعل الواحد: المستخدمُ الحاليّ (من الجلسة) ودورُه في هذا الاستبيان، إن كان دورُه
 * يُبيح `what` بمصفوفة `SURVEY_CAN`. ومن لا دور له يُقال له «لا وجود» لا «ممنوع»: لا يُكشَف
 * لأحدٍ أنّ لغيره استبيانًا بهذا الرقم.
 */
export async function authorizeSurvey(surveyId: number, what: SurveyCan): Promise<SurveyGrant> {
  const mgr = await getSurveyManager();
  if (!mgr) return { ok: false, found: false, message: "لا تملك صلاحية إدارة الاستبيانات." };
  if (!Number.isInteger(surveyId) || surveyId <= 0) return { ok: false, found: false, message: "لا وجود لهذا الاستبيان." };

  const svc = service();
  if (!svc) return { ok: false, found: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await svc.rpc("survey_access", { p_survey_id: surveyId, p_user: mgr.userId });
  if (error) return { ok: false, found: false, message: `تعذّر التحقّق من صلاحيتك: ${error.message}` };
  if (!isSurveyRole(data)) return { ok: false, found: false, message: "لا وجود لهذا الاستبيان." };

  if (!canSurvey(data, what)) {
    const message = data === "read"
      ? "إذنُك في هذا الاستبيان قراءةٌ فقط."
      : what === "share"
        ? "المشاركة يديرها صاحب الاستبيان وحده."
        : "هذا الإجراء لصاحب الاستبيان وحده.";
    return { ok: false, found: true, message };
  }
  return { ok: true, userId: mgr.userId, role: data };
}
