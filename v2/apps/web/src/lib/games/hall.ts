import "server-only";
import type { HubEvent, HubGame } from "@/app/games/_components/Hub";
import type { ScoreUnit } from "@/app/games/_components/hall";
import { gamesService } from "./authz";

/**
 * **الصالةُ كما يراها الزائر** (`/games`) — ألعابُها من صفوف `games` التي في الصالة بترتيبها، وشريطُها
 * أقربُ مسابقةٍ لم تنتهِ من `game_events`، و«أعلى النقاط» من لوحة كلّ لعبةٍ في القاعدة.
 *
 * بمفتاح الخدمة لأنّ لوحاتِ الألعاب دوالُّ للخادم وحده (`darb_board`). والجدولان مقروءان للجميع أصلًا.
 */

/** لوحةُ «أعلى النقاط» لكلّ لعبةٍ لها لوحة: دالّتُها ونوعُها وعنوانُها. لعبةٌ جديدةٌ بلوحةٍ سطرٌ هنا. */
const TOP_BOARDS: Record<string, { title: string; unit: ScoreUnit; rpc: string; kind: string }> = {
  "darbak-khadar": { title: "أبعد مسافة", unit: "m", rpc: "darb_board", kind: "dist" },
};

type GameDb = {
  slug: string; name: string; line: string; tone: string; play_path: string; board_path: string | null;
  attract_video: string | null; attract_poster: string | null;
};

export type Hall = { games: HubGame[]; event: HubEvent | null; stats: { players: number; runs: number } | null };

export async function getHall(): Promise<Hall> {
  const sb = gamesService();
  if (!sb) return { games: [], event: null, stats: null };
  const nowIso = new Date().toISOString();

  const [gamesRes, eventRes, darb] = await Promise.all([
    sb
      .from("games")
      .select("slug, name, line, tone, play_path, board_path, attract_video, attract_poster")
      .eq("in_hall", true)
      .order("sort_order")
      .order("name"),
    // أقربُ مسابقةٍ لم تنتهِ: الجاريةُ قبل القادمة لأنّ بدايتَها أسبق.
    sb
      .from("game_events")
      .select("id, title, note, starts_at, ends_at, metric, games!inner(tone, play_path, board_path, in_hall)")
      .gt("ends_at", nowIso)
      .eq("games.in_hall", true)
      .order("starts_at")
      .limit(1),
    sb.rpc("darb_stats"),
  ]);

  const rows = (gamesRes.data ?? []) as GameDb[];
  const games: HubGame[] = await Promise.all(
    rows.map(async (r) => {
      const g: HubGame = {
        slug: r.slug,
        name: r.name,
        line: r.line,
        tone: r.tone,
        play: r.play_path,
        board: r.board_path,
        attract: r.attract_video && r.attract_poster ? { video: r.attract_video, poster: r.attract_poster } : undefined,
      };
      const top = TOP_BOARDS[r.slug];
      if (!top) return g;
      const { data } = await sb.rpc(top.rpc, { p_kind: top.kind, p_limit: 3 });
      const list = ((data ?? []) as { nickname: string; value: number }[]).map((x) => ({ name: x.nickname, value: x.value }));
      return { ...g, top: { title: top.title, unit: top.unit, rows: list } };
    }),
  );

  type Ev = {
    id: string; title: string; note: string; starts_at: string; ends_at: string; metric: string | null;
    games: { tone: string; play_path: string; board_path: string | null } | { tone: string; play_path: string; board_path: string | null }[];
  };
  const e = (eventRes.data?.[0] ?? null) as Ev | null;
  const eg = e ? (Array.isArray(e.games) ? e.games[0] : e.games) : null;
  const event: HubEvent | null =
    e && eg
      ? {
          title: e.title,
          note: e.note,
          tone: eg.tone,
          startsAt: Date.parse(e.starts_at),
          endsAt: Date.parse(e.ends_at),
          // المسابقةُ بمقياسها لها صفحتُها بصدارتها الحيّة، ومسابقةُ oos القديمةُ إلى صفحة لعبتها.
          href: e.metric ? `/games/contests/${e.id}` : (eg.board_path ?? eg.play_path),
        }
      : null;

  const d = darb.data as { players?: number; runs?: number } | null;
  const stats = d && typeof d.players === "number" && typeof d.runs === "number" ? { players: d.players, runs: d.runs } : null;

  return { games, event, stats };
}

/* ══ صفحةُ المسابقة (`/games/contests/<id>`) ══ */

export type ContestPage = {
  id: string;
  title: string;
  note: string;
  startsAt: number;
  endsAt: number;
  /** انتهت ساعةَ القراءة: صدارتُها «الفائزون». */
  over: boolean;
  game: { name: string; tone: string; play: string };
  metric: { label: string; unit: ScoreUnit };
  board: { rank: number; name: string; value: number }[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * **مسابقةٌ كما يراها اللاعب** — عنوانُها وجوائزُها وموعداها، وصدارتُها العشرةُ الأوائل من جولات نافذتها
 * وحدَها (`game_contest_board`). ولا صفحةَ لمسابقةٍ بلا مقياس (oos القديمة) ولا لمسابقة لعبةٍ خارج الصالة.
 */
export async function getContestPage(id: string): Promise<ContestPage | null> {
  if (!UUID.test(id)) return null;
  const sb = gamesService();
  if (!sb) return null;
  const { data: e } = await sb
    .from("game_events")
    .select("id, title, note, starts_at, ends_at, metric, game_slug, games!inner(name, tone, play_path, in_hall)")
    .eq("id", id)
    .maybeSingle();
  type G = { name: string; tone: string; play_path: string; in_hall: boolean };
  const row = e as null | { id: string; title: string; note: string; starts_at: string; ends_at: string; metric: string | null; game_slug: string; games: G | G[] };
  if (!row || !row.metric) return null;
  const g = Array.isArray(row.games) ? row.games[0] : row.games;
  if (!g?.in_hall) return null;
  const [{ data: m }, { data: b }] = await Promise.all([
    sb.from("game_metrics").select("label, unit").eq("game_slug", row.game_slug).eq("metric", row.metric).maybeSingle(),
    sb.rpc("game_contest_board", { p_event: row.id, p_limit: 10 }),
  ]);
  if (!m) return null;
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    startsAt: Date.parse(row.starts_at),
    endsAt: Date.parse(row.ends_at),
    over: Date.now() >= Date.parse(row.ends_at),
    game: { name: g.name, tone: g.tone, play: g.play_path },
    metric: { label: (m as { label: string }).label, unit: (m as { unit: ScoreUnit }).unit },
    board: ((b ?? []) as { rank: number; nickname: string; value: number }[]).map((r) => ({ rank: Number(r.rank), name: r.nickname, value: r.value })),
  };
}
