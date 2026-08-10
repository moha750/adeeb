import { Footer, Container, LandingHeading } from "@adeeb/design-system";
import { getPublicActivities } from "./data";
import { PublicActivityCard } from "./PublicActivityCard";
import { SiteHeader } from "../_components/SiteHeader";

export const revalidate = 60;

export const metadata = {
  title: "برامجنا وأنشطتنا، أديب",
  description: "احجز مقعدك في ورش نادي أديب وبرامجه وحواراته القادمة.",
};

export default async function ActivitiesPage() {
  const items = await getPublicActivities();

  return (
    <>
      <SiteHeader activeHref="/activities" />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="برامجنا"
              title="أنشطةٌ قادمة"
              deck="احجز مقعدك في ورش أديب وبرامجه وحواراته."
              align="center"
            />
            {items.length === 0 ? (
              <p className="text-center text-content-muted">لا فعاليّات قادمة الآن. تابعنا لتصلك الجديدة.</p>
            ) : (
              <div className="card-grid" style={{ marginTop: 32 }}>
                {items.map((a) => (
                  <PublicActivityCard key={a.id} a={a} />
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
