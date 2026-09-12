import { getLatestEpisodes, isPlayable, toTrack } from "../data";
import type { RailItem } from "../_player/ContinueRail";
import type { Track } from "../_player/PlayerProvider";
import { LibraryView } from "./LibraryView";

export const revalidate = 60;

/**
 * **بابُ مكتبتي.**
 *
 * الخادمُ لا يعرف ما سمعه الزائرُ ولا ما حفظه: كلاهما في متصفّحه. فيرسل
 * **حوضًا** من آخر الحلقات ويُنخَل في العميل. والحوضُ ستّون لا أربعٌ وعشرون
 * كما في الصفحة الأولى: هناك يُعرَض رفٌّ من أربعة، وهنا تُعرَض المكتبةُ كلُّها،
 * فحوضٌ ضيّقٌ يُخفي ما حفظه المستمعُ قبل أسابيع ولا يقول له لماذا.
 */
export const metadata = {
  title: "مكتبتي",
  description: "ما بدأتَه ولم تُتمّه، وما حفظتَه لتسمعه لاحقًا.",
  alternates: { canonical: "/radio/library" },
  robots: { index: false },
};

export default async function RadioLibraryPage() {
  const latest = await getLatestEpisodes(60);
  const playable = latest.filter((l) => isPlayable(l.episode));
  const tracks: Track[] = playable.map((l) =>
    toTrack(l.episode, { title: l.showTitle, slug: l.showSlug, logoUrl: l.showLogoUrl, tone: l.showTone }),
  );
  const pool: RailItem[] = playable.map((l, i) => ({
    track: tracks[i],
    number: l.episode.number,
    dateLabel: l.episode.dateLabel,
    summary: l.episode.summary,
    showName: l.showTitle,
  }));

  return (
    <main>
      <div className="stx-top">
        <h1>مكتبتي</h1>
      </div>
      <LibraryView pool={pool} />
    </main>
  );
}
