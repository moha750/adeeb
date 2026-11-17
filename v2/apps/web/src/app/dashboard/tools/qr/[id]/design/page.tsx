import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AdRoomError, AdRoomMissing } from "@/app/_ad/states";
import { getQrLink } from "../../data";
import { QrDesignView } from "./QrDesignView";

export const metadata = { title: "تصميم الباركود، بوّابة أدِيب" };

/**
 * بابُ التصميم. القفلُ قفلُ الغرفة نفسِه، والمِلكيّةُ تحكمها سياسةُ own-row: من طلب رمزَ
 * غيرِه لم يُردَّ بمنعٍ يكشف وجودَه، بل بسطرٍ يقول «لم يُعثر عليه».
 *
 * `?new=1` لمن وصل من «باركود جديد» (محمد ٢٠٢٦-١١-١٧): الشكلُ خطوتُه الأخيرة، و«تمّ، الباركود جاهز» يوصله إلى بيته.
 */
export default async function QrDesignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { id } = await params;
  const { new: fresh } = await searchParams;
  const { link, error } = await getQrLink(id);

  if (error) return <AdRoomError title="تصميم الباركود" navPath="/dashboard/tools/qr" what="الباركود" message={error} />;
  if (!link) return <AdRoomMissing title="تصميم الباركود" navPath="/dashboard/tools/qr" what="الباركود" desc="ربّما حُذف، أو ليس من باركوداتك." back={{ label: "إلى باركوداتك", href: "/dashboard/tools/qr" }} />;

  return <QrDesignView link={link} fresh={fresh === "1"} />;
}
