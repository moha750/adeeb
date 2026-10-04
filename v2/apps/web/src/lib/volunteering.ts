import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { fmtTimeRange } from "@/lib/dates";

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

/**
 * **وقتُ الفرصة كما يُعرض**: المدى إن حُفظ («من 4 م إلى 8 م»)، وإلّا المدّةُ النصّيّةُ القديمة.
 *
 * صارت المدّةُ ٢٠٢٦-٠٩-٣٠ ساعتين تُختاران (`daily_from`/`daily_to`) بعد أن كانت نصًّا حرًّا، وبقي
 * `duration_note` في الصفوف التي كُتبت قبلها ولا يكتبه النموذجُ بعدُ. فالأسبقيّةُ تُقال هنا مرّةً،
 * لا في كلّ قارئٍ على حدة (لوحةُ الفرص، وسجلُّ الفرصة، وحسابُ المتطوّع): لو افترقت لرأى المشرفُ
 * وقتًا والمتطوّعُ غيرَه للفرصة نفسِها.
 */
export function oppTimeLabel(o: {
  daily_from: string | null; daily_to: string | null; duration_note: string | null;
}): string | null {
  return fmtTimeRange(o.daily_from, o.daily_to) || o.duration_note || null;
}
