import Link from "next/link";
import {Alert, countPhrase} from "@adeeb/design-system";
import { MagnifyingGlass } from "@/app/_components/glyphs";
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
      <main>
        {/* ترويسةُ الباب: اسمُه لا اسمُ المحطّة، فالمحطّةُ تُعرَف في الشريط */}
        <div className="stx-top">
          <h1>تصفَّح</h1>
        </div>
        <div className="stn-page">
            <Link href="/radio/search" className="stn-find">
              <MagnifyingGlass aria-hidden />
              ابحث باسم البرنامج أو في الحلقات
            </Link>

            {shows.length ? (
              <>
                <p className="stn-count">{countPhrase(shows.length, { one: "برنامج", two: "برنامجان", few: "برامج" })}</p>
                <section className="stn-sec">
                  <div className="stc-grid">
                    {shows.map((s) => (
                      <Link key={s.id} href={`/radio/${s.slug}`} className="stc-cov">
                        {s.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logoUrl} alt="" loading="lazy" />
                        ) : (
                          <span className="stc-cov-n" aria-hidden>{s.title.trim()[0]}</span>
                        )}
                        <b>{s.title}</b>
                        <span>
                          {countPhrase(s.episodeCount, EPISODES_UNIT)}
                          {s.hostName ? <>، تقديم {s.hostName}</> : null}
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
    </>
  );
}
