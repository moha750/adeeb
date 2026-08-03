import { Alert } from "@adeeb/design-system";
import { getAnalytics } from "./data";
import { StatsView } from "./StatsView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../_shell/Breadcrumb";

const RANGES = [7, 30, 90, 3650];

const Head = () => (
  <div className="ash-phead">
    <div>
      <Breadcrumb />
      <h1>إحصائيّات الزوّار</h1>
    </div>
  </div>
);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const denied = await denyUnless("/dashboard/analytics");
  if (denied) return denied;

  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const { data, recent, error } = await getAnalytics(days);

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
      <StatsView data={data} recent={recent} days={days} />
    </>
  );
}
