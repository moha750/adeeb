/**
 * بلاغُ الاستماع — يُرسَل مرّةً واحدة بعد نصف دقيقةِ سماعٍ حقيقيّ.
 *
 * ولا يمرّ بخادمنا: الزائرُ ينادي دالّةَ القاعدة بمفتاح anon مباشرةً. والدالّةُ
 * **تزيد واحدًا ولا تقبل مقدارًا**، فلا يُضبَط العدّادُ على رقمٍ من الخارج.
 */
"use client";

import { createAdeebClient } from "@adeeb/core";

/** عتبةُ الاحتساب — من `@adeeb/core`، يقرؤها الويبُ والجوّالُ سواء. */
export { PLAY_THRESHOLD_SECONDS } from "@adeeb/core";

/**
 * علامةُ الجهاز — تُولَّد مرّةً وتبقى في متصفّح الزائر.
 *
 * وليست هويّةً ولا تعريفًا: **تُبصَم في القاعدة ولا تُحفَظ نصًّا**، والغرضُ عدُّ
 * الأجهزة المختلفة لا معرفةُ أصحابها. ومن مسح متصفّحَه صار جهازًا جديدًا،
 * وذلك ثمنُ ألّا نطلب حسابًا.
 */
const DEVICE_KEY = "adeeb.radio.device";

function deviceMark(): string | null {
  try {
    let v = localStorage.getItem(DEVICE_KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, v);
    }
    return v;
  } catch {
    // متصفّحٌ يمنع التخزين: تُحتسَب الاستماعةُ ولا يُحتسَب المستمع.
    return null;
  }
}

export async function reportPlay(episodeId: string, plain: boolean): Promise<void> {
  try {
    const sb = createAdeebClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await sb.rpc("bump_episode_play", { p_episode: episodeId, p_plain: plain, p_device: deviceMark() });
  } catch {
    // العدّادُ استرشادٌ لا محاسبة: فشلُ بلاغٍ لا يُقلق المستمع بشيء.
  }
}
