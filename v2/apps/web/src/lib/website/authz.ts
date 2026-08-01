// تفويض محتوى الموقع — **قدرة لا رتبة**. لا `role_level` هنا ولا في أيّ ملفّ محتوى:
// من يُدير مجلّدًا من محتوى الصفحة الرئيسية = من مُنحت له قدرة ذلك المجلّد عبر أدواره، مهما
// كانت رتبته. ولكلّ مجلّدٍ قدرته وحده (`manage_works` · `manage_achievements` · `manage_sponsors`
// · `manage_faq`) — تُقرأ من `SECTION_CAP` فلا تُسمّى هنا مرّةً ثانية، وهي حارس RLS نفسه
// لجدول ذلك المجلّد. القراءة عبر `check_user_permission` (SECURITY DEFINER، بالاسم — صفر role_level).
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { SECTION_CAP } from "@/lib/capabilities";

export type WebsiteManager = { userId: string };

/** مجلّدات محتوى الصفحة الرئيسية — كلٌّ منها قسمٌ مقفولٌ في `SECTION_CAP`. */
export type WebsiteSection = "works" | "achievements" | "sponsors" | "faq";

/**
 * المستخدم الحاليّ إن كان يملك قدرة هذا المجلّد، وإلّا `null`.
 * الهويّة من الجلسة، والقدرة من `check_user_permission`.
 */
export async function getWebsiteManager(section: WebsiteSection): Promise<WebsiteManager | null> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  const svc = createAdeebServiceClient(url, key);

  const { data, error } = await svc.rpc("check_user_permission", {
    p_user_id: user.id,
    p_permission_key: SECTION_CAP[`/dashboard/website/${section}`],
  });
  if (error || data !== true) return null;
  return { userId: user.id };
}
