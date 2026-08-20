import { Alert } from "@adeeb/design-system";
import { getAnalytics, type Source } from "./data";
import { StatsView } from "./StatsView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../_components/PageHeader";

const RANGES = [7, 30, 90, 3650];
const SOURCES: Source[] = ["web", "app"];

const Head = () => (
  <PageHeader title="إحصائيّات الزوّار" />
);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string; src?: string }> }) {
  const denied = await denyUnless("/dashboard/analytics");
  if (denied) return denied;

  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  // بابٌ مجهولٌ في العنوان يسقط إلى «البابين»، فلا يُسأل القاعدةَ عن قيمةٍ لا تعرفها
  const source = SOURCES.includes(sp.src as Source) ? (sp.src as Source) : null;
  const { data, recent, error } = await getAnalytics(days, source);

  if (error || !data) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب الإحصائيّات">{error ?? "لا بيانات."}</Alert>
      </>
    );
  }

  return (
    <>
      <Head />
      <StatsView data={data} recent={recent} days={days} source={source} />
    </>
  );
}
