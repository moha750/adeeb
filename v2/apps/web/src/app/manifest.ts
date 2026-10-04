import type { MetadataRoute } from "next";
import { color } from "@adeeb/design-system/tokens";

/**
 * **بيانُ التطبيق** — به يصير الموقعُ تطبيقًا يُثبَّت على الشاشة الرئيسيّة (٢٠٢٦-١٠-٠٣).
 *
 * - **يبدأ من `/dashboard`** لا من الصدر: المثبِّتُ صاحبُ حسابٍ جاء لشأنه لا زائرٌ يُعرَّف بالنادي.
 *   وبابُ اللوحة يفرز الثلاثة بنفسه: الغائبُ إلى الدخول ثمّ يعود، وصاحبُ الحساب غيرُ العضو
 *   إلى `/me`، والعضوُ إلى غرفه. فعنوانٌ واحدٌ يخدمهم جميعًا بلا منطقٍ جديد.
 * - **`id` ثابت**: به يعرف المتصفّحُ أنّ التطبيق هو هو ولو تبدّل `start_url` يومًا.
 * - **اللونان من الرموز** (`tokens.ts` مرآةُ `tokens.css`) لا محفوران: الكحليُّ ٧٠٠ سطحُ
 *   شاشة البدء في أندرويد ولونُ شريط الحالة، وعليه تقع الأيقونةُ بتدرّجها نفسِه.
 * - الأيقوناتُ يولّدها `scripts/pwa-icons.mjs` من `app/icon.svg`. وأيقونةُ آيفون
 *   `app/apple-icon.png` (يقرؤها سفاري من وسم الصفحة لا من هذا البيان).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "نادي أَدِيب",
    short_name: "أَدِيب",
    description: "بوّابةُ أَدِيب: عضويّتُك وتطوّعُك وحجوزاتُك وإشعاراتُ النادي في جيبك.",
    lang: "ar",
    dir: "rtl",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: color.navy[700],
    theme_color: color.navy[700],
    categories: ["education", "social"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
