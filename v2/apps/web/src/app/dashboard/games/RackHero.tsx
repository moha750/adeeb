"use client";

import { Badge, Card } from "@adeeb/design-system";
import { ArrowUpRight } from "@/app/_components/glyphs";
import { GameScreen } from "./GameScreen";
import { TONE_LABEL, type GameRow } from "./vocab";
import type { GameFacts } from "./data";
import { Facts } from "./Facts";

/**
 * **أ. صدرُ صفحة اللعبة** — شاشتُها كبيرةً بجانب اسمها، ثمّ أرقامُها الثلاثة التي يُعرف بها حالُها،
 * ثمّ بابا اللعبة نفسِها: تُفتح في نافذةٍ جديدة فلا تُغادَر اللوحة.
 */
export function RackHero({ game, facts }: { game: GameRow; facts: GameFacts }) {
  return (
    <div className="gmr-cq" data-tone={game.tone}>
      <Card className="gmr-hero">
        <GameScreen game={game} />
        <div className="gmr-hero-head">
          <h1 className="gmr-name">{game.name}</h1>
          <p className="gmr-line">{game.line}</p>
          <div className="flex flex-wrap gap-2">
            {game.inHall ? <Badge tone="success" dot>في الصالة</Badge> : <Badge tone="neutral" variant="outline">خارج الصالة</Badge>}
            <Badge tone="neutral" variant="outline">{TONE_LABEL[game.tone]}</Badge>
          </div>
        </div>
        <div className="gmr-hero-body">
          <Facts facts={facts} />
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
