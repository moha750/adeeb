import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * **من ينظر في الاستبعاد: من مقعده لا من قدرته** (المادة ١٦): يطلبه عضوُ الموارد البشرية أو قائدُها، ويحسمه القائدُ وحده.
 * تقرؤه صفحةُ الترشّح (أفعالُ الطلب والحسم) وصفحةُ الانتخاب (تنبيهُ «ينتظر قرارك» للقائد). المقعدُ الحيّ، أصيلًا أو تكليفًا (المكلَّف يأخذ سلطة المقعد)، لا المجمَّد. والقاعدةُ تحرس الفعلَ نفسَه، فهذا لما يُعرض.
 */
export async function exclusionViewer(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { canRequest: false, isHrLeader: false };
  const { data } = await createAdeebServiceClient(url, key).from("user_roles").select("role_name, frozen_by")
    .eq("user_id", userId).eq("is_active", true).in("role_name", ["hr_admin_member", "hr_committee_leader"]);
  const live = (data ?? []).filter((r) => r.frozen_by == null).map((r) => r.role_name as string);
  return { canRequest: live.length > 0, isHrLeader: live.includes("hr_committee_leader") };
}
