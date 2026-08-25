"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getGamesManager } from "@/lib/games/authz";
import { getHostSnapshot, type HostSnapshot } from "./data";
import {
  cleanText,
  gameError,
  splitCustomWords,
  validateRoom,
  type CreateRoomInput,
} from "./vocab";

/**
 * ⚠️ **ملفُّ `"use server"` لا يُصدِّر إلّا دوالَّ لاتزامنيّة.** كان `validateRoom`
 * هنا متزامنًا فأسقط البناءَ — ولم يُقَل ذلك صراحةً: مُبرِزُ أخطاء Next يقطع التعليقَ
 * العربيَّ بالبايت فيُجهض العمليّةَ برُعبٍ من Rust، فيبدو العطلُ في العربيّة وهو في
 * التصدير. (درسٌ مسجَّل: عند «panic in async function» فتّش عن الخطأ الحقيقيّ فيما
 * حول السطر المذكور، لا في نصّه.)
 */

export type GameResult = { ok: boolean; message: string; id?: string; code?: string };

const DENIED = "لا تملك قدرةَ إدارة الألعاب.";

/**
 * كلُّ أفعال المضيف تمرّ من هنا.
 *
 * **بعميل الجلسة لا بمفتاح الخدمة**: دوالُّ `gw_*` الإداريّةُ تقرأ `auth.uid()` بنفسها
 * وتفحص `manage_games`. ومفتاحُ الخدمة يجعل `auth.uid()` فارغًا فتُردّ كلُّها، ولو
 * التُفّ على ذلك بتمرير الفاعل مُدخَلًا لعاد انتحالُ `p_actor` الذي أُعدم في ٢٠٢٦-٠٨-٠٦.
 *
 * والحارسُ في التطبيق (`getGamesManager`) طبقةٌ أولى تُعطي رسالةً عربيّةً مفهومة؛
 * والقاعدةُ هي الحارسُ الذي لا يُنسى.
 */
async function callRpc(
  fn: string,
  args: Record<string, unknown>,
  okMessage: string,
  revalidate?: string
): Promise<GameResult> {
  if (!(await getGamesManager())) return { ok: false, message: DENIED };

  const sb = await createClient();
  const { error } = await sb.rpc(fn, args);
  if (error) return { ok: false, message: gameError(error.message) };

  if (revalidate) revalidatePath(revalidate);
  return { ok: true, message: okMessage };
}

/* ────────────────────────── إنشاءُ الغرفة ────────────────────────── */

export async function createRoom(input: CreateRoomInput): Promise<GameResult> {
  if (!(await getGamesManager())) return { ok: false, message: DENIED };

  const invalid = validateRoom(input);
  if (invalid) return { ok: false, message: invalid };

  const sb = await createClient();
  const { data, error } = await sb.rpc("gw_create_session", {
    p_title: cleanText(input.title),
    p_time_per_word: input.seconds,
    p_pick_mode: input.pickMode,
    // الفارغةُ تعني «التصنيفاتِ كلَّها»، والقاعدةُ تفهم `null` بذلك.
    p_categories: input.categories.length ? input.categories : null,
    p_word_ids: input.pickMode === "chosen" ? input.wordIds : null,
    p_pick_count: input.pickCount,
    p_custom_words: splitCustomWords(input.customWords),
  });

  if (error) return { ok: false, message: gameError(error.message) };

  const room = data as unknown as { id: string; code: string } | null;
  if (!room) return { ok: false, message: "تعذّر إنشاءُ الغرفة." };

  revalidatePath("/dashboard/games");
  return { ok: true, message: "فُتحت الغرفة.", id: room.id, code: room.code };
}

/* ────────────────────────── أفعالُ الجولة ────────────────────────── */

/**
 * ⚠️ **كلُّها `export async function` لا سهمٌ في ثابت.** جُرّب السهمُ فسقط البناء:
 * مترجمُ Next يتعرّف على الفعل الخادميّ بتصريحِ دالّةٍ لاتزامنيّة، والثابتُ الحاملُ
 * سهمًا لا يُعَدّ منها ولو أعاد وعدًا. («The export startRound was not found».)
 */

export async function startRound(sessionId: string, wordId: string): Promise<GameResult> {
  return callRpc("gw_start_round", { p_session_id: sessionId, p_word_id: wordId }, "بدأت الجولة.");
}

export async function pauseRound(sessionId: string): Promise<GameResult> {
  return callRpc("gw_pause_round", { p_session_id: sessionId }, "أُوقفت الجولة.");
}

export async function resumeRound(sessionId: string): Promise<GameResult> {
  return callRpc("gw_resume_round", { p_session_id: sessionId }, "استُؤنفت الجولة.");
}

export async function endRound(sessionId: string): Promise<GameResult> {
  return callRpc("gw_end_current_round", { p_session_id: sessionId }, "انتهت الجولة.");
}

/** فعلٌ يمحو: تُحذَف الإجاباتُ ويُنقَض الفائزُ ونقطتُه. نافذةُ التأكيد تسبقه دائمًا. */
export async function replayRound(wordId: string): Promise<GameResult> {
  return callRpc("gw_replay_round", { p_word_id: wordId }, "أُعيدت الجولة.");
}

/** `null` = بلا فائز؛ جولةٌ لم يُصِبها أحدٌ واقعةٌ تقع، والإجبارُ يفسد النتائج. */
export async function pickWinner(wordId: string, playerId: string | null): Promise<GameResult> {
  return callRpc(
    "gw_pick_winner",
    { p_word_id: wordId, p_player_id: playerId },
    playerId ? "أُعلن الفائز." : "سُجّلت بلا فائز."
  );
}

/* ────────────────────────── أفعالُ اللاعبين ────────────────────────── */

export async function kickPlayer(playerId: string): Promise<GameResult> {
  return callRpc("gw_kick_player", { p_player_id: playerId }, "أُخرِج اللاعب.");
}

/** يعيده **كما كان**: النقاطُ والإجاباتُ لم تُمَسّ ساعةَ الإخراج. */
export async function restorePlayer(playerId: string): Promise<GameResult> {
  return callRpc("gw_restore_player", { p_player_id: playerId }, "عاد اللاعب.");
}

/* ────────────────────────── أفعالُ الغرفة ────────────────────────── */

export async function closeRoom(sessionId: string): Promise<GameResult> {
  return callRpc("gw_close_session", { p_session_id: sessionId }, "انتهت اللعبة.", "/dashboard/games");
}

export async function deleteRoom(sessionId: string): Promise<GameResult> {
  return callRpc("gw_delete_session", { p_session_id: sessionId }, "حُذفت الغرفة.", "/dashboard/games");
}

/* ────────────────────────── القراءةُ الحيّة ────────────────────────── */

/**
 * لقطةٌ جديدةٌ للمِقوَد وشاشة العرض.
 *
 * فعلُ خادمٍ **يقرأ** لا يكتب، على سابقة `getSurveyPreview`. وعلّتُه أنّ الاشتراكَ
 * يخبرنا **أنّ** شيئًا تبدّل ولا يخبرنا بما صار إليه الكلُّ؛ فالحدثُ نبضةٌ والقراءةُ
 * هنا. ولو قرأنا من المتصفّح مباشرةً لاحتجنا خمسةَ استعلاماتٍ وضمَّ أسماءٍ في العميل.
 */
export async function refreshHostSnapshot(
  sessionId: string
): Promise<{ snapshot: HostSnapshot | null; message: string | null }> {
  if (!(await getGamesManager())) return { snapshot: null, message: DENIED };
  const { snapshot, error } = await getHostSnapshot(sessionId);
  return { snapshot, message: error ? gameError(error) : null };
}
