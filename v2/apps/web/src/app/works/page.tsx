import "@adeeb/design-system/ad.css";
import { Footer } from "@adeeb/design-system";
import { createAdeebServerClient } from "@adeeb/core";
import type { Work } from "../_components/WorkLightbox";
import { WorksIndex } from "../_ad/rooms/PublicIndexRooms";
import { SiteHeader } from "../_components/SiteHeader";

export const revalidate = 60;

export const metadata = {
  title: "كل الأعمال، أدِيب",
  description: "أرشيف إبداعات نادي أدِيب: مختاراتٌ من أعمال أعضائه وبرامجه.",
};

/** أعمالُنا على قالب «الفهرس» العامّ (٢٠٢٦-١١-١٥، اعتمده محمد) — بمفتاح anon (RLS)، بترتيبها المختار. */
export default async function WorksPage() {
  const sb = createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await sb.from("works").select("id,title,category,image_url,link_url").order("order", { ascending: true }).returns<Work[]>();
  return (
    <>
      <SiteHeader activeHref="/works" />
      <main className="ad-pub"><div className="ad-pub-wrap"><WorksIndex works={data ?? []} error={error?.message ?? null} /></div></main>
      <Footer />
    </>
  );
}
