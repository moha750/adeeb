"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SectionCard } from "@adeeb/design-system";
import { Plus } from "@/app/_components/glyphs";
import { PageHeader } from "../_components/PageHeader";
import { useToast } from "../_components/ToastProvider";
import { WeekPulse } from "./WeekPulse";
import { ContestsPanel } from "./ContestsPanel";
import { HallLineup } from "./HallLineup";
import { ContestEditor, type ContestGame, type ContestTarget } from "./ContestEditor";
import { moveGame, setGameInHall } from "./actions";
import type { BoardRow, ContestRow, GameDay, GameRow, GameWeek } from "./vocab";

/**
 * **غرفةُ الألعاب** (الهيكلُ الثاني، المالك ٢٠٢٦-١٠-١٧): كانت فهرسًا جميلًا لا تُدار منه الصالة، فصارت:
 *  - **آخرُ سبعة أيام:** هل كلُّ لعبةٍ حيّة؟ جولاتُها ولاعبوها بفرقهما عن الأسبوع قبله، وأعمدةُ أيّامها.
 *  - **المسابقات:** كلُّها في قائمةٍ واحدة، الحاليّةُ بعدّادها ومتصدّرها والسابقةُ بفائزها.
 *  - **الصالةُ الآن:** الألعابُ بترتيبها في `/games`، والظهورُ والترتيبُ فعلٌ فوريٌّ لا ينتظر «حفظ».
 *
 * والفعلُ الفوريُّ متفائل: يتبدّل الصفُّ ساعةَ النقر ثمّ يُصدّقه الخادم، فإن رفض عاد كما كان بإشعار.
 */
export function GamesRoomView({
  games: initial, days, weeks, contests, leaders, contestGames, now,
}: {
  games: GameRow[];
  days: Record<string, GameDay[]>;
  weeks: Record<string, GameWeek>;
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

  return (
    <div className="gmr gmr-cq">
      <PageHeader
        title="ألعاب أدِيب"
        action={contestGames.length ? { label: "مسابقة جديدة", icon: <Plus size={18} />, onClick: () => setTarget({ pick: true }) } : undefined}
      />
      <div className="gmr-room">
        <div className="gmr-room-main">
          <WeekPulse games={games} days={days} weeks={weeks} />
          <ContestsPanel
            contests={contests}
            leaders={leaders}
            serverNow={now}
            hrefFor={(c) => `/dashboard/games/${c.gameSlug}?tab=contests`}
          />
        </div>
        <SectionCard title="الصالة الآن">
          <HallLineup games={games} busy={busy} onToggle={toggle} onMove={move} />
        </SectionCard>
      </div>
      {target ? <ContestEditor key={JSON.stringify(target)} target={target} games={contestGames} onClose={() => setTarget(null)} /> : null}
    </div>
  );
}
