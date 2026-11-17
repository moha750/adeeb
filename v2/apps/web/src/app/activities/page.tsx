import "@adeeb/design-system/ad.css";
import { Footer } from "@adeeb/design-system";
import { getPastActivities, getPublicActivities } from "./data";
import { ActivitiesIndex } from "../_ad/rooms/PublicIndexRooms";
import { SiteHeader } from "../_components/SiteHeader";

export const revalidate = 60;

export const metadata = {
  title: "برامجنا وأنشطتنا، أدِيب",
  description: "احجز مقعدك في ورش نادي أدِيب وبرامجه وحواراته القادمة.",
};

/** الفعاليّاتُ القادمة على قالب «الفهرس» العامّ (٢٠٢٦-١١-١٥، اعتمده محمد) — الخادمُ يجلب، والقالبُ يعرض ويرشّح. */
export default async function ActivitiesPage() {
  const [items, past] = await Promise.all([getPublicActivities(), getPastActivities()]);
  return (
    <>
      <SiteHeader activeHref="/activities" />
      <main className="ad-pub"><div className="ad-pub-wrap"><ActivitiesIndex items={items} past={past} /></div></main>
      <Footer />
    </>
  );
}
