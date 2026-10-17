import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";
import { getBoards, getContests, getGames, getGameStats, getMetrics, heroFacts } from "../data";
import { GameView } from "../GameView";

export const dynamic = "force-dynamic";

/** صفحةُ لعبةٍ في غرفة الألعاب: بقفل الغرفة نفسِه (`manage_games`). */
export default async function GamePage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const denied = await denyUnless("/dashboard/games");
  if (denied) return denied;

  const { slug } = await params;
  const { tab } = await searchParams;
  const [{ games, error }, { contests, now }, { stats, error: statsError }, metrics] = await Promise.all([
    getGames(),
    getContests(slug),
    getGameStats(slug),
    getMetrics(slug),
  ]);
  const boards = await getBoards(contests, now);
  if (error) {
    return (
      <>
        <PageHeader title="اللعبة" />
        <Alert tone="warning" title="تعذّر جلب اللعبة">{error}</Alert>
      </>
    );
  }
  const game = games.find((g) => g.slug === slug);
  if (!game) notFound();

  return (
    <GameView
      game={game}
      facts={heroFacts(stats)}
      initialTab={tab === "contests" || tab === "data" ? tab : undefined}
      position={games.indexOf(game) + 1}
      positions={games.length}
      contests={contests}
      metrics={metrics[slug] ?? []}
      boards={boards}
      stats={stats}
      statsError={statsError}
      now={now}
    />
  );
}
