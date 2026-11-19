import { getCurrentAdmin } from "@/lib/auth";
import { getApplyContext } from "../member-data";
import { ApplyRoomAd } from "@/app/_ad/rooms/ApplyRoomAd";
import { AdRoomMissing } from "@/app/_ad/states";

/**
 * جسمُ صفحة إكمال الترشّح — مصدرٌ واحدٌ لمسارَين يفترقان في **الفتات فقط**:
 * `‎/run/[id]` للترشُّح الجديد (فتاتُه «الترشُّح»)، و`‎/my/[id]/edit` لتعديل ترشّحٍ قائم (فتاتُه «سِجلّ ترشُّحي»).
 * الوضعُ (جديد/تعديل) يُشتقّ من وجود ترشّحٍ قائم. بالهويّة منذ ٢٠٢٦-١١-١٩ (`ApplyRoomAd`، قالبُ النموذج).
 */
export async function ApplyRouteBody({ electionId, edit = false }: { electionId: string; edit?: boolean }) {
  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const ctx = await getApplyContext(me.id, electionId);
  if (!ctx.ok) {
    const back = edit ? { label: "سِجلّ ترشُّحي", href: "/dashboard/elections/my" } : { label: "الترشُّح", href: "/dashboard/elections/run" };
    return <AdRoomMissing title="بيان ترشّحك" navPath={back.href} what="صفحة الترشّح" desc={ctx.error ?? "هذا الانتخاب غير متاحٍ للترشّح الآن."} back={back} />;
  }

  return <ApplyRoomAd ctx={ctx} userId={me.id} me={{ name: me.fullName ?? "اسمك", avatarUrl: me.avatarUrl, gender: me.gender }} />;
}
