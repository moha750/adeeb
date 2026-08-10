import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyCandidacies } from "../member-data";
import { MyCandidaciesView } from "./MyCandidaciesView";

/**
 * باب «سِجلّ ترشُّحي» — لمن يحمل `run_for_election`، ولا يظهر في التنقّل إلّا حين تصدق
 * إشارةُ `hasCandidacy` (له ترشّحٌ قائم). التعديلُ والسحبُ يفرض القاعدةُ حدودَهما (can_edit/…).
 */
export default async function MyCandidaciesPage() {
  const denied = await denyUnless("/dashboard/elections/my");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const { items, error } = await getMyCandidacies(me.id);
  return <MyCandidaciesView items={items} error={error} />;
}
