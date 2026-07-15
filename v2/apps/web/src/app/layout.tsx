import type { Metadata } from "next";
// خطوط ورموز علامة أديب (المصدر الوحيد) ثم أنماط التطبيق ثمّ مكتبة المكوّنات المشتركة.
// components.css يُحمَّل أخيرًا ليكون هو المصدر الفائز لأصناف المكوّنات (يظلّل نسخ globals القديمة).
import "@adeeb/design-system/fonts.css";
import "@adeeb/design-system/tokens.css";
import "./globals.css";
import "@adeeb/design-system/components.css";

export const metadata: Metadata = {
  title: "نادي أَدِيب",
  description: "نادٍ ثقافي إبداعي بجامعة الملك فيصل — النسخة الثانية",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        {children}
      </body>
    </html>
  );
}
