import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { awayIfNoSession, getSessionAdmin } from "@/lib/auth";
import { deletionDueLabel } from "@/lib/accountDeletion";
import { LeavingDoor } from "./LeavingDoor";

export const metadata: Metadata = { title: "حسابك، نادي أدِيب" };
export const dynamic = "force-dynamic";

/**
 * **كان بيتَ صاحب الحساب، وصار تحويلًا إلى بوّابة أدِيب** (٢٠٢٦-١٠-١٣): ما كان هنا صار غرفًا
 * هناك — «حجوزاتي» و«تطوّعي» و«شهاداتي» و«حسابي» — ويبقى العنوانُ لأنّ روابطَ قديمةً تقصده.
 *
 * **ويبقى بابًا لحالٍ واحدة**: من طلب حذفَ حسابه مجمَّدٌ لا مقفَل، فتُحوّله اللوحةُ إلى هنا حيث
 * خبرُ الطلب وبابُ العدول. وهو خارجَ اللوحة عن قصد، فلا يدور التحويلُ على نفسه.
 * **وصار بابًا من أبواب الحساب** (`LeavingDoor`، اعتمده محمد ١١-٢٤).
 */
export default async function MePage() {
  const me = await getSessionAdmin();
  if (!me) redirect((await awayIfNoSession("/me")) ?? "/login?next=/me");
  if (!me.deletionRequestedAt) redirect("/dashboard");

  return <LeavingDoor name={me.fullName ?? null} due={deletionDueLabel(me.deletionRequestedAt)} />;
}
