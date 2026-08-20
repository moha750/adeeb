import { DEVICE_KEY, LIKED_KEY } from "@adeeb/core";

import { readPref, writePref } from "./prefs";
import { supabase } from "./supabase";

/**
 * عدُّ الاستماع والإعجاب.
 *
 * الدالّتان `bump_episode_play` و`bump_episode_like` ممنوحتان لـ`anon` في القاعدة
 * ويناديهما المتصفّحُ اليوم مباشرةً، فالتطبيقُ يناديهما بنفس الطريقة تمامًا.
 * والقاعدةُ هي التي تتحقّق من أنّ الحلقةَ منشورة، وهي التي تُعمّي معرِّفَ الجهاز بـsha256.
 */

/** معرِّفُ جهازٍ ثابتٌ لا يُعرّف صاحبَه: القاعدةُ تعمّيه قبل أن تخزّنه. */
function deviceId(): string {
  const saved = readPref(DEVICE_KEY);
  if (saved && saved.length >= 8) return saved;

  // `crypto.randomUUID` ليس في Hermes، وهذا يكفي: المطلوب تمييزُ جهازٍ لا سرّيّة
  const fresh = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  writePref(DEVICE_KEY, fresh);
  return fresh;
}

export async function reportPlay(episodeId: string, plain: boolean): Promise<void> {
  const { error } = await supabase.rpc("bump_episode_play", {
    p_episode: episodeId,
    p_plain: plain,
    p_device: deviceId(),
  });
  // العدُّ إحصاءٌ لا وظيفة: فشلُه لا يُقال للمستمع ولا يقطع سماعَه
  if (error && __DEV__) console.warn("bump_episode_play:", error.message);
}

/* ─────────────────────────── الإعجاب ─────────────────────────── */

function likedSet(): Set<string> {
  const raw = readPref(LIKED_KEY);
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

export function isLiked(episodeId: string): boolean {
  return likedSet().has(episodeId);
}

/** يقلب الإعجاب ويردّ العدَّ الجديد كما حسبته القاعدة. */
export async function toggleLike(episodeId: string): Promise<number | null> {
  const set = likedSet();
  const up = !set.has(episodeId);

  if (up) set.add(episodeId);
  else set.delete(episodeId);
  writePref(LIKED_KEY, JSON.stringify([...set]));

  const { data, error } = await supabase.rpc("bump_episode_like", { p_episode: episodeId, p_up: up });
  if (error) return null;
  return typeof data === "number" ? data : null;
}
