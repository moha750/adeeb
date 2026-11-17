import "@adeeb/design-system/ad.css";
import { Footer } from "@adeeb/design-system";
import { CLUB_TZ, fmtDate } from "@adeeb/core/dates";
import { getPublicNews } from "./data";
import { NewsIndex } from "../_ad/rooms/PublicIndexRooms";
import { SiteHeader } from "../_components/SiteHeader";

export const revalidate = 60;

export const metadata = {
  title: "آخر الأخبار، أدِيب",
  description: "مستجدّات نادي أدِيب أوّلًا بأوّل: تغطيات وشراكات وإنجازات وإعلانات.",
};

/** سطرُ التاريخ في الترويسة: اليومُ بتوقيت النادي، بالميلاديّ والهجريّ (أمّ القرى). */
function today() {
  const now = new Date();
  const day = new Intl.DateTimeFormat("ar-u-nu-latn", { weekday: "long", timeZone: CLUB_TZ }).format(now);
  const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
    day: "numeric", month: "long", year: "numeric", timeZone: CLUB_TZ,
  }).format(now);
  return [`${day} ${fmtDate(now.toISOString())}`, hijri];
}

export default async function NewsPage() {
  const items = await getPublicNews();

  // على قالب «الفهرس» العامّ الذي وُلد من ترويستها (٢٠٢٦-١١-١٥)، فلا تختلف تفاصيلُها عن الفعاليّات والمكتبة وأعمالنا
  return (
    <>
      <SiteHeader activeHref="/news" />
      <main className="ad-pub"><div className="ad-pub-wrap"><NewsIndex items={items} dateLine={today()} /></div></main>
      <Footer />
    </>
  );
}
