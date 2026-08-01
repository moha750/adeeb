import { Header, Footer, Container, LandingHeading } from "@adeeb/design-system";
import { getPublicNews } from "./data";
import { PublicNewsCard } from "./PublicNewsCard";

export const revalidate = 60;

export const metadata = {
  title: "آخر الأخبار — أديب",
  description: "مستجدّات نادي أديب أوّلًا بأوّل — تغطيات وشراكات وإنجازات وإعلانات.",
};

export default async function NewsPage() {
  const items = await getPublicNews();

  return (
    <>
      <Header />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="أخبار"
              title="آخر الأخبار"
              deck="مستجدّاتُ النادي أوّلًا بأوّل من منصّته الإعلاميّة."
              align="center"
            />
            {items.length === 0 ? (
              <p className="text-center text-content-muted">لا أخبار منشورة بعد — تابعنا لتصلك الجديدة.</p>
            ) : (
              <div className="card-grid" style={{ marginTop: 32 }}>
                {items.map((n) => (
                  <PublicNewsCard key={n.id} n={n} />
                ))}
              </div>
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
