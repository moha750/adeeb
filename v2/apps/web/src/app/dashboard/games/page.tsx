import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../_components/PageHeader";
import { getContests, getGames, getRoomFacts } from "./data";
import { GamesRoomView } from "./GamesRoomView";
import { contestPhase, type ContestPhase } from "./vocab";

export const dynamic = "force-dynamic";

/**
 * **غرفةُ الألعاب** (المالك ٢٠٢٦-١٠-١٧) — تدير صالةَ «ألعاب أدِيبيّة» (`/games`): أيُّ لعبةٍ فيها وبأيّ
 * هيئة، ومسابقاتُ كلّ لعبة، وإحصائيّاتُها. للرئيسين وحدهما (`manage_games`، الترحيل `games_01_hall`).
 */
export default async function GamesPage() {
  const denied = await denyUnless("/dashboard/games");
  if (denied) return denied;

  const [{ games, error }, facts, { contests, now }] = await Promise.all([getGames(), getRoomFacts(), getContests()]);
  if (error) {
    return (
      <>
        <PageHeader title="ألعاب أدِيب" />
        <Alert tone="warning" title="تعذّر جلب الألعاب">{error}</Alert>
      </>
    );
  }

  // أقربُ طورٍ لكلّ لعبة: الجاريةُ تغلب القادمة، وما انتهى لا يُذكر على الكرت.
  const phase: Record<string, ContestPhase> = {};
  for (const c of contests) {
    const p = contestPhase(c, now);
    if (p === "live" || (p === "soon" && phase[c.gameSlug] !== "live")) phase[c.gameSlug] = p;
  }

  // المسابقةُ التي يعلنها شريطُ الصالة: أقربُ ما لم ينتهِ من مسابقات ألعابها (كـ`lib/games/hall.ts`).
  const inHall = new Set(games.filter((g) => g.inHall).map((g) => g.slug));
  const live =
    contests
      .filter((c) => inHall.has(c.gameSlug) && Date.parse(c.endsAt) > now)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0] ?? null;

  return <GamesRoomView games={games} facts={facts} contestPhase={phase} live={live} />;
}
