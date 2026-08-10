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

/* ══ نسختا الصوت ═════════════════════════════════════════════════════ */

// لكلّ حلقةٍ تجربتان: بموسيقى (الافتراضيّة، وبها وحدها يُسمَح بالنشر) وبلا موسيقى.
// وليستا ملفّين متجاورين فحسب: بينهما إزاحةٌ ثابتة هي طولُ المقدّمة الموسيقيّة،
// بها يقفز المستمع من نسخةٍ إلى أختها في اللحظة نفسها بلا انقطاع.
export type AudioVariant = "music" | "plain";

export const VARIANT_META: Record<AudioVariant, { label: string; verb: string }> = {
  music: { label: "بموسيقى", verb: "النسخة بموسيقى" },
  plain: { label: "بلا موسيقى", verb: "النسخة المجرّدة" },
};
export const VARIANT_VALUES: AudioVariant[] = ["music", "plain"];

/**
 * ما نتسامح به بين الإزاحة المعلنة و(مدّةُ الموسيقى ناقصَ مدّةِ المجرّدة).
 *
 * ثانيةٌ ونصف لا أقلّ: المدّتان تُخزَّنان ثوانيَ صحيحة، فتقريبُ كلٍّ منهما
 * يخطئ نصفَ ثانية، ويبلغ خطأ الفرق ثانيةً كاملة في أسوأ حال. وما دون ذلك
 * إنذارٌ كاذب، وما فوقه تصديرٌ خاطئ حقًّا (فالفرق يُقاس بالثواني لا بأجزائها).
 */
export const LEAD_TOLERANCE_SECONDS = 1.5;

/** نصٌّ للإزاحة كما تُكتب وتُقرأ في الحقول: ثوانٍ بثلاث منازل بلا أصفارٍ زائدة. */
export const formatLead = (seconds: number): string =>
  String(Math.round(seconds * 1000) / 1000);

/** يقرأ إزاحةً من حقلٍ نصّيّ. `null` للفارغ (أي: ارِث)، و`NaN` للخطأ. */
export function parseLead(raw: string): number | null {
  const t = raw.trim().replace(/[٫،]/g, ".");
  if (!t) return null;
  if (!/^\d+(\.\d{1,3})?$/.test(t)) return NaN;
  return Number(t);
}

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

// الوجهةُ يوتيوب، وما بقي حضورٌ اجتماعيّ. ولا منصّاتِ بودكاست: لا مغذّي RSS عندنا،
// فالحلقةُ لا تصل سبوتيفاي ولا آبل، وإدراجُهما هنا يَعِد بما لا نفي به.
export type Platform = "youtube" | "x" | "instagram" | "tiktok";

export const PLATFORM_META: Record<Platform, { label: string }> = {
  youtube: { label: "يوتيوب" },
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

/** تسمية الحلقة كما تُقرأ في اللوحة والموقع. ترقيمٌ متسلسلٌ واحد بلا مواسم. */
export const episodeLabel = (number: number) => `الحلقة ${number}`;
