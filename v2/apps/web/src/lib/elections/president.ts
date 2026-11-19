// **رئيسُ أدِيب من مقعده لا من قدرته** (المادة ١١ من نظام الانتخابات: «لرئيس أدِيب أن يحرم عضوًا بعينه من الترشّح»).
// المقعدُ الحيّ، أصيلًا أو تكليفًا (المكلَّفُ يأخذ سلطة المقعد مدّة تكليفه)، لا المجمَّد. والقاعدةُ تحرس الفعلَ نفسَه
// (`ban_from_candidacy`)، فهذا لما يُعرض: بندُ «الحرمان من الترشّح» في «أعضاء أدِيب»، وقراءةُ الحرمان القائم لنافذته.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

export async function isClubPresident(userId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return false;
  const { data } = await createAdeebServiceClient(url, key).from("user_roles").select("frozen_by")
    .eq("user_id", userId).eq("is_active", true).eq("role_name", "club_president");
  return (data ?? []).some((r) => r.frozen_by == null);
}
