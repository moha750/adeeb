import { Alert } from "@adeeb/design-system";
import { getAnalytics } from "./data";
import { StatsView } from "./StatsView";

const RANGES = [7, 30, 90, 3650];

const Head = () => (
  <div className="ash-phead">
    <div>
      <div className="ash-crumb">أديب › النظام › <b>إحصائيّات الزوّار</b></div>
      <h1>إحصائيّات الزوّار</h1>
    </div>
  </div>
);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
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
      {/* حارس الهوية: هذه الشاشة تستعمل تنسيقات `.st-*` مؤقّتة خارج المكتبة — موسومة للإعادة تصميمها بمكوّنات الهوية */}
      <div data-needs="مكوّنات إحصائيّات الزوّار (رسوم بيانيّة/عدّادات هوية)">
        <StatsView data={data} recent={recent} days={days} />
      </div>
    </>
  );
}
