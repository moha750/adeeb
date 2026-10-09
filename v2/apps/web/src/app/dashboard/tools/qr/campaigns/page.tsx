import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getMyQrCampaigns } from "./data";
import { CampaignsView } from "./CampaignsView";

/**
 * **بابُ الحملات** — القفلُ قفلُ الغرفة نفسِه (`use_qr_generator`)، لا قدرةَ جديدة:
 * الحاويةُ ترتيبُ باركوداتِك أنت، ومن ملك المولّدَ ملك ترتيبَ ما يصنع.
 */
export const metadata = { title: "حملات الباركود، بوّابة أدِيب" };

export default async function QrCampaignsPage() {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { rows, error } = await getMyQrCampaigns();
  return <CampaignsView rows={rows} error={error} />;
}
