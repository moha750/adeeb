"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "../_components/PageHeader";
import { LiveContest } from "./LiveContest";
import { RackRoom } from "./RackRoom";
import type { ContestPhase, ContestRow, GameRow } from "./vocab";
import type { GameFacts } from "./data";

/**
 * **غرفةُ الألعاب: الرفّ** (اختيارُ المالك في `/ui/games-room`، ٢٠٢٦-١٠-١٧، بعد «طريقةُ العرض بدائيّةٌ جدًّا»).
 * في صدرها المسابقةُ التي يعلنها شريطُ الصالة الآن بعدّادها، ثمّ كلُّ لعبةٍ صفٌّ بشاشتها الحيّة واسمِها
 * بخطّ الصالة وأرقامِها وحالِها. والصفُّ يفتح صفحتَها.
 *
 * **ولا زرَّ «لعبة جديدة»** (المالك ٢٠٢٦-١٠-١٧): اللعبةُ كودٌ يُبنى ويُرفع إلى الموقع، ومن يبنيها
 * يسجّل صفَّها في `games` في الخطوة نفسِها (كما سُجّلت «دربك خضر» و«بنك أدِيب» في `games_01_hall`).
 */
export function GamesRoomView({
  games, facts, contestPhase, live,
}: {
  games: GameRow[];
  facts: Record<string, GameFacts>;
  contestPhase: Record<string, ContestPhase>;
  live: ContestRow | null;
}) {
  const router = useRouter();
  return (
    <div className="gmr">
      <PageHeader title="ألعاب أدِيب" />
      {live ? <LiveContest contest={live} href={`/dashboard/games/${live.gameSlug}?tab=contests`} /> : null}
      <RackRoom games={games} facts={facts} phase={contestPhase} onOpen={(slug) => router.push(`/dashboard/games/${slug}`)} />
    </div>
  );
}
