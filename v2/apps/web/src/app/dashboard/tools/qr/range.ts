import { DEFAULT_PRESET, isDayKey } from "@/lib/analyticsRange";

/**
 * **عنوانُ صفحة الباركود بمدّتها** — نظيرُ `analyticsHref` لهذه الغرفة.
 *
 * ولمَ لا يُستعمل ذاك: مسارُه محفورٌ في `‎/dashboard/analytics`، وهذه شاشةُ سجلٍّ بعينه.
 * وقواعدُ الكتابة واحدةٌ فيهما: تاريخان ⇒ مدًى مخصّص، واختصارٌ ⇒ يُسقط التاريخين،
 * والافتراضُ لا يُكتب في العنوان (وهو هنا **«منذ البداية»** لا «هذا الشهر»: الملصقُ يُقرأ
 * عمرُه كلُّه، بخلاف زوّار الموقع).
 */
export const QR_DEFAULT_PRESET = "all";

export function qrRangeHref(
  id: string,
  cur: { preset: string; from: string | null; to: string | null },
  patch: { preset?: string; from?: string; to?: string; compare?: boolean },
): string {
  const q = new URLSearchParams();
  const useDates = patch.from != null && patch.to != null ? true : patch.preset != null ? false : cur.preset === "custom";

  if (useDates) {
    const from = patch.from ?? cur.from;
    const to = patch.to ?? cur.to;
    if (isDayKey(from) && isDayKey(to)) {
      q.set("from", from);
      q.set("to", to);
    }
  } else {
    const preset = patch.preset ?? cur.preset;
    if (preset !== QR_DEFAULT_PRESET) q.set("preset", preset);
  }

  const s = q.toString();
  return `/dashboard/tools/qr/${id}${s ? `?${s}` : ""}`;
}

/** يُقرأ في المعارض حيث لا عنوان: الافتراضُ نفسُه الذي تكتبه الشاشة. */
export const isDefaultPreset = (p: string) => p === QR_DEFAULT_PRESET || p === DEFAULT_PRESET;
