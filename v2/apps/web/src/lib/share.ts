import type { Metadata } from "next";

/**
 * **صورةُ الرابط — مصدرٌ واحد.**
 *
 * كلُّ رابطٍ يُنشَر من أدِيب يحمل هذه الصورةَ نفسَها: لا غلافَ خبرٍ ولا شعارَ
 * برنامجٍ ولا صفحةَ كتاب. قرارُ المالك 2026-09-12.
 *
 * ولِمَ دالّةٌ لا ملفُّ `app/opengraph-image.png` الاصطلاحيّ؟ لأنّ دمجَ الوسوم في
 * Next **سطحيّ**: صفحةٌ تُعلن `openGraph` تستبدل كتلةَ الجذر كاملةً، فتسقط معها
 * الصورةُ الاصطلاحيّة ويخرج الرابطُ عاريًا. فالصورةُ تُحقَن هنا مرّةً، وكلُّ
 * صفحةٍ تلفّ كتلتَها بـ`shareOg` فتنالها بلا أن تُعيد كتابةَ مسارها.
 */
export const SHARE_IMAGE = {
  url: "/brand/share.png",
  width: 1200,
  height: 630,
  alt: "نادي أَدِيب",
} as const;

type OpenGraph = NonNullable<Metadata["openGraph"]>;

/** يلفّ كتلةَ `openGraph` للصفحة فيزيدها صورةَ أدِيب واسمَ الموقع ولغتَه. */
export function shareOg<T extends OpenGraph>(og: T) {
  return {
    siteName: "نادي أَدِيب",
    locale: "ar_SA",
    ...og,
    images: [SHARE_IMAGE],
  };
}
