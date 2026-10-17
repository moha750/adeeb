"use client";

import { Cabinet, type HubGame } from "@/app/games/_components/Hub";
import { HALL_LOOK } from "@/lib/games/look";
import type { GameRow } from "./vocab";

/** صفُّ اللعبة بشكل الصالة: المكوّنُ نفسُه يقرأ الشكلين. */
export function toHubGame(g: Pick<GameRow, "slug" | "name" | "line" | "tone" | "playPath" | "boardPath" | "attractVideo" | "attractPoster">): HubGame {
  return {
    slug: g.slug,
    name: g.name,
    line: g.line,
    tone: g.tone,
    play: g.playPath,
    board: g.boardPath,
    attract: g.attractVideo && g.attractPoster ? { video: g.attractVideo, poster: g.attractPoster } : undefined,
  };
}

/**
 * **الكابينةُ كما ستقع في الصالة** — المكوّنُ الحقيقيُّ (`Cabinet`) بمظهر الصالة نفسِه، يتبع النموذجَ
 * حرفًا حرفًا. وهي `inert`: أزرارُها روابطُ حقيقيّة، ونقرةٌ عليها ساعةَ التحرير تُضيّع ما كُتب.
 */
export function CabinetPreview({ game }: { game: Parameters<typeof toHubGame>[0] }) {
  return (
    <div className="agm agm-preview" {...HALL_LOOK} inert>
      <div className="agm-hub">
        <ul className="agm-grid">
          <Cabinet g={toHubGame(game)} />
        </ul>
      </div>
    </div>
  );
}
