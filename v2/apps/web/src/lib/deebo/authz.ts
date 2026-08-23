// تفويضُ معرفة ديبو — **قدرة لا رتبة**، كأخته في محتوى الموقع (`lib/website/authz.ts`).
// والقدرةُ `manage_deebo` تُقرأ من `SECTION_CAP` بمسار الغرفة فلا تُسمّى ههنا مرّةً ثانية،
// وهي حارسُ RLS نفسُه لجدول `deebo_knowledge` — بابُ اللوحة وبابُ القاعدة قفلٌ واحد.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { SECTION_CAP } from "@/lib/capabilities";

export type DeeboManager = { userId: string };

/**
 * صاحبُ الجلسة إن كان يملك `manage_deebo`، وإلّا `null`.
 *
 * **والهويّةُ من الجلسة لا من «المعاينة كعضو»**: ما يُكتب ههنا يُنسب إلى من كتبه حقًّا
 * (`created_by`)، فلا يُختَم باسم من يُعايَن (`lib/view-as.ts`).
 */
export async function getDeeboManager(): Promise<DeeboManager | null> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  const svc = createAdeebServiceClient(url, key);

  const { data, error } = await svc.rpc("check_user_permission", {
    p_user_id: user.id,
    p_permission_key: SECTION_CAP["/dashboard/deebo"],
  });
  if (error || data !== true) return null;
  return { userId: user.id };
}
