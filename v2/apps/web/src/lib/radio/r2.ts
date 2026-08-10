/**
 * مخزن وسائط الإذاعة (Cloudflare R2) — **المصدر الواحد** لكلّ ما يمسّ الملفّات.
 *
 * لماذا R2 لا تخزين Supabase: الصوت أثقل ما ننشره، وR2 **بلا رسوم خروج** —
 * فالاستماع لا يستهلك باقية. والقاعدة تحفظ **المسار** لا الرابط الكامل، فالمخزن
 * قابلٌ للاستبدال بمتغيّر بيئةٍ واحد بلا ترحيلٍ ولا عنوانٍ يتكسّر عند مشترك.
 *
 * ولا مفتاح يصل المتصفّح: الرفع يجري برابط PUT **موقّع** يصكّه الخادم، ثمّ يرفع
 * المتصفّح إليه مباشرةً — فيتجاوز حدّ جسم Server Action (~1MB) ويخفّف الخادم.
 */
import "server-only";
import { AwsClient } from "aws4fetch";

const ACCOUNT = process.env.R2_ACCOUNT_ID?.trim();
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID?.trim();
const SECRET = process.env.R2_SECRET_ACCESS_KEY?.trim();
const BUCKET = process.env.R2_BUCKET?.trim() || "adeeb-radio";
/** عنوان القراءة العامّ للدلو — منه يُبَثّ الصوت وتُعرض الشعارات مباشرةً. */
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE?.trim().replace(/\/+$/, "") ?? "";

const ENDPOINT = ACCOUNT ? `https://${ACCOUNT}.r2.cloudflarestorage.com` : "";

/** هل يكفي الإعداد للكتابة؟ (الرفع والحذف) */
export const R2_READY = Boolean(ACCOUNT && ACCESS_KEY && SECRET);
/** هل يكفي الإعداد للقراءة العامّة؟ (عرض الشعارات وبثّ الصوت) */
export const R2_PUBLIC_READY = Boolean(PUBLIC_BASE);

export const R2_MISSING = "إعداد مخزن الوسائط ناقص. أضِف مفاتيح R2 إلى apps/web/.env.local.";
export const R2_PUBLIC_MISSING =
  "العنوان العامّ للمخزن غير مضبوط. فعِّل Public Development URL على الدلو ثمّ املأ R2_PUBLIC_BASE.";

let cached: AwsClient | null = null;
function client(): AwsClient | null {
  if (!R2_READY) return null;
  cached ??= new AwsClient({
    accessKeyId: ACCESS_KEY!,
    secretAccessKey: SECRET!,
    service: "s3",
    region: "auto",
  });
  return cached;
}

/* ══ مفاتيح الكائنات — تُشتقّ ولا تُكتب بأيدٍ متفرّقة ═════════════════ */

export const showLogoKey = (showId: string, ext: string) => `shows/${showId}/logo.${ext}`;
/**
 * للحلقة نسختان في المخزن، والنسخةُ جزءٌ من المفتاح لا لاحقةٌ تُلصق —
 * فلا يدهس رفعُ إحداهما أختَها، ويكشف المفتاحُ وحدَه ما يحمله.
 */
export const episodeAudioKey = (showId: string, episodeId: string, variant: "music" | "plain", ext: string) =>
  `shows/${showId}/episodes/${episodeId}/audio-${variant}.${ext}`;
export const episodeCoverKey = (showId: string, episodeId: string, ext: string) =>
  `shows/${showId}/episodes/${episodeId}/cover.${ext}`;
/** كلّ وسائط البرنامج تحت بادئةٍ واحدة — فحذفه يمسحها دفعةً. */
export const showPrefix = (showId: string) => `shows/${showId}/`;
export const episodePrefix = (showId: string, episodeId: string) =>
  `shows/${showId}/episodes/${episodeId}/`;

/* ══ الامتدادات المقبولة — الحارس الأوّل قبل أن يُصكّ رابط ═══════════ */

export const AUDIO_EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
};
export const IMAGE_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

/** سقفٌ تطبيقيّ يصدّ الرفعة الخاطئة (ملفّ WAV مثلًا) — لا يقيّد طول الحلقة. */
export const AUDIO_MAX_BYTES = 150 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

/* ══ العمليّات ══════════════════════════════════════════════════════ */

/**
 * رابط PUT موقّع يرفع إليه **المتصفّح مباشرةً**. الصلاحيّة قصيرة (١٥ دقيقة)
 * تكفي رفع حلقةٍ كاملة ولا تصلح لأن تُسرَّب وتُستعمل بعد حين.
 */
export async function presignUpload(key: string, expiresSeconds = 900): Promise<string | null> {
  const c = client();
  if (!c) return null;
  const signed = await c.sign(
    `${ENDPOINT}/${BUCKET}/${encodeKey(key)}?X-Amz-Expires=${expiresSeconds}`,
    { method: "PUT", aws: { signQuery: true } },
  );
  return signed.url;
}

/** حذف كائنٍ واحد. الصمت عن «غير موجود» مقصود: الحذف غايةٌ لا إجراء. */
export async function deleteObject(key: string): Promise<void> {
  const c = client();
  if (!c) return;
  await c.fetch(`${ENDPOINT}/${BUCKET}/${encodeKey(key)}`, { method: "DELETE" });
}

/**
 * حذف كلّ ما تحت بادئة — لأنّ حذف صفٍّ في القاعدة لا يمسّ الملفّات،
 * فتتراكم أيتامٌ في الدلو ما لم تُمسح صراحةً (درسُ المكتبة نفسه).
 */
export async function deletePrefix(prefix: string): Promise<void> {
  const c = client();
  if (!c) return;
  const res = await c.fetch(
    `${ENDPOINT}/${BUCKET}?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=1000`,
  );
  if (!res.ok) return;
  const xml = await res.text();
  const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => decodeXml(m[1]));
  await Promise.all(keys.map((k) => deleteObject(k)));
}

/** رابط القراءة العامّ لمسارٍ مخزَّن — `null` ما لم يُضبط العنوان العامّ. */
export function publicUrl(key: string | null | undefined): string | null {
  if (!key || !PUBLIC_BASE) return null;
  return `${PUBLIC_BASE}/${encodeKey(key)}`;
}

/* ── تفاصيل ── */

/** المسار يُرمَّز جزءًا جزءًا كي تبقى الشُّرَط الفاصلة شُرَطًا لا `%2F`. */
const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

const decodeXml = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
