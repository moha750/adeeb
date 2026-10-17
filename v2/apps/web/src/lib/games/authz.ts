// تفويضُ غرفة الألعاب — **قدرةٌ لا رتبة**: من يدير الألعابَ من مُنح `manage_games` عبر أدواره.
// تُمنح للرئيسين وحدهما (قرارُ المالك ٢٠٢٦-١٠-١٧، الترحيل `games_01_hall`).
// والهويّةُ من الجلسة لا من «المعاينة كعضو»: الكتابةُ باسم من يجلس أمام الشاشة.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";

export type GamesManager = { userId: string };

export function gamesService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/** صاحبُ الجلسة إن ملك `manage_games`، وإلّا `null`. */
export async function getGamesManager(): Promise<GamesManager | null> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const svc = gamesService();
  if (!svc) return null;
  const { data, error } = await svc.rpc("check_user_permission", {
    p_user_id: user.id,
    p_permission_key: "manage_games",
  });
  if (error || data !== true) return null;
  return { userId: user.id };
}
