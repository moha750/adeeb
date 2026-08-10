import { Footer, Container, LandingHeading } from "@adeeb/design-system";
import { getPublicShows, getPublicStation } from "./data";
import { ShowCard } from "./ShowCard";
import { SiteHeader } from "../_components/SiteHeader";

export const revalidate = 60;

export const metadata = {
  title: "إذاعة أدِيب",
  description: "برامجُ نادي أدِيب مسموعةً: حوارٌ وقراءةٌ وكلمة، بموسيقى أو بدونها.",
};

export default async function RadioPage() {
  const [station, shows] = await Promise.all([getPublicStation(), getPublicShows()]);

  return (
    <>
      <SiteHeader activeHref="/radio" />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="إذاعة"
              title={station.name}
              deck={station.tagline ?? "برامجُ أدِيب مسموعةً، بموسيقى أو بدونها."}
              align="center"
            />
            {shows.length === 0 ? (
              <p className="text-center text-content-muted">لا برامج منشورة بعد. تابعنا لتصلك الأولى.</p>
            ) : (
              <div className="card-grid" style={{ marginTop: 32 }}>
                {shows.map((s) => (
                  <ShowCard key={s.id} s={s} />
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
