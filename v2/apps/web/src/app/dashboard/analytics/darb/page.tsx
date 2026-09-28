import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";
import { getDarbStats } from "./data";
import { DarbStatsView } from "./DarbStatsView";

/**
 * **إحصائيّاتُ «دربك خضر»** (طلبُ المالك ٢٠٢٦-٠٩-٢٥): كم زار، وكم لعب، وكم مرّة، وكم أنشأ حسابًا
 * من أجل اللعبة. تحت «إحصائيّات الزوّار» وبقفلها نفسِه، وتُقرأ في الخادم كلَّ طلب وتتجدّد كلَّ دقيقة.
 * واللعبةُ دائمةٌ بعد المسابقة (٢٠٢٦-٠٩-٢٨)، فلا طورَ للمسابقة في الرأس: الأرقامُ حيّةٌ دائمًا.
 */
export const dynamic = "force-dynamic";

export default async function DarbStatsPage() {
  const denied = await denyUnless("/dashboard/analytics");
  if (denied) return denied;

  const { data, error } = await getDarbStats();

  return (
    <>
      <PageHeader
        title="إحصائيّات دربك خضر"
        crumbLeaf="دربك خضر"
        parent={{ label: "إحصائيّات الزوّار", href: "/dashboard/analytics" }}
        status={data ? { label: "مباشر", tone: "success", live: true } : undefined}
      />
      {error || !data ? (
        <Alert tone="warning" title="تعذّر جلب الإحصائيّات">{error ?? "لا بيانات."}</Alert>
      ) : (
        <DarbStatsView data={data} />
      )}
    </>
  );
}
