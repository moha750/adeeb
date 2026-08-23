import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Alert } from "@adeeb/design-system";
import { getQrLink } from "../../data";
import { QrDesignView } from "./QrDesignView";

export const metadata = { title: "تصميم الباركود، بوّابة أديب" };

/**
 * بابُ التصميم. القفلُ قفلُ الغرفة نفسِه، والمِلكيّةُ تحكمها سياسةُ own-row: من طلب رمزَ
 * غيرِه لم يُردَّ بمنعٍ يكشف وجودَه، بل بسطرٍ يقول «لم يُعثر عليه».
 */
export default async function QrDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { id } = await params;
  const { link, error } = await getQrLink(id);

  if (error) return <Alert tone="warning" title="تعذّر جلب الباركود">{error}</Alert>;
  if (!link) return <Alert tone="warning" title="لم يُعثر على الباركود">ربّما حُذف، أو ليس من باركوداتك.</Alert>;

  return <QrDesignView link={link} />;
}
