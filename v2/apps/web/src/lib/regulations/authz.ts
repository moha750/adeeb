// تفويضُ غرفة تحرير الأنظمة — **قدرةٌ لا رتبة**: يدخلها من يحمل `manage_regulations` (الرئيسان، الدستور
// م٦٨). والموافقةُ على النشر **مقعدٌ لا قدرة**: لكلّ مسودّةٍ موافقتان، واحدةٌ لرئيس أدِيب وأخرى للرئيس
// التنفيذيّ، فيُقرأ مقعدُ صاحب الجلسة الأصيلُ القائم — لا المكلَّفُ فيه ولا المجمَّد، لأنّ ما شُرط فيه
// «الرئيسان معًا» لا يقوم فيه أحدٌ مقام غيره.
//
// والهويّةُ هويّةُ الجلسة الحقيقيّة لا المستعارة («عرض بصفة»): الموافقةُ توقيعُ صاحبها.
import "server-only";
import { createAdeebServiceClient, type SupabaseClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";

export type PresidentSeat = "club_president" | "executive_council_president";
export const SEATS: PresidentSeat[] = ["club_president", "executive_council_president"];

export const seatLabel = (s: PresidentSeat, gender: "male" | "female" | null) =>
  s === "club_president" ? "رئيس أدِيب" : gender === "female" ? "الرئيسة التنفيذية" : "الرئيس التنفيذي";

export function regService(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

export type RegEditor = { userId: string; seat: PresidentSeat | null; sb: SupabaseClient };

/** صاحبُ الجلسة إن حمل `manage_regulations`، ومقعدُه الرئاسيّ إن كان له. */
export async function getRegEditor(): Promise<RegEditor | null> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const sb = regService();
  if (!sb) return null;
  const [cap, seats] = await Promise.all([
    sb.rpc("check_user_permission", { p_user_id: user.id, p_permission_key: "manage_regulations" }),
    sb.from("user_roles").select("role_name, is_acting, frozen_by").eq("user_id", user.id).eq("is_active", true).in("role_name", SEATS),
  ]);
  if (cap.error || cap.data !== true) return null;
  const own = (seats.data ?? []).find((r) => !r.is_acting && r.frozen_by == null);
  return { userId: user.id, seat: (own?.role_name as PresidentSeat | undefined) ?? null, sb };
}
