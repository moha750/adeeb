import { Ambient, Footer, Container } from "@adeeb/design-system";
import { CLUB_TZ, fmtDate } from "@adeeb/core/dates";
import { getPublicNews } from "./data";
import { NewsCard } from "./NewsCard";
import { NewsMasthead } from "./NewsMasthead";
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
  return { dateLine: `${day} ${fmtDate(now.toISOString())}`, hijri };
}

export default async function NewsPage() {
  const items = await getPublicNews();

  return (
    <>
      <SiteHeader activeHref="/news" />
      <main className="amb-host">
        <Ambient />
        <section className="pt-6 pb-16 md:pt-12 md:pb-24">
          <Container>
            {/* الترويسةُ بلغة «الشُّرفة المقلوبة» والشبكةُ تتدلّى منها — المالك ٢٠٢٦-١٠-١٤ */}
            <div className="news-mast">
              <NewsMasthead
                {...today()}
                count={items.length}
                featured={items.filter((n) => n.featured).length}
                views={items.reduce((s, n) => s + n.views, 0)}
              />
              {items.length === 0 ? (
                <p className="news-mast-grid text-center text-content-muted" style={{ marginBlockStart: 24 }}>
                  لا أخبار منشورة بعد. تابعنا لتصلك الجديدة.
                </p>
              ) : (
                <div className="card-grid news-mast-grid">
                  {items.map((n) => (
                    <NewsCard key={n.id} n={n} />
                  ))}
                </div>
              )}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
