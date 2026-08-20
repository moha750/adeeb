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

/* ══ مسارا الحلقة ════════════════════════════════════════════════════ */

/**
 * الحلقةُ **مساران** لا نسختان: مسارُ صوتٍ ومسارُ موسيقى، والكلامُ في أحدهما
 * وحدَه. فما يُسمَع «بموسيقى» هو مجموعُهما، و«بلا موسيقى» هو الصوتُ وحدَه،
 * وبينهما مقبضٌ متّصل.
 *
 * ولمَ لا مكسان كاملان كما كان؟ لأنّ الكلامَ كان فيهما مكرّرًا مرّتين، فأيُّ
 * جمعٍ بينهما يجمع صوتَ المذيع من مصدرين وانزياحُ جزءٍ من الألف يُحدث عليه
 * رنينًا معدنيًّا. فلمّا صار الكلامُ في مسارٍ واحد، صار انزياحُ الموسيقى غيرَ
 * مسموعٍ أصلًا (سريرٌ لا يُوقَّع على كلمات).
 *
 * و`music` مكسٌ قديم: تعمل به الحلقاتُ التي رُفعت قبل المسارين، ولا يُرفَع بعدُ.
 */
export type AudioVariant = "music" | "plain" | "stem";

export const VARIANT_META: Record<AudioVariant, { label: string; verb: string; uploaded: string }> = {
  music: { label: "بموسيقى", verb: "النسخة بموسيقى", uploaded: "رُفعت النسخة بموسيقى" },
  plain: { label: "الصوت", verb: "مسار الصوت", uploaded: "رُفع مسار الصوت" },
  stem: { label: "الموسيقى", verb: "مسار الموسيقى", uploaded: "رُفع مسار الموسيقى" },
};
export const VARIANT_VALUES: AudioVariant[] = ["music", "plain", "stem"];

/** ما يُرفَع اليوم. والمكسُ ليس فيها: يُقرأ ولا يُكتب، فبابُ الرفع واحد. */
export const UPLOAD_VARIANTS: AudioVariant[] = ["plain", "stem"];

/**
 * ما نتسامح به من فرقٍ بين مدّتَي المسارين، وحقُّهما التساوي.
 *
 * ثانيةٌ ونصف لا أقلّ: المدّتان تُخزَّنان ثوانيَ صحيحة، فتقريبُ كلٍّ منهما
 * يخطئ نصفَ ثانية ويبلغ خطأ الفرق ثانيةً كاملة في أسوأ حال. وما فوقها تصديرٌ
 * مقصوصٌ أو ملفٌّ رُفع في غير موضعه، ونتيجتُه موسيقى تسبق الكلامَ أو تتخلّف.
 */
export const DURATION_TOLERANCE_SECONDS = 1.5;

/**
 * أمتّسقان؟ تصديرتان من تايم لاينٍ واحد، فحقُّ مدّتيهما التساوي.
 * تأخذ المدّتين لا صفَّ الحلقة، فيصحّ نداؤها من الجدول والكرت معًا بلا استيراد خادميّ.
 */
export const takesAligned = (
  a: { seconds: number } | null,
  b: { seconds: number } | null,
): boolean => !a || !b || Math.abs(a.seconds - b.seconds) <= DURATION_TOLERANCE_SECONDS;

/* ══ مقبض الموسيقى ═══════════════════════════════════════════════════ */

/**
 * مقبضُ الموسيقى وقفزةُ الأزرار وعتبةُ العدّ نزلت كلُّها إلى `@adeeb/core`:
 * يقرؤها الويبُ والجوّالُ من بيتٍ واحد، فلا يفترق ما في يدك عمّا في جيبك.
 * وتُعاد تصديرًا من هنا كي لا يتغيّر بابُ استيرادها في الويب.
 */
export { DEFAULT_MUSIC_LEVEL, MUSIC_LEVEL_KEY, MUSIC_STOPS, nearestStop } from "@adeeb/core";

/**
 * ثانيةُ بدء الحديث كما تُكتب وتُقرأ في الحقول: ثوانٍ بثلاث منازل بلا أصفارٍ زائدة.
 * ولا يُستعمل الرقمُ في التبديل (فالزمن واحد)، بل في شيءٍ واحد: ألّا يجلس
 * المستمعُ في صمتٍ إن بدأ بالنسخة المجرّدة قبل أن يبدأ الكلام.
 */
export const formatTalkStart = (seconds: number): string =>
  String(Math.round(seconds * 1000) / 1000);

/**
 * معدّلُ الإطارات الذي تُقرأ به توقيتاتُ المحرّر. تصدير أدِيب ٣٠ إطارًا،
 * والفرقُ لو كان ٢٥ عُشرُ ثانيةٍ لا يُحسّ في موضعٍ نقفز إليه.
 */
export const EDITOR_FPS = 30;

/**
 * يقرأ ثانيةَ بدءٍ **بأيّ الصورتين كتبها صاحبُها**، فلا يُطالَب بحسابٍ ذهنيّ:
 *
 *   `10.633`        ثوانٍ عشريّة
 *   `0:00:10:19`    توقيتُ المحرّر بالإطارات (س:د:ث:إطار) — وهو ما يقرؤه من برنامجه
 *   `0:10:19`       د:ث:إطار (ساعةٌ محذوفة)
 *   `10:19`         ث:إطار
 *
 * **وآخرُ مقطعٍ إطاراتٌ دائمًا** في كلّ صورةٍ منقّطة، فلا تُحفَظ قاعدتان.
 * ولو قُرئ `10:19` دقيقةً وثانيةً لصار ٦١٩ث، وهو مستحيلٌ لمقدّمةٍ موسيقيّة.
 *
 * ويردّ `null` للفارغ (أي: ارِث) و`NaN` لما لا يُفهم.
 */
export function parseTalkStart(raw: string): number | null {
  const t = raw.trim().replace(/[٫،]/g, ".");
  if (!t) return null;

  if (/^\d+(\.\d{1,3})?$/.test(t)) return Number(t);

  if (/^\d+(:\d+){1,3}$/.test(t)) {
    const parts = t.split(":").map(Number);
    const frames = parts.pop()! / EDITOR_FPS;
    // ما بقي ثوانٍ فدقائقُ فساعات، يُقرأ من آخره إلى أوّله.
    const scale = [1, 60, 3600];
    return parts.reverse().reduce((sum, v, i) => sum + v * scale[i], frames);
  }

  return NaN;
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

/** حجمٌ مقروء بالميغابايت — غادر إلى `lib/bytes` يوم احتاجه بابٌ ثانٍ، ويُعاد تصديرُه هنا
 *  كي لا يتغيّر مستدعوه في الإذاعة. التعريفُ هناك وحده. */
export { formatBytes } from "@/lib/bytes";

/** تسمية الحلقة كما تُقرأ في اللوحة والموقع. ترقيمٌ متسلسلٌ واحد بلا مواسم. */
export const episodeLabel = (number: number) => `الحلقة ${number}`;

/* ══ القفزة ══════════════════════════════════════════════════════════ */

export { SKIP_SECONDS } from "@adeeb/core";

/* ══ وحدةُ العدّ ═════════════════════════════════════════════════════ */

/**
 * تصريفُ «استماعة» عربيًّا — ومسكنُه هنا لا في مكوّنٍ عميليّ.
 *
 * كان مُصدَّرًا من `EpisodeRow.tsx` وعليه `"use client"`، وصفحةُ الحلقة **خادميّة**.
 * وما يصل الخادمَ من ملفٍّ عميليّ **مرجعُ عميلٍ لا كائن**، فقراءةُ حقولِه تردّ
 * `undefined`؛ فتصدق `word === unit.two` على غيابين وتردّ `countPhrase` غيابًا،
 * فيُرسَم `<span>` فارغٌ ويختفي عدّادُ الاستماع من صدر الحلقة **بلا خطأ يُرفَع**.
 * كان يظهر في الصفوف (وهي عميليّة) ويغيب في الصدر، وهذا هو الفرق كلُّه.
 *
 * والمفرداتُ ملفٌّ بلا إطار (انظر رأسَ هذا الملفّ)، فهو مسكنُ ما يقرؤه الطرفان.
 */
export const PLAYS_UNIT = { one: "استماعة", two: "استماعتان", few: "استماعات" };
