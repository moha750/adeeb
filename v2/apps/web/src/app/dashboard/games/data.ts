// يُستورَد من مكوّنات خادميّة وحدها (page.tsx).
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/dates";
import type { RoomStatus } from "./vocab";

/** غرفةٌ كما تُقرأ في قائمة الغرف. */
export type RoomRow = {
  id: string;
  code: string;
  title: string;
  status: RoomStatus;
  secondsPerWord: number;
  wordCount: number;
  playedCount: number;
  playerCount: number;
  createdAt: string;
  createdAtLabel: string;
};

export type RoomsData = { rows: RoomRow[]; error: string | null };

/**
 * الغرفُ كلُّها بعدّاداتها.
 *
 * والعدُّ في التطبيق لا في القاعدة — عن قصد: غرفُ نادٍ عشراتٌ، ولاعبوها مئاتٌ في
 * أسوأ الحالات، فجلبُ عمودَين وعدُّهما أرخصُ من دالّةٍ مخزَّنةٍ تُصان. (سابقةُ
 * `getQrStats` بحدّها المكتوب.)
 */
export async function getRooms(): Promise<RoomsData> {
  const sb = await createClient();

  const [sRes, wRes, pRes] = await Promise.all([
    sb
      .from("guess_word_sessions")
      .select("id, code, title, status, time_per_word, created_at")
      .order("created_at", { ascending: false }),
    sb.from("guess_word_words").select("session_id, ended_at"),
    sb.from("guess_word_players").select("session_id, is_kicked"),
  ]);

  const firstErr = sRes.error || wRes.error || pRes.error;
  if (firstErr) return { rows: [], error: firstErr.message };

  const words = new Map<string, { total: number; played: number }>();
  for (const w of (wRes.data ?? []) as { session_id: string; ended_at: string | null }[]) {
    const cur = words.get(w.session_id) ?? { total: 0, played: 0 };
    cur.total += 1;
    if (w.ended_at) cur.played += 1;
    words.set(w.session_id, cur);
  }

  // المُخرَجون لا يُعَدّون لاعبين: العدّادُ يقول «كم في الغرفة الآن».
  const players = new Map<string, number>();
  for (const p of (pRes.data ?? []) as { session_id: string; is_kicked: boolean }[]) {
    if (!p.is_kicked) players.set(p.session_id, (players.get(p.session_id) ?? 0) + 1);
  }

  type Raw = {
    id: string;
    code: string;
    title: string;
    status: RoomStatus;
    time_per_word: number;
    created_at: string;
  };

  const rows = ((sRes.data ?? []) as Raw[]).map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    status: r.status,
    secondsPerWord: r.time_per_word,
    wordCount: words.get(r.id)?.total ?? 0,
    playedCount: words.get(r.id)?.played ?? 0,
    playerCount: players.get(r.id) ?? 0,
    createdAt: r.created_at,
    createdAtLabel: fmtDate(r.created_at),
  }));

  return { rows, error: null };
}

/* ────────────────────── مِقوَدُ المضيف وشاشةُ العرض ────────────────────── */

export type HostWord = {
  id: string;
  word: string;
  /**
   * معنى الكلمة كما في البنك — **للمضيف وحدَه**، مرجعُه حين يجيء الجوابُ بالمعنى لا
   * بالحرف. يُضمّ في `gw_get_admin_session_data` ولا يُنسَخ في `guess_word_words`:
   * ذاك الجدولُ يُبَثّ إلى جوّالات اللاعبين، فعمودُ معنًى فيه تسليمٌ للجواب.
   * و`null` لكلمةٍ خاصّةٍ بالغرفة (كتبها المضيفُ فهو يعرفها).
   */
  hint: string | null;
  position: number;
  startedAt: string | null;
  endedAt: string | null;
  pausedAt: string | null;
  pausedMs: number;
  winnerPlayerId: string | null;
  sourceWordId: string | null;
};

export type HostPlayer = {
  id: string;
  name: string;
  score: number;
  isKicked: boolean;
  joinedAt: string;
};

export type HostAnswer = {
  id: string;
  playerId: string;
  playerName: string;
  answer: string;
  responseMs: number;
  submittedAt: string;
};

export type HostSnapshot = {
  room: {
    id: string;
    code: string;
    title: string;
    status: RoomStatus;
    secondsPerWord: number;
    currentWordId: string | null;
  };
  words: HostWord[];
  players: HostPlayer[];
  /** إجاباتُ الجولة الجارية وحدها، مرتَّبةً بالأسرع. */
  answers: HostAnswer[];
  /**
   * ساعةُ الخادم لحظةَ القراءة. يُعايَر بها العدُّ التنازليّ **مرّةً** ثمّ يُطبَّق
   * الفارق: ساعةُ الجهاز قد تفارق ساعةَ العالم بدقائق (درسُ محاكي الانتخابات).
   */
  serverNow: string;
};

type RpcShape = {
  session: {
    id: string;
    code: string;
    title: string;
    status: RoomStatus;
    time_per_word: number;
    current_word_id: string | null;
  };
  words: {
    id: string;
    word: string;
    hint: string | null;
    position: number;
    started_at: string | null;
    ended_at: string | null;
    paused_at: string | null;
    paused_ms: number | null;
    winner_player_id: string | null;
    source_word_id: string | null;
  }[];
  players: { id: string; name: string; score: number; is_kicked: boolean; joined_at: string }[];
  answers: {
    id: string;
    player_id: string;
    player_name: string;
    answer: string;
    response_ms: number;
    submitted_at: string;
  }[];
  server_now: string;
};

/** يُصاغ مرّةً ويُقرأ من موضعين: القراءةُ الأولى في الخادم، والتحديثُ من الفعل. */
export function shapeHostSnapshot(raw: RpcShape): HostSnapshot {
  return {
    room: {
      id: raw.session.id,
      code: raw.session.code,
      title: raw.session.title,
      status: raw.session.status,
      secondsPerWord: raw.session.time_per_word,
      currentWordId: raw.session.current_word_id,
    },
    words: raw.words.map((w) => ({
      id: w.id,
      word: w.word,
      hint: w.hint ?? null,
      position: w.position,
      startedAt: w.started_at,
      endedAt: w.ended_at,
      pausedAt: w.paused_at,
      pausedMs: w.paused_ms ?? 0,
      winnerPlayerId: w.winner_player_id,
      sourceWordId: w.source_word_id,
    })),
    players: raw.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isKicked: p.is_kicked,
      joinedAt: p.joined_at,
    })),
    answers: raw.answers.map((a) => ({
      id: a.id,
      playerId: a.player_id,
      playerName: a.player_name,
      answer: a.answer,
      responseMs: a.response_ms,
      submittedAt: a.submitted_at,
    })),
    serverNow: raw.server_now,
  };
}

/**
 * لقطةُ الغرفة كاملةً في نداءٍ واحد.
 *
 * **بعميل الجلسة**: الدالّةُ تقرأ `auth.uid()` بنفسها وتفحص القدرة، فالحارسُ في
 * القاعدة لا في سطرٍ هنا. وهي تنزع البصمةَ من صفوف اللاعبين قبل أن تُرسِلها.
 */
export async function getHostSnapshot(
  sessionId: string
): Promise<{ snapshot: HostSnapshot | null; error: string | null }> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("gw_get_admin_session_data", { p_session_id: sessionId });
  if (error) return { snapshot: null, error: error.message };
  if (!data) return { snapshot: null, error: null };
  return { snapshot: shapeHostSnapshot(data as unknown as RpcShape), error: null };
}
