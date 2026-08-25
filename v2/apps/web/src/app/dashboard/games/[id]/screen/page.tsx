import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../../_components/PageHeader";
import { requestOrigin } from "@/lib/games/origin";
import { getHostSnapshot } from "../../data";
import { ScreenView } from "./ScreenView";

export default async function ScreenPage({ params }: { params: Promise<{ id: string }> }) {
  // قفلُ الغرفة نفسُه: الشاشةُ تعرض الكلمةَ الجاريةَ ولوحَ النتائج، ومسارٌ علنيٌّ يُخمَّن
  // رمزُه يجعلها نافذةً على القاعة. والبروجكترُ يُقاد من حاسوب المضيف وهو مسجَّلٌ أصلًا.
  const denied = await denyUnless("/dashboard/games");
  if (denied) return denied;

  const { id } = await params;
  const { snapshot, error } = await getHostSnapshot(id);

  if (error || !snapshot) {
    return (
      <>
        <PageHeader title="شاشةُ العرض" crumbLeaf="شاشةُ العرض" />
        <Alert tone="warning" title="لم يُعثر على الغرفة">
          {error ?? "إمّا أنّها حُذفت، وإمّا أنّ الرابط خاطئ."}
        </Alert>
      </>
    );
  }

  return <ScreenView initial={snapshot} origin={await requestOrigin()} />;
}
