import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";

/**
 * تفويضُ التطوّع — **قدرةٌ لا رتبة**: من مُنحت له `manage_volunteering` عبر أدواره.
 * وهي حارسُ RLS نفسُه في جداول التطوّع، وحارسُ دوالِّ القبول والحضور والتقييم.
 */
export type VolunteeringManager = { userId: string };

export async function getVolunteeringManager(): Promise<VolunteeringManager | null> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;

  const svc = service();
  if (!svc) return null;

  const { data, error } = await svc.rpc("check_user_permission", {
    p_user_id: user.id,
    p_permission_key: "manage_volunteering",
  });
  if (error || data !== true) return null;
  return { userId: user.id };
}

export function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}
