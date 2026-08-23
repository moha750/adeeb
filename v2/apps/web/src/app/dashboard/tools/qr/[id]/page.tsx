import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getQrStats } from "../data";
import { QrStatsView } from "../QrStatsView";

export const metadata = { title: "إحصاء الباركود، بوّابة أديب" };

/**
 * إحصاءُ رمزٍ واحد. القفلُ قفلُ الغرفة نفسِه، والمِلكيّةُ تحكمها سياسةُ own-row: من طلب
 * رمزَ غيرِه لم يُردَّ بمنعٍ يكشف وجودَه، بل بصفحةٍ تقول «لم يُعثر عليه».
 */
export default async function QrStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { id } = await params;
  const stats = await getQrStats(id);

  return <QrStatsView stats={stats} />;
}
