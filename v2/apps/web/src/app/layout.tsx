import type { Metadata } from "next";
// خطوط ورموز علامة أديب (المصدر الوحيد) ثم أنماط التطبيق ثمّ مكتبة المكوّنات المشتركة.
// components.css يُحمَّل أخيرًا ليكون هو المصدر الفائز لأصناف المكوّنات (يظلّل نسخ globals القديمة).
import "@adeeb/design-system/fonts.css";
import "@adeeb/design-system/tokens.css";
import "./globals.css";
import "@adeeb/design-system/components.css";
import { BootSplash } from "./_components/BootSplash";
import { IconDefaults } from "./_components/IconDefaults";
import { SiteCursor } from "./_components/SiteCursor";

// `metadataBase` أصلُ كلّ رابطٍ نسبيّ في الوسوم (OG وcanonical وrobots) — بدونه تُبنى
// روابط OG نسبيّةً فلا تُقرأ خارج الموقع. والنطاق من البيئة ليبقى صحيحًا في المعاينات.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adeeb.club";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  // بلا `template`: الصفحات تكتب لاحقتها بنفسها («… — أديب») فلا تتكرّر اللاحقة مرّتين.
  title: "نادي أَدِيب",
  description: "نادٍ ثقافيّ إبداعيّ بجامعة الملك فيصل — أنشطةٌ وورشٌ وإصداراتٌ ومجتمعٌ من المبدعين.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        {/* suppressHydrationWarning على <html> أعلاه: هذا السكربت يضيف class="js" قبل ترطيب React
            (لتفعيل حركات .js [data-reveal])، فتختلف سمة <html> بين الخادم والعميل. الخاصّية تُسكِت
            تحذير سمات <html> وحدها لا شجرتها — فلا تُخفى تعارضاتٌ حقيقيّة أخرى. */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        {/* شاشةُ البدء **قبل** المحتوى: تُرسَم خادميًّا فتظهر مع أوّل بايت، وتنزاح حين
            يجهز الموقع. وهي غير `loading.tsx` — تلك للتنقّل داخل الموقع لا للدخول إليه.
            وموضعُها بعد سكربت `js` مباشرةً: الصنفُ شرطُ ظهورها (حارسُ «بلا جافاسكربت»). */}
        <BootSplash />
        {/* وزنُ الأيقونات يُعلَن مرّةً للموقع كلّه — انظر `IconDefaults` */}
        <IconDefaults>{children}</IconDefaults>
        {/* مؤشّرُ أديب — طبقةٌ واحدةٌ للموقع كلِّه، **بعد** المحتوى فتعلوه بلا `z-index`
            يُنازَع عليه. وهي `pointer-events: none` فلا تحجب نقرةً ولا تمنع تحديدًا. */}
        <SiteCursor />
      </body>
    </html>
  );
}
