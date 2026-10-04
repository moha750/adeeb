"use client";

import { SharePanel, type ShareWords } from "../SharePanel";
import { setQrCampaignShareAccess, shareQrCampaign, unshareQrCampaign } from "./actions";
import type { QrOwnerBrief } from "../oversight/data";
import type { QrCampaignShare } from "./data";

/**
 * **شركاءُ الحملة** (م٢٠) — الإذنُ على الحاوية يسري على ما فيها.
 *
 * وعلّتُه أنّ حملةَ المعرض ستّةُ ملصقاتٍ يشتغل عليها اثنان: فلا يُشارَك كلُّ ملصقٍ وحدَه
 * ستَّ مرّات، ولا تُعاد المشاركةُ كلّما وُلد ملصقٌ سابع. **والإذنُ يسقط عمّا يخرج منها**
 * في اللحظة نفسِها، فالحاويةُ تقول ما تقوله ولا تُخلّف وراءها أذونًا قديمة.
 *
 * **والبنيةُ للمالك**: الشريكُ يعمل فيما بداخلها، ولا يضمّ ولا يُخرج ولا يعيد تسميتها ولا
 * يشاركها. وتلك حدودُ «شريكٍ في عمل» لا «مالكٍ ثانٍ».
 */

const WORDS: ShareWords = {
  panel: "شركاءُ الحملة",
  modal: "مشاركةُ الحملة",
  modalNote: "الإذنُ على الحملة يسري على باركوداتها كلِّها، وعلى ما يُضمّ إليها بعد اليوم. والملكيّةُ تبقى لك.",
  emptyNote: "شارِك الحملة مع عضوٍ ليقرأ أرقامَها أو يبدّل وجهاتِ ملصقاتها معك، والملكيّةُ تبقى لك.",
  readLabel: "يقرأ الإحصاء",
  editLabel: "يحرّر باركوداتها",
  readLine: "يفتح غرفة الحملة ويقرأ أرقامَها وأرقامَ ملصقاتها",
  editLine: "يبدّل وجهاتِ ملصقاتها وتصاميمَها وحالَها وجداولَها",
  readHelp: "يفتح غرفة الحملة ويقرأ أرقامَها وأرقامَ ملصقاتها. لا يبدّل شيئًا.",
  editHelp: "يبدّل وجهاتِ ملصقاتها وتصاميمَها وحالَها. لا يضمّ ولا يُخرج ولا يحذف.",
};

export function CampaignShares({
  campaignId,
  rows,
  candidates,
  canManage,
}: {
  campaignId: string;
  rows: QrCampaignShare[];
  candidates: QrOwnerBrief[];
  /** المالكُ وحدَه يدير الشركاء؛ والشريكُ يقرأ القائمةَ ولا يغيّرها. */
  canManage: boolean;
}) {
  return (
    <SharePanel
      rows={rows}
      candidates={candidates}
      canManage={canManage}
      words={WORDS}
      onAdd={(userId, access) => shareQrCampaign(campaignId, userId, access)}
      onSetAccess={(userId, access) => setQrCampaignShareAccess(campaignId, userId, access)}
      onDrop={(userId) => unshareQrCampaign(campaignId, userId)}
    />
  );
}
