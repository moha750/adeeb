/**
 * وسائط الأخبار — **المصدر الواحد** لكلّ ما يمسّ ملفّات الصور.
 *
 * لماذا دلو `images` لا دلوٌ جديد: أرشيف الأخبار كلّه مرفوعٌ فيه أصلًا تحت
 * `news/` و`news/gallery/`، وروابطه منشورةٌ في الخارج. فدلوٌ جديد يعني أرشيفًا
 * في مكانٍ وجديدًا في مكان — وانقسامًا لا يُصلحه شيء بعد حين.
 *
 * وعمود `image_url` يحفظ **الرابط الكامل** لا المسار (هكذا وُضع منذ V1، وV1 الحيّ
 * يقرؤه كما هو). فالمسار يُشتقّ من الرابط عند الحذف — انظر `pathFromUrl`.
 */
import "server-only";
import { NEWS_BUCKET } from "./bucket";

export { NEWS_BUCKET };

/** بادئتان تحت الدلو: غلافٌ واحد للخبر، وصورٌ كثيرة لمعرضه. */
export const coverPrefix = (newsId: string) => `news/${newsId}/cover`;
export const galleryPrefix = (newsId: string) => `news/${newsId}/gallery`;
export const newsPrefix = (newsId: string) => `news/${newsId}`;

/** الصيغ المقبولة — الحارس الأوّل قبل أن يُصكّ رابط رفع. الدلو نفسه يقبل هذه وحدها. */
export const IMAGE_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

/** سقف الدلو نفسه ٥ م.ب — يُذكر هنا ليردّ الرفعة الخاطئة برسالةٍ مفهومة لا بخطأ خام. */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const BAD_MIME = "صيغة غير مدعومة — استخدم WEBP أو JPG أو PNG.";
export const TOO_BIG = "الصورة أكبر من ٥ م.ب — اضغطها أو صدّرها WEBP.";

/** مفتاحٌ فريد لكلّ رفعة: الاسم لا يُشتقّ من اسم الملفّ الأصليّ (قد يكون عربيًّا أو مكرّرًا). */
export const coverKey = (newsId: string, ext: string) =>
  `${coverPrefix(newsId)}/${crypto.randomUUID()}.${ext}`;
export const galleryKey = (newsId: string, ext: string) =>
  `${galleryPrefix(newsId)}/${crypto.randomUUID()}.${ext}`;

/**
 * المسار داخل الدلو من رابطٍ عامّ كامل — أو `null` إن كان الرابط خارجيًّا.
 *
 * أرشيف V1 يحمل روابط `…/storage/v1/object/public/images/news/1778326806595-18hjpx.jpg`،
 * والجديد يحمل `…/images/news/{id}/cover/{uuid}.webp`. كلاهما يُقشَّر بالقاعدة نفسها.
 * وما ليس من الدلو (رابطٌ لُصق من الخارج) لا يُحذف — ليس ملكنا.
 */
export function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${NEWS_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const raw = url.slice(at + marker.length).split("?")[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
