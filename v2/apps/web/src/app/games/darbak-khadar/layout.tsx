import type { Metadata } from "next";
import { shareOg } from "@/lib/share";

/**
 * **تخطيطُ «دربك خضر» — هويّةٌ منعزلةٌ كالمحطّة** (القاعدة ١ في `DESIGN-RULES.md`،
 * ونطاقُها `/games/darbak-khadar/*` بكلمة المالك ٢٠٢٦-٠٩-٢٤).
 *
 * فلا رأسَ للموقع ولا تذييل، **واسمُ النادي في موضعين لا ثالثَ لهما** (قرارُ المالك
 * ٢٠٢٦-٠٩-٢٤): سطرُ «من إنتاج وتشغيل نادي أدِيب» أسفلَ اللوحة واللعبة، وزرُّ الحفظ بالحساب في
 * اللعبة. فلا في العنوان، ولا في أيقونة التبويب (مصّاصُ اللعبة)، ولا في شاشة البدء (`BootSplash` يتنحّى
 * هنا)، ولا في سنّ المؤشّر (`SiteCursor` يُسقط الريشةَ كما في المحطّة).
 * وتوسّعت بكلمته (٢٠٢٦-٠٩-٢٥) مع تبويبات الصفحة: زرُّ الحفظ في «حسابي» أيضًا، وقناةُ الدعم
 * موقعُ النادي وبريدُه، وسطرُ الصانع رابطٌ إلى موقع النادي. **وبطاقةُ الرابط** صارت إعلانَ النادي
 * نفسَه بشعاره وحساباته (اختيارُه ٢٠٢٦-٠٩-٢٥)، واسمُ الموقع فيها «دربك خضر». ولا غيرُ ذلك.
 *
 * **والضوءُ من الجهاز:** ليلٌ إن كان الجهازُ داكنًا ونهارٌ إن كان فاتحًا. ويُقرأ بسطرٍ
 * يسبق رسمَ المحتوى (الجذرُ مفتوحٌ حين يجري، وما بعده لم يُرسَم بعد)، فلا تومض
 * الصفحةُ ليلًا ثمّ تنقلب نهارًا. والخادمُ لا يعرف الجهاز، فيكتب الليلَ افتراضًا
 * ويُسكَت تحذيرُ الترطيب على هذه السمة وحدها.
 */
export const metadata: Metadata = {
  title: "دربك خضر",
  description: "لعبةُ عَدْوٍ لليوم الوطنيّ في جوّالك: اجمع أكوابَ oos واسبق إلى رأس اللوحة، والجوائزُ برعاية مقهى oos.",
  openGraph: shareOg({
    title: "دربك خضر",
    description: "العب في جوّالك، واسبق إلى رأس لوحة الصدارة.",
    siteName: "دربك خضر",
    images: [{ url: "/share/darb.jpg", width: 1200, height: 630, alt: "دربك خضر" }],
    type: "website",
  }),
};

const SKY =
  "try{var r=document.currentScript.parentElement;" +
  "r.setAttribute('data-sky',matchMedia('(prefers-color-scheme: light)').matches?'day':'night')}catch(e){}";

export default function DarbLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="drb drba drb-root" data-sky="night" data-cursor-ink suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: SKY }} />
      {children}
    </div>
  );
}
