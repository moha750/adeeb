import { notFound } from "next/navigation";
import { Container, Footer } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { shareOg } from "@/lib/share";
import { ToastProvider } from "@/app/dashboard/_components/ToastProvider";
import { REG_BASE, docContext, docs, findDoc } from "@/lib/regulations/data";
import { RegDoc } from "../_parts/RegDoc";

export const generateStaticParams = async () => (await docs()).map((d) => ({ slug: d.slug }));

// النصُّ من القاعدة: يتجدّد كلَّ ساعة، فيظهر الإصدارُ الجديد يومَ نفاذه.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await findDoc(slug);
  if (!doc) return { title: "أنظمة أدِيب" };
  const title = `${doc.title}، أنظمة أدِيب`;
  return { title, description: doc.summary, openGraph: shareOg({ title, description: doc.summary, url: `/regulations/${doc.slug}` }) };
}

export default async function RegulationDoc({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const all = await docs();
  const doc = all.find((d) => d.slug === slug);
  if (!doc) notFound();
  const c = docContext(doc, all);
  return (
    <>
      <SiteHeader />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <ToastProvider>
              <RegDoc doc={doc} base={REG_BASE} previews={c.previews} cited={c.cited} docNames={c.docNames} counts={c.counts} next={c.next} />
            </ToastProvider>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
