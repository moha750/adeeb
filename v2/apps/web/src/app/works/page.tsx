import { Header, Footer, Container, SectionHeading } from "@adeeb/design-system";
import { createAdeebServerClient } from "@adeeb/core";
import type { Work } from "../_components/WorkLightbox";
import { WorksBrowser } from "./WorksBrowser";

export const revalidate = 60;

export const metadata = {
  title: "كل الأعمال — أديب",
  description: "أرشيف إبداعات نادي أديب: مختاراتٌ من أعمال أعضائه وبرامجه.",
};

export default async function WorksPage() {
  const sb = createAdeebServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await sb
    .from("works")
    .select("id,title,category,image_url,link_url")
    .order("order", { ascending: true })
    .returns<Work[]>();

  return (
    <>
      <Header />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <SectionHeading eyebrow="أرشيف" title="كل الأعمال" align="center" />
            {error ? (
              <p className="text-center text-danger">تعذّر جلب الأعمال: {error.message}</p>
            ) : !data || data.length === 0 ? (
              <p className="text-center text-content-muted">لا توجد أعمال منشورة بعد.</p>
            ) : (
              <WorksBrowser works={data} />
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
