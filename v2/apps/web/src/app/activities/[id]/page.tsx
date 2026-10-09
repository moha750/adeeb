import { notFound } from "next/navigation";
import { Footer, Container } from "@adeeb/design-system";
import { getPublicActivity } from "../data";
import { ActivityDetailView } from "./ActivityDetailView";
import { SiteHeader } from "../../_components/SiteHeader";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getPublicActivity(id);
  return {
    title: a ? `${a.name}، أدِيب` : "فعاليّة، أدِيب",
    description: a?.description ?? "احجز مقعدك في فعاليّات نادي أدِيب.",
  };
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getPublicActivity(id);
  if (!a) notFound();

  return (
    <>
      <SiteHeader activeHref="/activities" />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <ActivityDetailView a={a} />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
