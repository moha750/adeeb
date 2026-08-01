// تفويض الفعاليّات — **قدرة لا رتبة**. لا `role_level` هنا ولا في أيّ ملفّ فعاليّة:
// من يُدير الفعاليّات = من مُنحت له قدرة `manage_activities` عبر أدواره، مهما كانت رتبته.
// القدرة تُقرأ من user_roles→role_permissions→permissions عبر `check_user_permission`
// (SECURITY DEFINER، بالاسم — صفر role_level)، وهي حارس RLS نفسه لجداول الفعاليّات.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";

export type EventsManager = { userId: string };

/**
 * المستخدم الحاليّ إن كان يملك قدرة `manage_activities`، وإلّا `null`.
 * الهويّة من الجلسة، والقدرة من `check_user_permission`.
 */
export async function getEventsManager(): Promise<EventsManager | null> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  const svc = createAdeebServiceClient(url, key);

  const { data, error } = await svc.rpc("check_user_permission", {
    p_user_id: user.id,
    p_permission_key: "manage_activities",
  });
  if (error || data !== true) return null;
  return { userId: user.id };
}
