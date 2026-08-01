// تفويض الاستبيانات — **قدرة لا رتبة**. لا `role_level` هنا ولا في أيّ ملفّ استبيان:
// من يُدير الاستبيانات = من مُنحت له قدرة `manage_surveys` عبر أدواره، مهما كانت رتبته.
// (عضو لجنة الضمان أو الموارد البشريّة يملكها فعلًا، ورتبته دون الإدارة العليا —
// فالترقيم كان يُقصيه ظلمًا.) القدرة تُقرأ من user_roles→role_permissions→permissions،
// بلا أيّ عتبة رقميّة.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";

export type SurveyManager = { userId: string };

/**
 * المستخدم الحاليّ إن كان يملك قدرة `manage_surveys`، وإلّا `null`.
 * الهويّة من الجلسة، والقدرة من `check_user_permission` (SECURITY DEFINER،
 * يمرّ عبر role_permissions بالاسم — صفر role_level).
 */
export async function getSurveyManager(): Promise<SurveyManager | null> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  const svc = createAdeebServiceClient(url, key);

  const { data, error } = await svc.rpc("check_user_permission", {
    p_user_id: user.id,
    p_permission_key: "manage_surveys",
  });
  if (error || data !== true) return null;
  return { userId: user.id };
}
