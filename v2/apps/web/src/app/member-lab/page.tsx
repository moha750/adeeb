import "@adeeb/design-system/ad.css";
import { notFound } from "next/navigation";
import { Footer } from "@adeeb/design-system";
import { SiteHeader } from "../_components/SiteHeader";
import { getPublicProfile } from "../m/[slug]/data";
import { MemberPublic } from "../_ad/rooms/MemberPublicRoom";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٧): **صفحةُ العضو العلنيّة على قالب «القراءة»** بصفحةٍ حقيقيّة (`?slug=`، وبلاه صفحةُ محمد). تقرأ البابَ العامَّ نفسَه
 * (`get_public_profile`) ولا تكتب شيئًا. والحاليّةُ للمقارنة: `/m/<slug>`. ولا تُفتح في الإنتاج.
 */
export const metadata = { title: "مختبر صفحة العضو" };

export default async function MemberLab({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { slug } = await searchParams;
  const me = await getPublicProfile(slug ?? "محمد-إسماعيل-المطر");
  if (!me) notFound();
  return (
    <>
      <SiteHeader />
      <main className="ad-pub">
        <div className="ad-pub-wrap">
          <MemberPublic me={me} />
        </div>
      </main>
      <Footer />
    </>
  );
}
