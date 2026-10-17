import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Footer } from "@adeeb/design-system";
import { SiteHeader } from "../../_components/SiteHeader";
import { irfanPreviewPath } from "@/lib/irfan/whatsapp";
import { getSharedIrfan } from "./data";
import { SharedCard } from "./SharedCard";

/**
 * **بطاقةُ «عِرفان» علنيّةً برمزها** (`/irfan/<رمز>`) — الرابطُ الذي يصحب الرسالةَ في واتساب. صفحتُه
 * تعلن صورةَ المعاينة (Open Graph) فيعرضها واتساب فوق الرسالة، ومن فتحه رأى البطاقة نفسَها مرسومةً
 * وحفظها. والرمزُ ١٢٢ بتًّا لا يُخمَّن، والصفحةُ لا تُفهرَس.
 */
export const dynamic = "force-dynamic";

function previewUrl(token: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return base ? `${base}/storage/v1/object/public/images/${irfanPreviewPath(token)}` : null;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const m = await getSharedIrfan(token);
  if (!m) return { title: "عِرفان، نادي أدِيب", robots: { index: false, follow: false } };
  const title = `عِرفانٌ إلى ${m.card.to}`;
  const description = `من ${m.card.from}${m.card.season ? `، بمناسبة ${m.card.season}` : ""}`;
  const image = previewUrl(token);
  return {
    title: `${title}، نادي أدِيب`,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "article", images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : [] },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : [] },
  };
}

export default async function SharedIrfanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const m = await getSharedIrfan(token);
  if (!m) notFound();
  return (
    <>
      <SiteHeader />
      <main className="py-12 md:py-20">
        <Container>
          <SharedCard id={m.id} card={m.card} look={m.look} />
        </Container>
      </main>
      <Footer />
    </>
  );
}
