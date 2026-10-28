"use client";

import { IconButton, Switch } from "@adeeb/design-system";
import { ArrowDown, ArrowUp } from "@/app/_components/glyphs";
import { GameScreen } from "./GameScreen";
import type { GameRow } from "./vocab";

/**
 * **الصالةُ الآن** — الألعابُ بترتيبها في `/games` كما يراها الزائر: ما يظهر فيها أوّلًا بأرقام مواضعه،
 * ثمّ ما أُخفي باهتًا بلا رقم. ومفتاحُ الظهور وسهما الترتيب فعلٌ فوريٌّ لا نموذجَ ولا «حفظ»
 * (المالك ٢٠٢٦-١٠-١٧: «أكثرُ ما سأفعله متعب»).
 *
 * والسهمان يقفزان فوق المخفيّة: الترتيبُ ترتيبُ الصالة، والمخفيُّ لا موضعَ له فيها.
 */
export function HallLineup({
  games, busy, onToggle, onMove,
}: {
  /** بترتيبها (`sort_order`). */
  games: GameRow[];
  /** لعبةٌ يُحفَظ تغييرُها الآن: تُقفَل أدواتُها حتى يعود الخادم. */
  busy?: string | null;
  onToggle: (slug: string, inHall: boolean) => void;
  onMove: (slug: string, dir: -1 | 1) => void;
}) {
  const shown = games.filter((g) => g.inHall);
  const hidden = games.filter((g) => !g.inHall);
  const row = (g: GameRow, pos: number | null) => {
    const locked = busy === g.slug;
    return (
      <li key={g.slug} className="gmr-lu-row" data-tone={g.tone} data-off={pos == null || undefined}>
        <span className="gmr-lu-pos">{pos ?? ""}</span>
        <GameScreen game={g} width={40} />
        <span className="gmr-lu-name">{g.name}</span>
        {pos != null ? (
          <span className="gmr-lu-move">
            <IconButton size="sm" aria-label={`قدّم ${g.name}`} disabled={locked || pos === 1} onClick={() => onMove(g.slug, -1)}>
              <ArrowUp size={14} />
            </IconButton>
            <IconButton size="sm" aria-label={`أخّر ${g.name}`} disabled={locked || pos === shown.length} onClick={() => onMove(g.slug, 1)}>
              <ArrowDown size={14} />
            </IconButton>
          </span>
        ) : null}
        <Switch
          className="gmr-lu-sw"
          aria-label={`${g.name} في الصالة`}
          checked={g.inHall}
          disabled={locked}
          onChange={(e) => onToggle(g.slug, e.target.checked)}
        />
      </li>
    );
  };
  return (
    <div className="gmr-lu">
      <ol>{shown.map((g, i) => row(g, i + 1))}</ol>
      {shown.length === 0 ? <p className="gmr-lu-empty">الصالة فارغة.</p> : null}
      {hidden.length ? (
        <>
          <b className="gmr-lu-h">خارج الصالة</b>
          <ul>{hidden.map((g) => row(g, null))}</ul>
        </>
      ) : null}
    </div>
  );
}
