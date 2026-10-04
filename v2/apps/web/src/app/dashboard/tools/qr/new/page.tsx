import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getQrCampaign } from "../campaigns/data";
import { NewQrView } from "./NewQrView";

export const metadata = { title: "باركود جديد، بوّابة أديب" };

/**
 * بابُ الإنشاء. القفلُ قفلُ الغرفة نفسِه (`use_qr_generator`).
 *
 * **و`?campaign=` يقول أين يُولَد** (م١٨): زرُّ «باركود جديد» في غرفة الحملة يحمل معرّفَها،
 * فيُولَد الملصقُ داخلها ولا يُطلَب من صاحبه أن يضمَّه بعد إنشائه. والحاويةُ تُقرأ هنا
 * لاسمها لا لتصديقها: التصديقُ محفّزٌ في القاعدة (`qr_campaign_guard`)، فما ليس لك لا
 * يُقرأ أصلًا بسياسة own-row، ويُبنى الباركودُ شاردًا بدل أن يُردّ إنشاؤه.
 */
export default async function NewQrPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { campaign: wanted } = await searchParams;
  const room = wanted ? await getQrCampaign(wanted) : null;

  return (
    <NewQrView
      campaignId={room?.campaign?.id ?? null}
      campaignName={room?.campaign?.name ?? null}
    />
  );
}
