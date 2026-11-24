import "@adeeb/design-system/ad.css";
import { notFound } from "next/navigation";
import { Footer } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { shareOg } from "@/lib/share";
import { REG_BASE, articleCount, docs } from "@/lib/regulations/data";
import { regSigners } from "@/lib/regulations/signers";
import { chapterParts } from "@/lib/regulations/text";
import { RegIndex } from "./_parts/RegIndex";

const DESCRIPTION = "دستورُ نادي أدِيب وأنظمتُه الستّة: العضوية، والمناصب والصلاحيات، والانتخابات، والانضباط، والتطوّع، والشهادات.";

export const metadata = {
  title: "أنظمة أدِيب",
  description: DESCRIPTION,
  openGraph: shareOg({ title: "أنظمة أدِيب", description: DESCRIPTION, url: "/regulations" }),
};

// الوثائقُ من القاعدة وصورتا الرئيسين من ملفّيهما: تُقرأ كلَّ ساعةٍ لا مع كلّ زيارة.
export const revalidate = 3600;

/**
 * فهرسُ «أنظمة أدِيب» على قالب «الفهرس» العامّ (`RegIndex`، ٢٠٢٦-١١-٢٢): التكوينُ المعتمد (٢٠٢٦-١٠-١٣) بمادّة الهويّة.
 */
export default async function RegulationsIndex() {
  const [all, signers] = await Promise.all([docs(), regSigners()]);
  if (!all[0]) notFound();
  // بابُ كلّ مادّة لمسارها في لوحة البحث («الباب الرابع»)
  const crumbs: Record<string, string> = {};
  for (const d of all) for (const c of d.chapters) {
    const [kicker] = chapterParts(c.title);
    if (kicker) for (const a of c.articles) crumbs[`${d.slug}:${a.no}`] = kicker;
  }
  return (
    <>
      <SiteHeader activeHref={REG_BASE} />
      <main className="ad-pub">
        <div className="ad-pub-wrap">
          <RegIndex base={REG_BASE} crumbs={crumbs}
            docs={all.map((d) => ({ slug: d.slug, title: d.title, summary: d.summary, articles: articleCount(d), chapters: d.chapters.length }))}
            signers={signers} />
        </div>
      </main>
      <Footer />
    </>
  );
}
