import Link from "next/link";
import { Alert, Footer, countPhrase } from "@adeeb/design-system";
import { MagnifyingGlass, CaretLeft } from "@/app/_components/glyphs";
import { SiteHeader } from "../../_components/SiteHeader";
import { EPISODES_UNIT } from "../../dashboard/radio/vocab";
import { getPublicShows, getPublicStation } from "../data";

export const revalidate = 60;

/**
 * **فهرسُ البرامج** — السطحُ الذي كان مفقودًا، ووجهةُ كلّ ذيلِ «عرض الكلّ».
 *
 * وواجهةُ المحطّة كانت هي الفهرسَ: رفٌّ أفقيٌّ واحدٌ يحمل البرامجَ كلَّها. وهو
 * صوابٌ عند ثلاثة، ونفقٌ لا يُفتَّش فيه عند عشرين، وجدارٌ عند مئة. فالفهرسُ
 * سطحٌ مستقلٌّ يُبحَث ويُنخَل ويُرقَّم، والواجهةُ تعود إلى سؤالها: بماذا أسمع؟
 *
 * ══ حدودٌ مُعلَنة، لا صامتة ══
 * البحثُ هنا **في المتصفّح** على ما حُمّل، والنخلُ بالتصنيف ينتظر جدولَ الوسوم،
 * والترقيمُ ينتظر أن تبلغ البرامجُ عددًا يستحقّه. وهذه أعمالُ الموجة الثالثة،
 * وهي مسمّاةٌ هنا كي لا تُنسى ولا تُظنّ موجودة.
 */
export const metadata = {
  title: "برامج إذاعة أدِيب",
  description: "كلُّ برامج إذاعة أدِيب: حوارٌ وقراءةٌ وكلمة.",
  alternates: { canonical: "/radio/shows" },
};

export default async function ShowsPage() {
  const [station, { shows, error }] = await Promise.all([getPublicStation(), getPublicShows()]);

  return (
    <>
      <SiteHeader activeHref="/radio" />
      <main className="stn">
        <div className="stn-page">
            <nav className="stn-crumb" aria-label="مسار الصفحة">
              <Link href="/radio">
                <b>{station.name}</b>
              </Link>
              <CaretLeft aria-hidden />
              <span>البرامج</span>
            </nav>

            <div className="stn-mast">
              <span className="stn-mast-txt">
                <h1 className="stn-mast-name">برامجُ المحطّة</h1>
                <span className="stn-mast-sub">كلُّ ما يُذاع في مكانٍ واحد</span>
              </span>
            </div>

            <Link href="/radio/search" className="stn-find">
              <MagnifyingGlass aria-hidden />
              ابحث باسم البرنامج أو في الحلقات
            </Link>

            {shows.length ? (
              <>
                <p className="stn-count">{countPhrase(shows.length, { one: "برنامج", two: "برنامجان", few: "برامج" })}</p>
                <section className="stn-sec">
                  <div className="stn-grid">
                    {shows.map((s) => (
                      <Link key={s.id} href={`/radio/${s.slug}`}>
                        <span className="stn-art stn-art-full" aria-hidden>
                          {s.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.logoUrl} alt="" />
                          ) : (
                            <span className="stn-art-n">{s.title.trim()[0]}</span>
                          )}
                        </span>
                        <span className="stn-show-name">{s.title}</span>
                        <span className="stn-show-meta">
                          {countPhrase(s.episodeCount, EPISODES_UNIT)}
                          {s.hostName ? (
                            <>
                              <br />
                              تقديم {s.hostName}
                            </>
                          ) : null}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            ) : error ? (
              /* تعذّرت القراءة، فلا يُقال «لا برامج»: تلك جملةٌ عن المحتوى وهذه عن العطل. */
              <div className="stn-sec">
                <Alert tone="warning">تعذّر تحميلُ البرامج الآن. أعِد تحديثَ الصفحة بعد قليل.</Alert>
              </div>
            ) : (
              <div className="stn-empty">
                <p>لا برامج منشورة بعد. تابعنا لتصلك الأولى.</p>
              </div>
            )}
        </div>
      </main>
      <Footer />
    </>
  );
}
