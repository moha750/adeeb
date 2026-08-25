// تفويض الألعاب — **قدرة لا رتبة**. لا `role_level` هنا ولا في أيّ ملفّ لعبة:
// من يُدير غرف اللعب = من مُنحت له قدرة `manage_games` عبر أدواره، مهما كانت رتبته.
// (القدرةُ قائمةٌ في `permissions` منذ ٢٠٢٦-٠٥-١٠، وحارسُها في القاعدة `gw_is_admin`
// وهو اليوم `check_user_permission(uid, 'manage_games')` بعد أن أُعدم منه الترقيم.)
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";

export type GamesManager = { userId: string };

/**
 * المستخدم الحاليّ إن كان يملك قدرة `manage_games`، وإلّا `null`.
 *
 * الهويّة من الجلسة والقدرة من `check_user_permission`. وهذا حارسُ **طبقةِ التطبيق**؛
 * أمّا الحارسُ الحقيقيّ فداخل كلّ دالّة `gw_*` تقرأ `auth.uid()` بنفسها. فلو نُسي
 * النداءُ هنا يومًا ردّت القاعدةُ الفعلَ ولم يقع.
 */
export async function getGamesManager(): Promise<GamesManager | null> {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  const svc = createAdeebServiceClient(url, key);

  const { data, error } = await svc.rpc("check_user_permission", {
    p_user_id: user.id,
    p_permission_key: "manage_games",
  });
  if (error || data !== true) return null;
  return { userId: user.id };
}
