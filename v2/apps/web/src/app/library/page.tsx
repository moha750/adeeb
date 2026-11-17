import "@adeeb/design-system/ad.css";
import { Footer } from "@adeeb/design-system";
import { getShelf } from "./shelf";
import { LibraryIndex } from "../_ad/rooms/PublicIndexRooms";
import { SiteHeader } from "../_components/SiteHeader";

export const revalidate = 60;

export const metadata = {
  title: "مكتبة إرثٌ يُروى، أدِيب",
  description: "أرشيفٌ حيٌّ من منشورات نادي أدِيب: تقاريره ومجلّاته وكتيّباته، كلُّ صفحةٍ بأثرها.",
};

/** رفُّ المكتبة على قالب «الفهرس» العامّ (٢٠٢٦-١١-١٥، اعتمده محمد) — القراءةُ في `shelf.ts`. */
export default async function LibraryPage() {
  const { books, error } = await getShelf();
  return (
    <>
      <SiteHeader activeHref="/library" />
      <main className="ad-pub"><div className="ad-pub-wrap"><LibraryIndex books={books} error={error} /></div></main>
      <Footer />
    </>
  );
}
