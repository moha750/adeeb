import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getQrShareCandidates } from "../../shares";
import { getMyQrCampaignBriefs, getQrCampaign, getQrCampaignShares } from "../data";
import { QrCampaignRoom } from "@/app/_ad/rooms/QrCampaignRoom";
import { AdRoomError } from "@/app/_ad/states";
import { QR_CAMPAIGN_ROOM } from "@/app/_ad/rooms/qr-campaign.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **غرفةُ حملةٍ بعينها.** القفلُ قفلُ الغرفة نفسِه، والمدى تحكمه سياسةُ own-row: من طلب
 * حاويةً ليست له ولم يُشارَك فيها لم يجد صفًّا، فيُقال «لم يُعثر» ولا يُقال «ممنوع» — فلا
 * يُعرَف بالجواب أمعدومةٌ هي أم ملكُ غيره.
 *
 * **ومرشّحو الشِّركة يُقرَؤون للمالك وحدَه**: هم قائمةُ اختيارٍ في نافذةٍ لا يفتحها غيرُه،
 * وقراءتُها لكلّ ناظرٍ نداءٌ بلا مستعمِل.
 *
 * وعلى قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢)، ولا مساراتٍ أبناءَ للمجلّد فحالتا التحميل والخطأ بجانب الصفحة. **و«لم يُعثر»
 * ليس خطأَ جلب**: يبقى تنبيهَه كما كان، فلا يُقال «تعذّر جلب الحملة» عن حملةٍ معدومةٍ أو ليست لك.
 */
export const metadata = roomMetadata(QR_CAMPAIGN_ROOM);

export default async function QrCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { id } = await params;
  const [{ campaign, links, error }, shares] = await Promise.all([
    getQrCampaign(id),
    getQrCampaignShares(id),
  ]);

  if (error) return <AdRoomError {...QR_CAMPAIGN_ROOM} message={error} />;
  if (!campaign) return <Alert tone="warning" title="لم يُعثر على الحملة">قد تكون حُذفت، أو ليست لك.</Alert>;

  // **وحملاتُه تُقرأ للمالك وحدَه**: هي وجهاتُ النقل في نافذةٍ لا يفتحها غيرُه.
  const [candidates, campaigns] = await Promise.all([
    campaign.access === "owner" ? getQrShareCandidates() : Promise.resolve([]),
    campaign.access === "owner" ? getMyQrCampaignBriefs() : Promise.resolve([]),
  ]);

  return (
    <QrCampaignRoom
      campaign={campaign}
      links={links}
      shares={shares.rows}
      candidates={candidates}
      campaigns={campaigns}
      serverNow={await requestNow()}
      view={await roomView(QR_CAMPAIGN_ROOM.viewKey, QR_CAMPAIGN_ROOM.defaultView)}
    />
  );
}
