import "server-only";
import { gamesService } from "@/lib/games/authz";
import { GAME_TONES, type BankStats, type BoardRow, type DarbLeaders, type GameDay, type GameWeek, type ContestRow, type GameMetric, type GameRow, type GameTone, type MetricUnit } from "./vocab";

/**
 * **قراءاتُ غرفة الألعاب** — بمفتاح الخدمة بعد حارس الصفحة (`denyUnless`)، كسائر الغرف.
 * والجدولان مقروءان للجميع أصلًا، لكنّ الإحصائيّات دوالُّ للخادم وحده، فالمفتاحُ واحدٌ للكلّ.
 */

type GameDb = {
  slug: string; name: string; line: string; tone: string; play_path: string; board_path: string | null;
  attract_video: string | null; attract_poster: string | null; in_hall: boolean; sort_order: number;
};
const GAME_COLS = "slug, name, line, tone, play_path, board_path, attract_video, attract_poster, in_hall, sort_order";

const toneOf = (t: string): GameTone => ((GAME_TONES as readonly string[]).includes(t) ? (t as GameTone) : "darb");

export const gameFromDb = (r: GameDb): GameRow => ({
  slug: r.slug,
  name: r.name,
  line: r.line,
  tone: toneOf(r.tone),
  playPath: r.play_path,
  boardPath: r.board_path,
  attractVideo: r.attract_video,
  attractPoster: r.attract_poster,
  inHall: r.in_hall,
  sortOrder: r.sort_order,
});

const NO_KEY = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

export async function getGames(): Promise<{ games: GameRow[]; error: string | null }> {
  const sb = gamesService();
  if (!sb) return { games: [], error: NO_KEY };
  const { data, error } = await sb.from("games").select(GAME_COLS).order("sort_order").order("name");
  if (error) return { games: [], error: error.message };
  return { games: (data as GameDb[]).map(gameFromDb), error: null };
}

/**
 * مسابقاتُ لعبةٍ أو كلُّ المسابقات، الأحدثُ أوّلًا. و`now` لحظةُ القراءة: الطورُ (جارية، قادمة، انتهت)
 * يُحسب بها فيتّفق الخادمُ والمتصفّحُ على ما قرأه الخادم.
 */
/** مقاييسُ لعبةٍ (أو كلِّ الألعاب) بترتيبها. */
export async function getMetrics(slug?: string): Promise<Record<string, GameMetric[]>> {
  const sb = gamesService();
  if (!sb) return {};
  let q = sb.from("game_metrics").select("game_slug, metric, label, unit").order("sort_order");
  if (slug) q = q.eq("game_slug", slug);
  const { data } = await q;
  const out: Record<string, GameMetric[]> = {};
  for (const r of (data ?? []) as { game_slug: string; metric: string; label: string; unit: MetricUnit }[]) {
    (out[r.game_slug] ??= []).push({ metric: r.metric, label: r.label, unit: r.unit });
  }
  return out;
}

export async function getContests(slug?: string): Promise<{ contests: ContestRow[]; now: number; error: string | null }> {
  const now = Date.now();
  const sb = gamesService();
  if (!sb) return { contests: [], now, error: NO_KEY };
  let q = sb
    .from("game_events")
    .select("id, game_slug, title, note, starts_at, ends_at, metric, games(name, tone)")
    .order("starts_at", { ascending: false });
  if (slug) q = q.eq("game_slug", slug);
  const [{ data, error }, metrics] = await Promise.all([q, getMetrics(slug)]);
  if (error) return { contests: [], now, error: error.message };
  type Row = {
    id: string; game_slug: string; title: string; note: string; starts_at: string; ends_at: string; metric: string | null;
    games: { name: string; tone: string } | { name: string; tone: string }[] | null;
  };
  return {
    contests: (data as Row[]).map((r) => {
      const g = Array.isArray(r.games) ? r.games[0] : r.games;
      return {
        id: r.id,
        gameSlug: r.game_slug,
        gameName: g?.name ?? r.game_slug,
        tone: toneOf(g?.tone ?? ""),
        title: r.title,
        note: r.note,
        startsAt: r.starts_at,
        endsAt: r.ends_at,
        metric: (metrics[r.game_slug] ?? []).find((m) => m.metric === r.metric) ?? null,
      };
    }),
    now,
    error: null,
  };
}

/**
 * **صدارةُ المسابقات** — من `game_contest_board` (جولاتُ النافذة وحدَها). الجاريةُ متصدّروها والمنتهيةُ
 * فائزوها، والقادمةُ لا صدارةَ لها بعد. ومسابقةُ oos بلا مقياسٍ فلا تُسأل.
 */
export async function getBoards(contests: ContestRow[], now: number, limit = 3): Promise<Record<string, BoardRow[]>> {
  const sb = gamesService();
  if (!sb) return {};
  const asked = contests.filter((c) => c.metric && Date.parse(c.startsAt) <= now);
  const res = await Promise.all(asked.map((c) => sb.rpc("game_contest_board", { p_event: c.id, p_limit: limit })));
  const out: Record<string, BoardRow[]> = {};
  asked.forEach((c, i) => {
    out[c.id] = ((res[i].data ?? []) as { rank: number; nickname: string; value: number }[]).map((r) => ({
      rank: Number(r.rank), nickname: r.nickname, value: r.value,
    }));
  });
  return out;
}

export async function getBankStats(): Promise<{ data: BankStats | null; error: string | null }> {
  const sb = gamesService();
  if (!sb) return { data: null, error: NO_KEY };
  const { data, error } = await sb.rpc("bank_stats");
  if (error) return { data: null, error: error.message };
  return { data: data as BankStats, error: null };
}

/**
 * **أيّامُ الألعاب** — ثلاثون يومًا لكلّ لعبةٍ بتوقيت الرياض (`game_days`)، منها الجولاتُ في «آخر سبعة أيام»
 * ورسمُ الشهر. واللاعبون والزوّارُ الفريدون في الأسبوعين من `game_weeks`: جمعُ الأيّام يعدّ العائدَ مرّات. ولعبةٌ بلا فرعٍ في الدالّة لا أيّامَ لها، فتقول الغرفةُ «لا أرقام لها بعد».
 */
export async function getDays(): Promise<{ days: Record<string, GameDay[]>; weeks: Record<string, GameWeek>; error: string | null }> {
  const sb = gamesService();
  if (!sb) return { days: {}, weeks: {}, error: NO_KEY };
  const [d, w] = await Promise.all([sb.rpc("game_days", { p_days: 30 }), sb.rpc("game_weeks")]);
  const error = d.error ?? w.error;
  if (error) return { days: {}, weeks: {}, error: error.message };
  const days: Record<string, GameDay[]> = {};
  for (const r of (d.data ?? []) as (GameDay & { game_slug: string })[]) {
    (days[r.game_slug] ??= []).push({
      day: r.day, runs: r.runs, players: r.players, visitors: r.visitors, score: r.score, hits: r.hits, answered: r.answered,
    });
  }
  const weeks: Record<string, GameWeek> = {};
  for (const r of (w.data ?? []) as { game_slug: string; wk: number; players: number; visitors: number }[]) {
    const x = (weeks[r.game_slug] ??= { players: [0, 0], visitors: [0, 0] });
    x.players[r.wk === 0 ? 0 : 1] = r.players;
    x.visitors[r.wk === 0 ? 0 : 1] = r.visitors;
  }
  return { days, weeks, error: null };
}

/** أوائلُ «دربك خضر» منذ إطلاقها، خمسةً خمسة: من `darb_board` نفسِها التي تقرؤها صفحةُ الصدارة والصالة. */
export async function getDarbLeaders(): Promise<DarbLeaders> {
  const sb = gamesService();
  if (!sb) return { tamr: [], dist: [] };
  const [t, d] = await Promise.all([
    sb.rpc("darb_board", { p_kind: "tamr", p_limit: 5 }),
    sb.rpc("darb_board", { p_kind: "dist", p_limit: 5 }),
  ]);
  const rows = (x: { data: unknown }) => ((x.data ?? []) as { nickname: string; value: number }[]).map((r) => ({ nickname: r.nickname, value: r.value }));
  return { tamr: rows(t), dist: rows(d) };
}
