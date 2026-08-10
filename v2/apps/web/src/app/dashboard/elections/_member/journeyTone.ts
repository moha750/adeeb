import type { CSSProperties } from "react";
import type { RecordTone } from "../member-data";

// نغمةُ الرحلة ثلاثةُ متغيّراتٍ على الجذر — يقرؤها `.jrn-*` (كلُّها رموز V2).
const TONE: Record<RecordTone, [string, string, string]> = {
  warning: ["var(--warning)", "var(--warning-soft)", "var(--warning-800)"],
  info: ["var(--info)", "var(--info-soft)", "var(--steel-800)"],
  success: ["var(--success)", "var(--success-soft)", "var(--success-800)"],
  danger: ["var(--danger)", "var(--danger-soft)", "var(--danger-800)"],
  neutral: ["var(--neutral-600)", "var(--neutral-100)", "var(--neutral-800)"],
};

export function toneVars(tone: RecordTone): CSSProperties {
  const [t, ts, ti] = TONE[tone];
  return { "--jrn-tone": t, "--jrn-tone-soft": ts, "--jrn-tone-ink": ti } as CSSProperties;
}
