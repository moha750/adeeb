import { Hub } from "@/app/games/_components/Hub";
import { DEMO_EVENT, DEMO_STATS, gamesFor } from "../demo";

/**
 * **الصالةُ بملء الشاشة** — كما ستكون `/games` نفسُها، بلا إطار: تتغيّر مع النافذة، وتُفتح في
 * أيّ جهاز. والمظهرُ من الرابط (`?look=synth` أو `?look=cabinet`) حتى يختار المالك، وعددُ الألعاب
 * (`&n=1` إلى `4`) بألعابٍ للعرض فقط بعد «دربك خضر» (`../demo.ts`).
 */
export default async function GamesHubFull({ searchParams }: { searchParams: Promise<{ look?: string; n?: string }> }) {
  const { look, n } = await searchParams;
  return (
    <div className="agm agmp-full agmp-demo" data-look={look === "cabinet" ? "cabinet" : "synth"}>
      <Hub games={gamesFor(Number(n) || 1)} event={DEMO_EVENT} stats={DEMO_STATS} />
    </div>
  );
}
