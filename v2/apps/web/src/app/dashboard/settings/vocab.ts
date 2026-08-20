/**
 * مفرداتُ الإعدادات — **بلا إطارٍ ولا `server-only`**، فيقرؤها الخادمُ والعميلُ والمِعيار معًا.
 *
 * وهذا موضعُها لا `data.ts`: ذاك خادميٌّ حصرًا (`import "server-only"`)، فلو سكنت فيه هذه
 * الثوابتُ لَسحبَ استيرادُها من `SettingsView` ملفًّا خادميًّا إلى حزمة المتصفّح — وهو ما
 * يمنعه الوسمُ نفسُه فيسقط البناء. وقاعدةُ المستودع تقول ذلك أصلًا: `vocab.ts` هو بيتُ ما
 * يشترك فيه الطرفان في كلّ غرفة.
 */

/** أقصى ما تُحفَظ به النبذة العلنيّة — يقرؤه الفعلُ الخادميّ وعدّادُ النافذة معًا. */
export const BIO_MAX = 180;

/* ── طرقُ الدخول ─────────────────────────────────────────────────────────────
 * هويّاتُ الحساب عند GoTrue: `email` هويّةُ البريد وكلمةِ المرور، وما سواها مزوّدٌ خارجيّ.
 * والقائمةُ مرآةُ ما فُعّل في `v2/scripts/auth-config.mjs` — كقائمة `OAuthButtons` سواءً.
 */
export type ProviderKey = "email" | "google" | "apple";

/** تسميةُ المزوّد بالعربيّة — مصدرٌ واحدٌ تقرؤه الشاشةُ ورسائلُ الأفعال معًا. */
export const PROVIDER_LABEL: Record<ProviderKey, string> = {
  email: "بريدٌ وكلمةُ مرور",
  google: "قوقل",
  apple: "أبل",
};

/** ما نعرف عرضَه: هويّةٌ بمزوّدٍ خارجَ هذه الثلاثة تُهمَل ولا تُخمَّن تسميتُها. */
export function providerKey(p: string | undefined): ProviderKey | null {
  return p === "email" || p === "google" || p === "apple" ? p : null;
}

/* ── وصفُ الجهاز من `user_agent` ────────────────────────────────────────────
 * تعرّفٌ خشنٌ عن قصد: الغرض أن يعرف صاحبُها «أهذه جلستي من جوّالي أم من حاسب الجامعة؟»،
 * لا أن نبني مكتبة تحليل. وما لا يُعرَف يُقال «جهازٌ غير معروف» لا يُخمَّن.
 */
export type SessionKind = "phone" | "tablet" | "desktop" | "unknown";

/** والترتيبُ حارس: Edge وOpera يحملان `Chrome` في سلسلتهما، فالخاصُّ يسبق العامّ. */
const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Chrome\/|CriOS/, "Chrome"],
  [/Firefox\/|FxiOS/, "Firefox"],
  [/Safari\//, "Safari"],
];
const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPod/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

export function describeDevice(ua: string | null): string {
  if (!ua) return "جهازٌ غير معروف";
  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1];
  const system = SYSTEMS.find(([re]) => re.test(ua))?.[1];
  if (browser && system) return `${browser} على ${system}`;
  return browser ?? system ?? "جهازٌ غير معروف";
}

/**
 * نوعُ الجهاز — أيقونةً لا كلمة (اللوحةُ تُقرأ في ٣٧٥px، ولا يتّسع فيها سطرٌ يصف النوع).
 *
 * و**اللوحيُّ قبل الجوّال** في الترتيب: `iPad` في بعض النسخ يحمل `Macintosh` في سلسلته،
 * واللوحيُّ الأندرويديُّ يحمل `Android` بلا `Mobile`. فالفحصُ الخاصّ يسبق العامّ، وإلّا
 * صار كلُّ لوحيٍّ حاسبًا أو جوّالًا.
 */
export function deviceKind(ua: string | null): SessionKind {
  if (!ua) return "unknown";
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/.test(ua)) return "tablet";
  if (/iPhone|iPod|Android|Mobile|Windows Phone/.test(ua)) return "phone";
  if (/Windows|Mac OS X|Macintosh|Linux|CrOS/.test(ua)) return "desktop";
  return "unknown";
}
