import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";
import { getBankStats, getBoards, getContests, getDarbLeaders, getDays, getGames, getMetrics, getOsool } from "../data";
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
  const [{ games, error }, { contests, now }, d, metrics, bank, leaders, osool] = await Promise.all([
    getGames(),
    getContests(slug),
    getDays(),
    getMetrics(slug),
    slug === "bank-adeeb" ? getBankStats() : null,
    slug === "darbak-khadar" ? getDarbLeaders() : null,
    // «مدارس الأصول» أرقامُها من سجلّها لا من `game_days` (لا فرعَ لها هناك)
    slug === "osool" ? getOsool() : null,
  ]);
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
  const boards = await getBoards(contests, now);

  return (
    <GameView
      game={game}
      initialTab={tab === "contests" || tab === "settings" ? tab : undefined}
      contests={contests}
      metrics={metrics[slug] ?? []}
      boards={boards}
      days={osool ? osool.days : (d.days[slug] ?? [])}
      period={osool ? osool.period : d.periods[slug]}
      bank={bank?.data ?? null}
      leaders={leaders}
      osool={osool ? { stats: osool.stats, players: osool.players } : null}
      statsError={osool ? osool.error : (d.error ?? bank?.error ?? null)}
      now={now}
    />
  );
}
