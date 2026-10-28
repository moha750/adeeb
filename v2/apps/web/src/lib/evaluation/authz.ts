import "server-only";
import { createClient } from "@/lib/supabase/server";
import { evaluationService } from "./db";

/**
 * **من يدير تقييم القيادات ومن يرى نتائجه** — قدرتان لا رتبة (نهج `lib/elections/authz.ts`).
 *
 * - `manage_leader_evaluation`: التصحيحُ واختيارُ لجنة المنسّق المستبعَد. الرئيسان وقائدُ الموارد.
 * - `view_leader_evaluation_results`: النتائجُ التفصيليّة. الرئيسان وقائدا الإدارتين (أحكامٌ عامّة).
 *
 * الهويّةُ من الجلسة الحقيقيّة لا من «المعاينة بصفة» (`lib/view-as.ts`): الفاعلُ في التصحيح يُكتب في
 * السجلّ باسمه، فلا يُستعار. والقاعدةُ تسأل عن القدرة ثانيةً في كلّ دالّة تصحيح (`_evaluation_can_manage`).
 */
export type EvaluationViewer = { userId: string; canManage: boolean; canViewResults: boolean };

export async function getEvaluationViewer(): Promise<EvaluationViewer | null> {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;
  const svc = evaluationService();
  if (!svc) return null;

  const ask = (key: string) => svc.rpc("check_user_permission", { p_user_id: user.id, p_permission_key: key });
  const [manage, view] = await Promise.all([ask("manage_leader_evaluation"), ask("view_leader_evaluation_results")]);
  const canManage = !manage.error && manage.data === true;
  const canViewResults = !view.error && view.data === true;
  if (!canManage && !canViewResults) return null;
  return { userId: user.id, canManage, canViewResults };
}
