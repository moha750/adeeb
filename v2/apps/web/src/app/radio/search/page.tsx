import Link from "next/link";
import { Footer } from "@adeeb/design-system";
import { Play } from "@phosphor-icons/react/dist/ssr";
import { MagnifyingGlass, CaretLeft } from "@/app/_components/glyphs";
import { SiteHeader } from "../../_components/SiteHeader";
import { getPublicShows, getPublicStation, getLatestEpisodes, isPlayable } from "../data";
import { findSnippet, matches } from "@/lib/radio/arabicSearch";

export const revalidate = 60;

export const metadata = {
  title: "بحث، إذاعة أدِيب",
  description: "ابحث في برامج إذاعة أدِيب وحلقاتها، وفي كلام الحلقات نفسه.",
  alternates: { canonical: "/radio/search" },
};

/**
 * **بحثُ المحطّة** — ثلاثةُ نطاقاتٍ في مدخلٍ واحد: برامج، وحلقات، **وداخلَ
 * الكلام**.
 *
 * والثالثُ هو ما لا تملكه منصّةٌ تنافسنا: نصُّ كلِّ حلقةٍ مخزونٌ عندنا، فيُبحَث
 * فيه وتُردّ **الجملةُ التي قيلت فيها الكلمة**. ‏(ويومَ ينزل التفريغُ الموقَّت
 * يصير معها زرٌّ يبدأ الحلقةَ من تلك اللحظة بعينها؛ اليومَ يُحيل إلى الحلقة.)
 *
 * ══ حدودٌ مُعلَنة ══
 * البحثُ يقع **في الخادم على حوضٍ محدود** (`SEARCH_POOL`) لا في القاعدة: لا
 * عمودَ مطبَّعًا مفهرسًا بعد، و`ilike` بلا تطبيعٍ يُخرج بحثًا معطوبًا لا ناقصًا
 * (من كتب «المنعطف» لا يجد «منعطف»). فالتطبيعُ في `lib/radio/arabicSearch`
 * وهو **جاهزٌ لأن يُنادى من الترحيل نفسِه** يومَ ينزل العمود.
 * وهذا يصمد إلى بضع مئاتٍ من الحلقات، ثمّ يجب أن يهاجر إلى `tsvector`.
 */
const SEARCH_POOL = 120;
const MAX_HITS = 24;

export default async function RadioSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim();
  const scope = (Array.isArray(sp.in) ? sp.in[0] : sp.in) ?? "all";

  const [station, { shows }, latest] = await Promise.all([
    getPublicStation(),
    getPublicShows(),
    q ? getLatestEpisodes(SEARCH_POOL) : Promise.resolve([]),
  ]);

  const showHits = q ? shows.filter((s) => matches(`${s.title} ${s.tagline ?? ""} ${s.description ?? ""}`, q)) : [];

  const playable = latest.filter((l) => isPlayable(l.episode));
  const epHits = q
    ? playable.filter((l) => matches(`${l.episode.title} ${l.episode.summary ?? ""}`, q)).slice(0, MAX_HITS)
    : [];

  /* داخلَ الكلام: الجملةُ التي قيلت فيها الكلمة، لا عنوانُ الحلقة. */
  const wordHits = q
    ? playable
        .flatMap((l) => {
          const found = l.episode.transcript ? findSnippet(l.episode.transcript, q) : null;
          return found ? [{ l, ...found }] : [];
        })
        .slice(0, MAX_HITS)
    : [];

  const tab = (key: string, label: string, n: number) => (
    <Link
      href={`/radio/search?q=${encodeURIComponent(q)}&in=${key}`}
      className="stn-pill"
      aria-pressed={scope === key}
    >
      {label}
      {q ? <bdi dir="ltr"> {n}</bdi> : null}
    </Link>
  );

  const showAll = scope === "all";
  const total = showHits.length + epHits.length + wordHits.length;

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
              <span>بحث</span>
            </nav>

            <form className="stn-find" action="/radio/search" method="get" role="search">
              <MagnifyingGlass aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="ابحث في البرامج والحلقات وفي الكلام نفسه"
                aria-label="ابحث في المحطّة"
                autoComplete="off"
              />
            </form>

            {q ? (
              <>
                <div className="stn-sec">
                  <div className="stn-tools">
                    {tab("all", "الكلّ", total)}
                    {tab("shows", "برامج", showHits.length)}
                    {tab("episodes", "حلقات", epHits.length)}
                    {tab("words", "داخلَ الكلام", wordHits.length)}
                  </div>
                </div>

                {total === 0 ? (
                  <div className="stn-empty">
                    <p>
                      لا نتائج لـ«{q}». جرّب كلمةً أقصر، أو تصفّح <Link href="/radio/shows">برامجَ المحطّة</Link>.
                    </p>
                  </div>
                ) : null}

                {(showAll || scope === "shows") && showHits.length ? (
                  <section className="stn-sec">
                    <div className="stn-shead">
                      <h2>البرامج</h2>
                    </div>
                    <div className="stn-grid">
                      {showHits.map((s) => (
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
                          {s.tagline ? <span className="stn-show-meta">{s.tagline}</span> : null}
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {(showAll || scope === "episodes") && epHits.length ? (
                  <section className="stn-sec">
                    <div className="stn-shead">
                      <h2>الحلقات</h2>
                    </div>
                    <div>
                      {epHits.map((l) => (
                        <Link key={l.episode.id} href={`/radio/${l.showSlug}/${l.episode.slug}`} className="stn-hit">
                          <span className="stn-hit-head">
                            <span className="stn-hit-show">{l.showTitle}</span>
                            <span>{l.episode.dateLabel}</span>
                          </span>
                          <span className="stn-hit-t">{l.episode.title}</span>
                          {l.episode.summary ? <p className="stn-hit-q">{l.episode.summary}</p> : null}
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {(showAll || scope === "words") && wordHits.length ? (
                  <section className="stn-sec">
                    <div className="stn-shead">
                      <h2>داخلَ الكلام</h2>
                    </div>
                    <div>
                      {wordHits.map((h) => (
                        <Link
                          key={h.l.episode.id}
                          href={`/radio/${h.l.showSlug}/${h.l.episode.slug}#transcript`}
                          className="stn-hit"
                        >
                          <span className="stn-hit-head">
                            <span className="stn-hit-show">{h.l.showTitle}</span>
                            <span>{h.l.episode.title}</span>
                          </span>
                          {/* الكلمةُ تُعلَّم في موضعها: بلا ذلك لا يُعرَف لِمَ ظهرت النتيجة */}
                          <p className="stn-hit-q">
                            {h.before}
                            <mark>{h.match}</mark>
                            {h.after}
                          </p>
                          <span className="stn-hit-at">
                            <Play size={13} weight="fill" aria-hidden />
                            اقرأها في الحلقة
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              /* قبل الكتابة: أبوابٌ لا شاشةٌ فارغة، وهو ما تفعله آبل وسبوتيفاي. */
              <section className="stn-sec">
                <div className="stn-shead">
                  <h2>ابدأ من هنا</h2>
                </div>
                <div className="stn-grid">
                  {shows.slice(0, 8).map((s) => (
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
                    </Link>
                  ))}
                </div>
              </section>
            )}
        </div>
      </main>
      <Footer />
    </>
  );
}
