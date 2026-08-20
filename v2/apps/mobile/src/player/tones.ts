import { color } from "@adeeb/theme-native";

import type { Tone } from "@/lib/radio";

/**
 * نغمةُ البرنامج → لونٌ من ورقة الرموز.
 * البرنامجُ يُعرَف بلونه وهو يُذاع، والقيمُ الخمسُ نفسُها المقيَّدة في
 * `radio_shows_tone_check`، فلا نغمةَ سادسةَ تُخترَع هنا.
 */
export const toneColor: Record<Tone, string> = {
  brand: color.primary,
  neutral: color.neutral[600],
  success: color.success_,
  warning: color.warning_,
  danger: color.danger_,
};

export const toneSoft: Record<Tone, string> = {
  brand: color.auroraBrand,
  neutral: color.auroraNeutral,
  success: color.auroraSuccess,
  warning: color.auroraWarning,
  danger: color.auroraDanger,
};

/** «12:34» — والساعةُ تُكتب فقط حين توجد. */
export function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
