import "server-only";
import { createClient } from "@/lib/supabase/server";
import { evaluationService } from "./db";

/**
 * **من يدير تقييم القيادات ومن يرى نتائجه** — قدرتان لا رتبة (نهج `lib/elections/authz.ts`).
 *
 * - `manage_leader_evaluation`: التصحيحُ واختيارُ لجنة المنسّق المستبعَد. الرئيسان وقائدُ الموارد.
 * - `view_leader_evaluation_results`: النتائجُ التفصيليّة. الرئيسان وقائدا الإدارتين (أحكامٌ عامّة).
 * - `view_leader_evaluation_participation`: من قيّم ومن لم يقيّم. الرئيسان وقائدا الإدارتين (الكشف، محمد ٢٠٢٦-١١-٢٣).
 * - `view_leader_evaluation_ballots`: تقييمُ كلِّ مقيِّمٍ باسمه، درجاتٍ وملاحظات. الرئيسان وحدهما.
 *
 * الهويّةُ من الجلسة الحقيقيّة لا من «المعاينة بصفة» (`lib/view-as.ts`): الفاعلُ في التصحيح يُكتب في
 * السجلّ باسمه، فلا يُستعار. والقاعدةُ تسأل عن القدرة ثانيةً في كلّ دالّة تصحيح (`_evaluation_can_manage`).
 */
export type EvaluationViewer = {
  userId: string; canManage: boolean; canViewResults: boolean;
  /** يرى من قيّم ومن لم يقيّم */
  seesParticipation: boolean;
  /** يرى تقييمَ كلِّ مقيِّم */
  seesBallots: boolean;
};

export async function getEvaluationViewer(): Promise<EvaluationViewer | null> {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;
  const svc = evaluationService();
  if (!svc) return null;

  const ask = (key: string) => svc.rpc("check_user_permission", { p_user_id: user.id, p_permission_key: key });
  const [manage, view, part, ballots] = await Promise.all([
    ask("manage_leader_evaluation"), ask("view_leader_evaluation_results"),
    ask("view_leader_evaluation_participation"), ask("view_leader_evaluation_ballots"),
  ]);
  const yes = (r: { error: unknown; data: unknown }) => !r.error && r.data === true;
  const canManage = yes(manage);
  const canViewResults = yes(view);
  if (!canManage && !canViewResults) return null;
  const seesBallots = yes(ballots);
  return { userId: user.id, canManage, canViewResults, seesParticipation: seesBallots || yes(part), seesBallots };
}
