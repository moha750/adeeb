import "server-only";
import { gamesService } from "@/lib/games/authz";
import { getDarbStats, type DarbStats } from "./darbStats";
import type { BankStats } from "./BankStatsView";
import { GAME_TONES, type BoardRow, type ContestRow, type GameMetric, type GameRow, type GameTone, type MetricUnit } from "./vocab";

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
 * **من له إحصائيّات** — الأرقامُ دالّةٌ في القاعدة تكتبها كلُّ لعبةٍ لنفسها (`darb_stats` و`bank_stats`)،
 * فلعبةٌ جديدةٌ بلا دالّةٍ لا تبويبَ إحصائيّاتٍ لها حتى تُكتب دالّتُها ويُضاف سطرُها هنا.
 */
export type GameStats = { kind: "darb"; data: DarbStats } | { kind: "bank"; data: BankStats };
export const HAS_STATS = new Set(["darbak-khadar", "bank-adeeb"]);

export async function getGameStats(slug: string): Promise<{ stats: GameStats | null; error: string | null }> {
  if (slug === "darbak-khadar") {
    const { data, error } = await getDarbStats();
    return { stats: data ? { kind: "darb", data } : null, error };
  }
  if (slug === "bank-adeeb") {
    const { data, error } = await getBankStats();
    return { stats: data ? { kind: "bank", data } : null, error };
  }
  return { stats: null, error: null };
}

/**
 * **رقمٌ يُعرف به حالُ اللعبة** — العددُ كبيرًا ثمّ تمييزُه (اسمُ المعدود بصيغته: «209 لاعبًا»، «3 لاعبين»،
 * «1 لاعب»)، وللنسبة لاحقتُها. يقرؤه صفُّ اللعبة في الغرفة وصدرُ صفحتها.
 */
export type Noun = { one: string; few: string; many: string };
export type GameFact = { value: number; noun: Noun; suffix?: string };
export type GameFacts = GameFact[];

const PLAYER: Noun = { one: "لاعب", few: "لاعبين", many: "لاعبًا" };
const RUN: Noun = { one: "جولة", few: "جولات", many: "جولةً" };
const NAME: Noun = { one: "اسم", few: "أسماء", many: "اسمًا" };
const DATE: Noun = { one: "تمرة", few: "تمرات", many: "تمرةً" };
const HIT: Noun = { one: "أصابوا الجواب", few: "أصابوا الجواب", many: "أصابوا الجواب" };

/** أرقامُ الصفّ في الغرفة: اثنان. */
export function roomFacts(stats: GameStats | null): GameFacts {
  if (!stats) return [];
  if (stats.kind === "darb") return [{ value: stats.data.players, noun: PLAYER }, { value: stats.data.runs, noun: RUN }];
  return [{ value: stats.data.players, noun: NAME }, { value: stats.data.plays, noun: RUN }];
}

/** أرقامُ صدر صفحة اللعبة: ثلاثة، والتفصيلُ في تبويب الإحصائيّات. */
export function heroFacts(stats: GameStats | null): GameFacts {
  if (!stats) return [];
  if (stats.kind === "darb") return [...roomFacts(stats), { value: stats.data.tamr, noun: DATE }];
  const r = stats.data.results;
  const answered = (r.correct ?? 0) + (r.wrong ?? 0) + (r.timeout ?? 0);
  const hit = answered ? Math.round(((r.correct ?? 0) / answered) * 100) : 0;
  return [...roomFacts(stats), { value: hit, noun: HIT, suffix: "%" }];
}

export async function getRoomFacts(): Promise<Record<string, GameFacts>> {
  const [darb, bank] = await Promise.all([getDarbStats(), getBankStats()]);
  const out: Record<string, GameFacts> = {};
  if (darb.data) out["darbak-khadar"] = roomFacts({ kind: "darb", data: darb.data });
  if (bank.data) out["bank-adeeb"] = roomFacts({ kind: "bank", data: bank.data });
  return out;
}
