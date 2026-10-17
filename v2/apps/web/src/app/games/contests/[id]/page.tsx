import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/app/_components/glyphs";
import { getContestPage } from "@/lib/games/hall";
import { HALL_LOOK } from "@/lib/games/look";
import { ContestClock } from "../../_components/ContestClock";
import { score } from "../../_components/hall";

/**
 * **صفحةُ المسابقة** (`/games/contests/<id>`، ٢٠٢٦-١٠-١٧) — حيث يقود شريطُ «الحدث الجاري» في الصالة.
 * بهويّة الصالة نفسِها (القاعدة ١، `.agm`): عدّادُها، وعنوانُها وجوائزُها، وعلى ماذا يتنافسون، وصدارتُها
 * العشرةُ الأوائل من جولات نافذتها وحدَها، ثمّ «العب». وبعد نهايتها تصير الصدارةُ «الفائزون».
 * وتتجدّد كلَّ ثلاثين ثانية، ولا تُفهرس: صفحةٌ تعيش أيّامًا.
 */
export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = await getContestPage((await params).id);
  return { title: c ? c.title : "ألعاب أدِيبيّة", robots: { index: false, follow: true } };
}

export default async function ContestPage({ params }: { params: Promise<{ id: string }> }) {
  const c = await getContestPage((await params).id);
  if (!c) notFound();
  const { over } = c;

  return (
    <div className="agm agm-page" {...HALL_LOOK}>
      <div className="agm-hub">
        <header className="agm-top">
          <span className="agm-top-name">ألعاب أدِيبيّة</span>
          <Link href="/games" className="agm-top-back">
            <span>الصالة</span>
            <ArrowLeft aria-hidden />
          </Link>
        </header>

        <div className="agm-contest">
          <ContestClock startsAt={c.startsAt} endsAt={c.endsAt} tone={c.game.tone} />
          <h1 className="agm-sec-title">{c.title}</h1>
          <p className="agm-sec-lede">{c.note}</p>

          <div className="agm-board" data-tone={c.game.tone}>
            <h2 className="agm-board-name">{over ? "الفائزون" : "الصدارة الآن"}</h2>
            <p className="agm-board-label">{c.metric.label} في {c.game.name}</p>
            {c.board.length ? (
              <ol className="agm-board-list">
                {c.board.map((r) => (
                  <li key={r.rank}>
                    <span className="agm-rank">{r.rank}</span>
                    <span className="agm-who">{r.name}</span>
                    <span className="agm-val">{score(c.metric.unit, r.value)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="agm-board-label">{over ? "لم يلعب أحدٌ في نافذتها." : "لم يلعب أحدٌ بعد. كن الأوّل."}</p>
            )}
            {over ? null : (
              <Link href={c.game.play} className="agm-board-more">
                <span>العب {c.game.name}</span>
                <ArrowLeft aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
