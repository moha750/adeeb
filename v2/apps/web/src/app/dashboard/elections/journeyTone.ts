import type { CSSProperties } from "react";
import type { LogTone } from "./log";

// نغمةُ الخطّ الزمنيّ ثلاثةُ متغيّراتٍ على الجذر — يقرؤها `.jrn-*` (كلُّها رموز V2).
// وتُوضَع حيث تُوضَع: على جذر رحلة العضو (نغمةٌ واحدةٌ للرحلة كلّها)، أو على كلِّ سطرٍ
// في سجلّ الإدارة (نغمةُ كلِّ حدثٍ من طبيعته).
const TONE: Record<LogTone, [string, string, string]> = {
  warning: ["var(--warning)", "var(--warning-soft)", "var(--warning-800)"],
  info: ["var(--info)", "var(--info-soft)", "var(--steel-800)"],
  success: ["var(--success)", "var(--success-soft)", "var(--success-800)"],
  danger: ["var(--danger)", "var(--danger-soft)", "var(--danger-800)"],
  neutral: ["var(--neutral-600)", "var(--neutral-100)", "var(--neutral-800)"],
};

export function toneVars(tone: LogTone): CSSProperties {
  const [t, ts, ti] = TONE[tone];
  return { "--jrn-tone": t, "--jrn-tone-soft": ts, "--jrn-tone-ink": ti } as CSSProperties;
}

/**
 * نغمةُ **سطرِ سجلٍّ** في لغة المسيرة (`.mjr-i.ev`) — حبرٌ وسطحُ Aurora وحدُّ الكرت بنغمته.
 * وهي رموزُ الأسطح نفسُها التي تلبسها الكروت، فلا لونَ يُخترَع للسجلّ وحده.
 * و«info» تأخذ لغةَ الهوية (brand)، إذ لا Aurora لها — سابقةُ `.tico-steel`.
 */
const EVENT_TONE: Record<LogTone, [string, string, string]> = {
  warning: ["var(--warning-600)", "var(--aurora-warning)", "var(--card-stroke-warning)"],
  info: ["var(--steel-600)", "var(--aurora-brand)", "var(--card-stroke-brand)"],
  success: ["var(--success-600)", "var(--aurora-success)", "var(--card-stroke-success)"],
  danger: ["var(--danger-600)", "var(--aurora-danger)", "var(--card-stroke-danger)"],
  neutral: ["var(--neutral-600)", "var(--aurora-neutral)", "var(--card-stroke-neutral)"],
};

export function eventToneVars(tone: LogTone): CSSProperties {
  const [ink, aurora, stroke] = EVENT_TONE[tone];
  return { "--mjr-ink": ink, "--mjr-aurora": aurora, "--mjr-stroke": stroke } as CSSProperties;
}
