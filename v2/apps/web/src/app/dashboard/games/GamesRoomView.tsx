"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SectionCard, Stat } from "@adeeb/design-system";
import { GameController, Monitor, Trophy, Users } from "@phosphor-icons/react";
import { Plus } from "@/app/_components/glyphs";
import { PageHeader } from "../_components/PageHeader";
import { useToast } from "../_components/ToastProvider";
import { MonthPulse, sumOf } from "./MonthPulse";
import { Trend } from "./Trend";
import { ContestsPanel } from "./ContestsPanel";
import { HallLineup } from "./HallLineup";
import { ContestEditor, type ContestGame, type ContestTarget } from "./ContestEditor";
import { moveGame, setGameInHall } from "./actions";
import { NOUNS, PERIOD, PERIOD_LABEL, contestPhase, countNoun, type BoardRow, type ContestRow, type GameDay, type GameRow, type GamePeriod } from "./vocab";

/**
 * **غرفةُ الألعاب** (الهيكلُ الثاني، المالك ٢٠٢٦-١٠-١٧): كانت فهرسًا جميلًا لا تُدار منه الصالة، فصارت:
 *  - **آخرُ 30 يومًا** (المالك ٢٠٢٦-١٠-٢٩: «احتسب في شهر»): هل كلُّ لعبةٍ حيّة؟ جولاتُها ولاعبوها بفرقهما عن الثلاثين قبلها.
 *  - **المسابقات:** كلُّها في قائمةٍ واحدة، الحاليّةُ بعدّادها ومتصدّرها والسابقةُ بفائزها.
 *  - **الصالةُ الآن:** الألعابُ بترتيبها في `/games`، والظهورُ والترتيبُ فعلٌ فوريٌّ لا ينتظر «حفظ».
 *
 * والفعلُ الفوريُّ متفائل: يتبدّل الصفُّ ساعةَ النقر ثمّ يُصدّقه الخادم، فإن رفض عاد كما كان بإشعار.
 */
export function GamesRoomView({
  games: initial, days, periods, contests, leaders, contestGames, now,
}: {
  games: GameRow[];
  days: Record<string, GameDay[]>;
  periods: Record<string, GamePeriod>;
  contests: ContestRow[];
  leaders: Record<string, BoardRow | undefined>;
  /** ما يُتنافس فيه (لعبةٌ لها مقياس). وبلا شيءٍ لا زرَّ «مسابقة جديدة». */
  contestGames: ContestGame[];
  now: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const [games, setGames] = useState(initial);
  const [seen, setSeen] = useState(initial);
  // الخادمُ أعاد قراءةً جديدة (`router.refresh`): تُعتمد هي، لا ما بقي من التفاؤل.
  if (initial !== seen) { setSeen(initial); setGames(initial); }
  const [busy, setBusy] = useState<string | null>(null);
  const [target, setTarget] = useState<ContestTarget | null>(null);

  const run = (slug: string, optimistic: GameRow[], act: () => Promise<{ ok: boolean; message: string }>) => {
    const before = games;
    setGames(optimistic);
    setBusy(slug);
    start(async () => {
      const r = await act();
      setBusy(null);
      if (!r.ok) { setGames(before); toast.error(r.message); return; }
      router.refresh();
    });
  };

  const toggle = (slug: string, inHall: boolean) =>
    run(slug, games.map((g) => (g.slug === slug ? { ...g, inHall } : g)), () => setGameInHall(slug, inHall));

  const move = (slug: string, dir: -1 | 1) => {
    const next = [...games];
    const i = next.findIndex((g) => g.slug === slug);
    let j = i + dir;
    while (j >= 0 && j < next.length && !next[j].inHall) j += dir;
    if (i < 0 || j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    run(slug, next, () => moveGame(slug, dir));
  };

  // كروتُ الرأس كسائر الغرف: الألعابُ كلُّها معًا في النافذة (`PERIOD`)، ثمّ ما يجري وما في الصالة.
  const all = Object.values(days);
  const runs = all.reduce((n, d) => n + sumOf(d.slice(-PERIOD), "runs"), 0);
  const runsB = all.reduce((n, d) => n + sumOf(d.slice(-2 * PERIOD, -PERIOD), "runs"), 0);
  const players = Object.values(periods).reduce((n, w) => n + w.players[0], 0);
  const playersB = Object.values(periods).reduce((n, w) => n + w.players[1], 0);
  const open = contests.filter((c) => contestPhase(c, now) !== "over").length;
  const shown = games.filter((g) => g.inHall).length;
  const nf = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="gmr gmr-cq">
      <PageHeader
        title="ألعاب أدِيب"
        action={contestGames.length ? { label: "مسابقة جديدة", icon: <Plus size={18} />, onClick: () => setTarget({ pick: true }) } : undefined}
      />
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<GameController />} value={nf(runs)} label={`${countNoun(runs, NOUNS.RUN)} ${PERIOD_LABEL}`} trend={<Trend now={runs} before={runsB} />} />
        <Stat icon={<Users />} value={nf(players)} label={`${countNoun(players, NOUNS.PLAYER)} ${PERIOD_LABEL}`} trend={<Trend now={players} before={playersB} />} />
        <Stat icon={<Trophy />} value={nf(open)} label="مسابقة جارية أو قادمة" />
        <Stat
          icon={<Monitor />}
          value={nf(shown)}
          label={`${countNoun(shown, NOUNS.GAME)} معروضة في الصالة`}
          note={games.length > shown ? `و${nf(games.length - shown)} خارجها` : undefined}
        />
      </div>
      <div className="gmr-room">
        <div className="gmr-room-main">
          <MonthPulse games={games} days={days} periods={periods} />
          <ContestsPanel
            contests={contests}
            leaders={leaders}
            serverNow={now}
            hrefFor={(c) => `/dashboard/games/${c.gameSlug}?tab=contests`}
          />
        </div>
        <SectionCard title="الصالة الآن" icon={<Monitor />}>
          <HallLineup games={games} busy={busy} onToggle={toggle} onMove={move} />
        </SectionCard>
      </div>
      {target ? <ContestEditor key={JSON.stringify(target)} target={target} games={contestGames} onClose={() => setTarget(null)} /> : null}
    </div>
  );
}
