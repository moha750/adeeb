"use client";

import { Badge, Card } from "@adeeb/design-system";
import { GameScreen } from "./GameScreen";
import { PHASE_META, type ContestPhase, type GameRow } from "./vocab";
import type { GameFacts } from "./data";
import { Facts } from "./Facts";

/**
 * **أ. الرفّ** — كلُّ لعبةٍ صفٌّ: شاشتُها الحيّةُ في جانب، واسمُها بخطّ الصالة وسطرُها وأرقامُها في
 * الآخر. والصفوفُ تتدفّق عمودًا في الجوّال وعمودين في الحاسوب، فلا فراغَ في صفّ (القاعدة ٦).
 */
export function RackRoom({
  games, facts, phase, onOpen,
}: {
  games: GameRow[];
  facts: Record<string, GameFacts>;
  phase: Record<string, ContestPhase>;
  onOpen: (slug: string) => void;
}) {
  return (
    <div className="gmr-rack">
      {games.map((g) => {
        const p = phase[g.slug];
        return (
          <Card key={g.slug} interactive onClick={() => onOpen(g.slug)} data-tone={g.tone}>
            <div className="gmr-row">
              <GameScreen game={g} />
              <div className="gmr-row-body">
                <h2 className="gmr-name">{g.name}</h2>
                <p className="gmr-line">{g.line}</p>
                <Facts facts={facts[g.slug] ?? []} />
                <span className="gmr-chips">
                  {g.inHall ? <Badge tone="success" dot>في الصالة</Badge> : <Badge tone="neutral" variant="outline">خارج الصالة</Badge>}
                  {p && p !== "over" ? (
                    <Badge tone={PHASE_META[p].tone} dot live={p === "live"}>{p === "live" ? "مسابقةٌ جارية" : "مسابقةٌ قادمة"}</Badge>
                  ) : null}
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
