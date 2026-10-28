"use client";

import { Card, Switch } from "@adeeb/design-system";
import { ArrowUpRight } from "@/app/_components/glyphs";
import { GameScreen } from "./GameScreen";
import type { GameRow } from "./vocab";

/**
 * **صدرُ صفحة اللعبة** — شاشتُها وسطرُها كما في الصالة، ومفتاحُ ظهورها فيها فعلًا فوريًّا، وبابا اللعبة
 * نفسِها (نافذةٌ جديدة فلا تُغادَر اللوحة). والاسمُ في رأس الصفحة وحدَه: كان يُكتب مرّتين.
 */
export function GameHead({
  game, busy, onToggleHall,
}: {
  game: GameRow;
  busy?: boolean;
  onToggleHall: (inHall: boolean) => void;
}) {
  return (
    <div className="gmr-cq" data-tone={game.tone}>
      <Card className="gmr-head">
        <GameScreen game={game} />
        <div className="gmr-head-body">
          <p className="gmr-head-line">{game.line}</p>
          <Switch row label="تظهر في الصالة" checked={game.inHall} disabled={busy} onChange={(e) => onToggleHall(e.target.checked)} />
          <div className="btn-row">
            <a className="abtn abtn-primary abtn-md" href={game.playPath} target="_blank" rel="noopener">
              <ArrowUpRight size={18} />افتح اللعبة
            </a>
            {game.boardPath ? (
              <a className="abtn abtn-ghost abtn-md" href={game.boardPath} target="_blank" rel="noopener">
                <ArrowUpRight size={18} />صفحة الصدارة
              </a>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
