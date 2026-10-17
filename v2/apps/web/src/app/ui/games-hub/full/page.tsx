import { Hub } from "@/app/games/_components/Hub";
import { HALL_LOOK } from "@/lib/games/look";
import { DEMO_EVENT, DEMO_STATS, gamesFor } from "../demo";

/**
 * **الصالةُ بملء الشاشة** — كما ستكون `/games` نفسُها، بلا إطار: تتغيّر مع النافذة، وتُفتح في
 * أيّ جهاز، بالمظهر المعتمَد (`lib/games/look.ts`). وعددُ الألعاب
 * (`?n=1` إلى `4`) بألعابٍ للعرض فقط بعد «دربك خضر» (`../demo.ts`).
 */
export default async function GamesHubFull({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  return (
    <div className="agm agmp-full" {...HALL_LOOK}>
      <Hub games={gamesFor(Number(n) || 1)} event={DEMO_EVENT} stats={DEMO_STATS} />
    </div>
  );
}
