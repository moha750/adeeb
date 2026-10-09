import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getQrShareCandidates } from "../../shares";
import { getMyQrCampaignBriefs, getQrCampaign, getQrCampaignShares } from "../data";
import { CampaignRoomView } from "./CampaignRoomView";

/**
 * **غرفةُ حملةٍ بعينها.** القفلُ قفلُ الغرفة نفسِه، والمدى تحكمه سياسةُ own-row: من طلب
 * حاويةً ليست له ولم يُشارَك فيها لم يجد صفًّا، فيُقال «لم يُعثر» ولا يُقال «ممنوع» — فلا
 * يُعرَف بالجواب أمعدومةٌ هي أم ملكُ غيره.
 *
 * **ومرشّحو الشِّركة يُقرَؤون للمالك وحدَه**: هم قائمةُ اختيارٍ في نافذةٍ لا يفتحها غيرُه،
 * وقراءتُها لكلّ ناظرٍ نداءٌ بلا مستعمِل.
 */
export const metadata = { title: "حملة باركود، بوّابة أدِيب" };

export default async function QrCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { id } = await params;
  const [{ campaign, links, error }, shares] = await Promise.all([
    getQrCampaign(id),
    getQrCampaignShares(id),
  ]);

  if (error) return <Alert tone="warning" title="تعذّرت قراءة الحملة">{error}</Alert>;
  if (!campaign) return <Alert tone="warning" title="لم يُعثر على الحملة">قد تكون حُذفت، أو ليست لك.</Alert>;

  // **وحملاتُه تُقرأ للمالك وحدَه**: هي وجهاتُ النقل في نافذةٍ لا يفتحها غيرُه.
  const [candidates, campaigns] = await Promise.all([
    campaign.access === "owner" ? getQrShareCandidates() : Promise.resolve([]),
    campaign.access === "owner" ? getMyQrCampaignBriefs() : Promise.resolve([]),
  ]);

  return (
    <CampaignRoomView
      campaign={campaign}
      links={links}
      shares={shares.rows}
      candidates={candidates}
      campaigns={campaigns}
    />
  );
}
