"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  hashPlayerToken,
  newPlayerToken,
  readPlayerToken,
  writePlayerToken,
} from "@/lib/games/player";
import { gameError, isRoomCode, validatePlayerName, cleanText, LIMITS } from "@/app/dashboard/games/vocab";

/**
 * أفعالُ اللاعب المجهول.
 *
 * **بمفتاح الخدمة، وكلُّ دوالِّه منزوعةٌ عن `anon`.** فلا سياسةَ إدراجٍ تُفتَح للمتصفّح،
 * ولا يُنادى `gw_join_session` إلّا من ههنا بعد أن يمرّ الطلبُ بالدرع. ولو بقيت الدالّةُ
 * لـ`anon` كما كانت لكان الدرعُ زينةً تُتخطّى بنداءٍ مباشرٍ بالمفتاح العلنيّ (درسُ التواصل).
 */

export type PlayResult = { ok: boolean; message: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * **ولا حدَّ معدّلٍ ببصمة الزائر هنا** — خلافًا لديبو، وعن قصد.
 *
 * قاعةٌ فيها خمسون شخصًا تخرج كلُّها من شبكة الجامعة **ببصمةٍ واحدة**
 * (`sha256(ip‖salt‖اليوم)`)، فحدٌّ بالبصمة يقفل الباب في وجه القاعة كلِّها بعد أوّل
 * الداخلين. وديبو يحدّ بها لأنّ كلّ سؤالٍ يكلّف نقدًا عند المزوّد؛ والانضمامُ صفٌّ
 * في جدول. فالدرعُ هو Turnstile وحدَه، وهو ما يحرس به المستودعُ الاستبيانَ والتواصل.
 */

/** الانضمامُ باسم. يُنادى مرّةً في أوّل دخول، ويُنادى ثانيةً لتبديل الاسم. */
export async function joinRoom(
  code: string,
  name: string,
  turnstileToken?: string
): Promise<PlayResult> {
  if (!isRoomCode(code)) return { ok: false, message: "رمزُ الغرفة غيرُ صالح." };

  const invalid = validatePlayerName(name);
  if (invalid) return { ok: false, message: invalid };

  // الدرعُ أوّلًا: قبل أيّ استعلامٍ أو كتابة.
  const shieldError = await verifyTurnstile(turnstileToken);
  if (shieldError) return { ok: false, message: shieldError };

  const sb = service();
  if (!sb) return { ok: false, message: "إعدادُ الخادم ناقص. أبلِغ الإدارة." };

  // الرمزُ الخامُّ يبقى عند اللاعب في كوكيز `httpOnly`، والقاعدةُ لا ترى إلّا بصمتَه.
  const existing = await readPlayerToken(code);
  const token = existing ?? newPlayerToken();

  const { error } = await sb.rpc("gw_join_session", {
    p_code: code.toUpperCase(),
    p_name: cleanText(name),
    p_token_hash: hashPlayerToken(token),
  });
  if (error) return { ok: false, message: gameError(error.message) };

  // الكوكيزُ تُكتَب **بعد** القبول لا قبله: كوكيزٌ تسبق القبولَ تَعِد بما لم يقع.
  if (!existing) await writePlayerToken(code, token);

  return { ok: true, message: "أهلًا بك." };
}

/** إرسالُ الإجابة. الزمنُ يُقاس في القاعدة من `started_at` لا من ساعة الجهاز. */
export async function submitAnswer(code: string, answer: string): Promise<PlayResult> {
  if (!isRoomCode(code)) return { ok: false, message: "رمزُ الغرفة غيرُ صالح." };

  const text = cleanText(answer);
  if (!text || text.length > LIMITS.answerMax) {
    return { ok: false, message: "الإجابةُ مطلوبةٌ ولا تتجاوز خمس مئة حرف." };
  }

  const token = await readPlayerToken(code);
  if (!token) return { ok: false, message: "لم تنضمّ إلى هذه الغرفة بعد." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعدادُ الخادم ناقص. أبلِغ الإدارة." };

  const room = await roomIdOf(code);
  if (!room) return { ok: false, message: "لا غرفةَ بهذا الرمز." };

  const { error } = await sb.rpc("gw_submit_answer", {
    p_session_id: room,
    p_token_hash: hashPlayerToken(token),
    p_answer: text,
  });
  if (error) return { ok: false, message: gameError(error.message) };

  return { ok: true, message: "وصلت إجابتُك." };
}

/* ────────────────────────── القراءة ────────────────────────── */

export type PlayerState = {
  sessionStatus: "waiting" | "active" | "finished";
  secondsPerWord: number;
  serverNow: string;
  wordId: string | null;
  word: string | null;
  startedAt: string | null;
  endedAt: string | null;
  pausedAt: string | null;
  pausedMs: number;
  winnerName: string | null;
  playerName: string;
  playerScore: number;
  kicked: boolean;
  alreadyAnswered: boolean;
};

/** معرّفُ الغرفة من رمزها. يُقرأ مرّةً في الفعل ولا يُؤتمن العميلُ عليه. */
async function roomIdOf(code: string): Promise<string | null> {
  const sb = service();
  if (!sb) return null;
  const { data } = await sb
    .from("guess_word_sessions")
    .select("id")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * حالُ اللاعب. تُقرأ في الخادم عند أوّل رسم، ثمّ تُنادى من الشاشة عند كلّ نبضة.
 *
 * ولا تُخرج إجاباتِ الآخرين ولا الكلمةَ التالية: هي بابُ اللاعب الوحيد إلى الغرفة،
 * وكلُّ ما يعبره يصير مقروءًا في أدوات المتصفّح.
 */
export async function getPlayerState(code: string): Promise<PlayerState | null> {
  if (!isRoomCode(code)) return null;

  const token = await readPlayerToken(code);
  if (!token) return null;

  const sb = service();
  if (!sb) return null;

  const room = await roomIdOf(code);
  if (!room) return null;

  const { data, error } = await sb.rpc("gw_get_player_state", {
    p_session_id: room,
    p_token_hash: hashPlayerToken(token),
  });
  if (error || !data) return null;

  const d = data as Record<string, unknown>;
  return {
    sessionStatus: d.session_status as PlayerState["sessionStatus"],
    secondsPerWord: Number(d.time_per_word ?? 60),
    serverNow: String(d.server_now ?? ""),
    wordId: (d.word_id as string | null) ?? null,
    word: (d.word as string | null) ?? null,
    startedAt: (d.word_started_at as string | null) ?? null,
    endedAt: (d.word_ended_at as string | null) ?? null,
    pausedAt: (d.word_paused_at as string | null) ?? null,
    pausedMs: Number(d.word_paused_ms ?? 0),
    winnerName: (d.winner_name as string | null) ?? null,
    playerName: String(d.player_name ?? ""),
    playerScore: Number(d.player_score ?? 0),
    kicked: Boolean(d.player_kicked),
    alreadyAnswered: Boolean(d.already_answered),
  };
}
