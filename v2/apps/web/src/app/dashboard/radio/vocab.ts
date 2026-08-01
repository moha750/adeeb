// مفردات الإذاعة — لا تعتمد على شيء خادميّ، فيستوردها الخادم والعميل معًا بأمان.
// كلّ قيمة هنا يحرسها قيدٌ مقابل في القاعدة:
//   radio_shows_status_check · radio_shows_tone_check ·
//   radio_episodes_status_check · radio_show_platforms_platform_check.
// لا تُضِف قيمة قبل توسيع القيد بترحيل مقابل.

export { slugify } from "@/lib/slug";

/* ══ حالة البرنامج ═══════════════════════════════════════════════════ */

export type ShowStatus = "draft" | "published" | "archived";

export const SHOW_STATUS_META: Record<ShowStatus, { label: string; tone: "info" | "success" | "neutral" }> = {
  draft: { label: "مسودّة", tone: "info" },
  published: { label: "منشور", tone: "success" },
  archived: { label: "مؤرشف", tone: "neutral" },
};

/* ══ حالة الحلقة ═════════════════════════════════════════════════════ */

export type EpisodeStatus = "draft" | "scheduled" | "published" | "archived";

export const EPISODE_STATUS_META: Record<EpisodeStatus, { label: string; tone: "info" | "warning" | "success" | "neutral" }> = {
  draft: { label: "مسودّة", tone: "info" },
  scheduled: { label: "مجدولة", tone: "warning" },
  published: { label: "منشورة", tone: "success" },
  archived: { label: "مؤرشفة", tone: "neutral" },
};

/* ══ نغمة البرنامج ═══════════════════════════════════════════════════ */

// النغمة من نظام النغمات لا لونًا حرًّا — تعمّ بطاقة البرنامج وصفحته ومشغّله.
export type ShowTone = "brand" | "neutral" | "success" | "warning" | "danger";

export const TONE_META: Record<ShowTone, { label: string }> = {
  brand: { label: "الهويّة (كحليّ)" },
  neutral: { label: "فولاذيّ" },
  success: { label: "أخضر" },
  warning: { label: "ذهبيّ" },
  danger: { label: "أحمر" },
};
export const TONE_VALUES = Object.keys(TONE_META) as ShowTone[];
export const TONE_OPTIONS = TONE_VALUES.map((v) => ({ value: v, label: TONE_META[v].label }));

/* ══ المنصّات ════════════════════════════════════════════════════════ */

export type Platform =
  | "spotify" | "apple" | "youtube" | "anghami" | "deezer"
  | "amazon" | "castbox" | "x" | "instagram" | "tiktok";

export const PLATFORM_META: Record<Platform, { label: string }> = {
  spotify: { label: "سبوتيفاي" },
  apple: { label: "آبل بودكاست" },
  youtube: { label: "يوتيوب ميوزك" },
  anghami: { label: "أنغامي" },
  deezer: { label: "ديزر" },
  amazon: { label: "أمازون ميوزك" },
  castbox: { label: "كاست بوكس" },
  x: { label: "إكس" },
  instagram: { label: "إنستغرام" },
  tiktok: { label: "تيك توك" },
};
export const PLATFORM_VALUES = Object.keys(PLATFORM_META) as Platform[];
export const PLATFORM_OPTIONS = PLATFORM_VALUES.map((v) => ({ value: v, label: PLATFORM_META[v].label }));

/* ══ عرض المدّة والحجم ═══════════════════════════════════════════════ */

/**
 * مدّةٌ مقروءة من الثواني: `12:34` أو `1:02:03`.
 * تُعرض بالخطّ اللاتينيّ ومعزولةً في `<bdi dir="ltr">` — وإلّا تبعثرت في سياقٍ عربيّ.
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** حجمٌ مقروء بالميغابايت — رقمٌ واحد بعد الفاصلة يكفي لحلقةٍ صوتيّة. */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)} م.ب` : `${mb.toFixed(1)} م.ب`;
}

/** تسمية الموسم والحلقة كما تُقرأ في اللوحة والموقع. */
export const episodeLabel = (season: number, number: number) => `م${season} · ح${number}`;
