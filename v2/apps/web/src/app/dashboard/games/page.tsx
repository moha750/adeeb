import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../_components/PageHeader";
import { getBoards, getContests, getDays, getGames, getMetrics } from "./data";
import { GamesRoomView } from "./GamesRoomView";

export const dynamic = "force-dynamic";

/**
 * **غرفةُ الألعاب** (المالك ٢٠٢٦-١٠-١٧) — تدير صالةَ «ألعاب أدِيبيّة» (`/games`): أيُّ لعبةٍ فيها وبأيّ
 * ترتيب، ونبضُ كلّ لعبةٍ في أسبوعها، ومسابقاتُ الألعاب كلُّها. للرئيسين وحدهما (`manage_games`).
 */
export default async function GamesPage() {
  const denied = await denyUnless("/dashboard/games");
  if (denied) return denied;

  const [{ games, error }, { days, weeks }, { contests, now }, metrics] = await Promise.all([
    getGames(), getDays(), getContests(), getMetrics(),
  ]);
  if (error) {
    return (
      <>
        <PageHeader title="ألعاب أدِيب" />
        <Alert tone="warning" title="تعذّر جلب الألعاب">{error}</Alert>
      </>
    );
  }
  const boards = await getBoards(contests, now, 1);
  const leaders = Object.fromEntries(Object.entries(boards).map(([id, rows]) => [id, rows[0]]));
  const contestGames = games
    .filter((g) => (metrics[g.slug] ?? []).length)
    .map((g) => ({ slug: g.slug, name: g.name, metrics: metrics[g.slug] }));

  return (
    <GamesRoomView
      games={games}
      days={days}
      weeks={weeks}
      contests={contests}
      leaders={leaders}
      contestGames={contestGames}
      now={now}
    />
  );
}
