import type { Metadata } from "next";
import { shareOg } from "@/lib/share";

/**
 * **تخطيطُ «ركضة وطن» — هويّةٌ منعزلةٌ كالمحطّة** (القاعدة ١ في `DESIGN-RULES.md`،
 * ونطاقُها `/watan/*` بكلمة المالك ٢٠٢٦-٠٩-٢٤).
 *
 * فلا رأسَ للموقع ولا تذييل، **واسمُ النادي في موضعين لا ثالثَ لهما** (قرارُ المالك
 * ٢٠٢٦-٠٩-٢٤): سطرُ «من تصميم نادي أدِيب» أسفلَ اللوحة واللعبة، وزرُّ الحفظ بالحساب في
 * اللعبة. فلا في العنوان، ولا في بطاقة الرابط (اسمُ الموقع فيها «ركضة وطن» وصورتُها مشهدُ
 * اللعبة)، ولا في أيقونة التبويب (مصّاصُ اللعبة)، ولا في شاشة البدء (`BootSplash` يتنحّى
 * هنا)، ولا في سنّ المؤشّر (`SiteCursor` يُسقط الريشةَ كما في المحطّة).
 *
 * **والضوءُ من الجهاز:** ليلٌ إن كان الجهازُ داكنًا ونهارٌ إن كان فاتحًا. ويُقرأ بسطرٍ
 * يسبق رسمَ المحتوى (الجذرُ مفتوحٌ حين يجري، وما بعده لم يُرسَم بعد)، فلا تومض
 * الصفحةُ ليلًا ثمّ تنقلب نهارًا. والخادمُ لا يعرف الجهاز، فيكتب الليلَ افتراضًا
 * ويُسكَت تحذيرُ الترطيب على هذه السمة وحدها.
 */
export const metadata: Metadata = {
  title: "ركضة وطن",
  description: "لعبةُ عَدْوٍ لليوم الوطنيّ في جوّالك: اجمع الحروفَ والمصّاص، واسبق إلى رأس اللوحة.",
  openGraph: shareOg({
    title: "ركضة وطن",
    description: "العب في جوّالك، واسبق إلى رأس لوحة الصدارة.",
    siteName: "ركضة وطن",
    images: [{ url: "/share/watan.jpg", width: 1200, height: 630, alt: "ركضة وطن" }],
    type: "website",
  }),
};

const SKY =
  "try{var r=document.currentScript.parentElement;" +
  "r.setAttribute('data-sky',matchMedia('(prefers-color-scheme: light)').matches?'day':'night')}catch(e){}";

export default function WatanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wtn wtna wtn-root" data-sky="night" data-cursor-ink suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: SKY }} />
      {children}
    </div>
  );
}
