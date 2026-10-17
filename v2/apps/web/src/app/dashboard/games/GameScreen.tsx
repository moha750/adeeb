"use client";

import { AttractVideo } from "@/app/games/_components/AttractVideo";
import type { GameRow } from "./vocab";

/**
 * **شاشةُ اللعبة في اللوحة** — مقطعُ كابينتها يدور كما في الصالة (ويقف خارج النظر ولمن طلب تقليلَ
 * الحركة، `AttractVideo`)، وبلا مقطعٍ «بلا إشارة». هي ما تُعرَف به اللعبةُ في الغرفة قبل اسمها.
 */
export function GameScreen({ game, width }: { game: Pick<GameRow, "attractVideo" | "attractPoster">; width?: number }) {
  const style = width ? ({ "--gmr-sw": `${width}px` } as React.CSSProperties) : undefined;
  if (game.attractVideo && game.attractPoster) {
    return (
      <span className="gmr-screen" style={style}>
        <AttractVideo src={game.attractVideo} poster={game.attractPoster} />
      </span>
    );
  }
  return (
    <span className="gmr-screen gmr-screen-off" style={style} aria-hidden>
      بلا إشارة
    </span>
  );
}
