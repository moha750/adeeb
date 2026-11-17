import "server-only";
import { gamesService } from "@/lib/games/authz";
import { clubDayKey, daysBetweenKeys } from "@/lib/dates";
import { GAME_TONES, PERIOD, type BankStats, type BoardRow, type DarbLeaders, type GameDay, type GamePeriod, type ContestRow, type GameMetric, type GameRow, type GameTone, type MetricUnit, type OsoolPlayer, type OsoolStats } from "./vocab";

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
 * **أيّامُ الألعاب** — ضعفُ النافذة (`PERIOD`) لكلّ لعبةٍ بتوقيت الرياض (`game_days`): الجولاتُ في النافذة والتي
 * قبلها للمقارنة، ورسمُ النافذة. واللاعبون والزوّارُ الفريدون في المدّتين من `game_periods`: جمعُ الأيّام يعدّ العائدَ مرّات. ولعبةٌ بلا فرعٍ في الدالّة لا أيّامَ لها، فتقول الغرفةُ «لا أرقام لها بعد».
 */
export async function getDays(): Promise<{ days: Record<string, GameDay[]>; periods: Record<string, GamePeriod>; error: string | null }> {
  const sb = gamesService();
  if (!sb) return { days: {}, periods: {}, error: NO_KEY };
  const [d, w] = await Promise.all([sb.rpc("game_days", { p_days: PERIOD * 2 }), sb.rpc("game_periods", { p_days: PERIOD })]);
  const error = d.error ?? w.error;
  if (error) return { days: {}, periods: {}, error: error.message };
  const days: Record<string, GameDay[]> = {};
  for (const r of (d.data ?? []) as (GameDay & { game_slug: string })[]) {
    (days[r.game_slug] ??= []).push({
      day: r.day, runs: r.runs, players: r.players, visitors: r.visitors, score: r.score, hits: r.hits, answered: r.answered,
    });
  }
  const periods: Record<string, GamePeriod> = {};
  for (const r of (w.data ?? []) as { game_slug: string; wk: number; players: number; visitors: number }[]) {
    const x = (periods[r.game_slug] ??= { players: [0, 0], visitors: [0, 0] });
    x.players[r.wk === 0 ? 0 : 1] = r.players;
    x.visitors[r.wk === 0 ? 0 : 1] = r.visitors;
  }
  return { days, periods, error: null };
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

/**
 * **«مدارس الأصول» من سجلّها** (`osool_plays`): أيّامُها وفرائدُ نافذتها بشكل `game_days`/`game_periods` نفسِه
 * (فتجري في `GameOverview` كأختيها)، وما منذ الإطلاق، وقائمةُ من لعب. يُحسب هنا من الجدول لا بدالّةٍ في القاعدة:
 * الصفوفُ قليلةٌ ما دامت اللعبةُ شابّة، وإن كثرت نُقل الحسابُ إلى دالّة.
 * - الأيّام: `runs` الجولات، و`players` من بدأ جولة، و`visitors` من فتح اللعبة (كلاهما بمعرّف جهازه)،
 *   و`hits` من نال شهادته (فاز)، و`answered` من أنهى جولته.
 * - القائمة: آخرُ ٣٠٠ جولة، باسم الشهادة واسم الحساب إن كان داخلًا.
 */
export async function getOsool(): Promise<{
  days: GameDay[]; period: GamePeriod; stats: OsoolStats; players: OsoolPlayer[]; error: string | null;
}> {
  type Row = {
    id: string; kind: "open" | "round"; at: string; player: string; user_id: string | null; majlis: "m" | "f" | null;
    name: string | null; outcome: "won" | "lost" | "playing" | null; faults: Record<string, number> | null;
    grades: number[] | null; cert_saved: boolean; cert_shared: boolean;
  };
  const span = 2 * PERIOD;
  const today = clubDayKey(new Date().toISOString());
  const start = new Date(Date.parse(`${today}T12:00:00Z`) - (span - 1) * 86400000).toISOString().slice(0, 10);
  const days: GameDay[] = Array.from({ length: span }, (_, i) => ({
    day: new Date(Date.parse(`${start}T12:00:00Z`) + i * 86400000).toISOString().slice(0, 10),
    runs: 0, players: 0, visitors: 0, score: null, hits: 0, answered: 0,
  }));
  const empty = {
    days, period: { players: [0, 0], visitors: [0, 0] } as GamePeriod, players: [],
    stats: {
      visitors: 0, rounds: 0, players: 0, accounts: 0, outcomes: {}, majlis: {},
      certs: { issued: 0, saved: 0, shared: 0 }, faults: { order: 0, full: 0, shake: 0, more: 0, late: 0 },
    } as OsoolStats,
  };
  const sb = gamesService();
  if (!sb) return { ...empty, error: NO_KEY };
  const { data, error } = await sb
    .from("osool_plays")
    .select("id, kind, at, player, user_id, majlis, name, outcome, faults, grades, cert_saved, cert_shared")
    .order("at", { ascending: false })
    .limit(20000);
  if (error) return { ...empty, error: error.message };
  const rows = (data ?? []) as Row[];

  const dayP = days.map(() => new Set<string>());
  const dayV = days.map(() => new Set<string>());
  const perP: [Set<string>, Set<string>] = [new Set(), new Set()];
  const perV: [Set<string>, Set<string>] = [new Set(), new Set()];
  const st = empty.stats;
  const allP = new Set<string>(), allV = new Set<string>(), accounts = new Set<string>();
  for (const r of rows) {
    const i = daysBetweenKeys(start, clubDayKey(r.at));
    const inWin = i >= 0 && i < span;
    const wk = i >= PERIOD ? 0 : 1;
    if (r.kind === "open") {
      allV.add(r.player);
      if (inWin) { dayV[i].add(r.player); perV[wk].add(r.player); }
      continue;
    }
    st.rounds++;
    allP.add(r.player);
    if (r.user_id) accounts.add(r.user_id);
    const out = r.outcome ?? "playing";
    st.outcomes[out] = (st.outcomes[out] ?? 0) + 1;
    if (r.majlis) st.majlis[r.majlis] = (st.majlis[r.majlis] ?? 0) + 1;
    if (out === "won") st.certs.issued++;
    if (r.cert_saved) st.certs.saved++;
    if (r.cert_shared) st.certs.shared++;
    for (const k of ["order", "full", "shake", "more", "late"] as const) st.faults[k] += Number(r.faults?.[k] ?? 0);
    if (inWin) {
      const d = days[i];
      d.runs++;
      dayP[i].add(r.player);
      perP[wk].add(r.player);
      if (out === "won") d.hits = (d.hits ?? 0) + 1;
      if (out === "won" || out === "lost") d.answered = (d.answered ?? 0) + 1;
    }
  }
  days.forEach((d, i) => { d.players = dayP[i].size; d.visitors = dayV[i].size; });
  st.players = allP.size;
  st.visitors = allV.size;
  st.accounts = accounts.size;

  // القائمة: جولاتٌ لها اسم، الأحدثُ أوّلًا، واسمُ الحساب من `profiles` لمن كان داخلًا
  const named = rows.filter((r) => r.kind === "round" && r.name).slice(0, 300);
  const ids = [...new Set(named.map((r) => r.user_id).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: pr } = await sb.from("profiles").select("id, full_name").in("id", ids);
    for (const x of (pr ?? []) as { id: string; full_name: string | null }[]) if (x.full_name) names.set(x.id, x.full_name);
  }
  const players: OsoolPlayer[] = named.map((r) => ({
    id: r.id,
    at: r.at,
    name: r.name as string,
    account: r.user_id ? (names.get(r.user_id) ?? null) : null,
    majlis: r.majlis,
    outcome: r.outcome ?? "playing",
    grades: r.grades,
    saved: r.cert_saved,
    shared: r.cert_shared,
  }));

  return {
    days,
    period: { players: [perP[0].size, perP[1].size], visitors: [perV[0].size, perV[1].size] },
    stats: st,
    players,
    error: null,
  };
}
