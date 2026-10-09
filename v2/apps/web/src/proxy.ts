import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Next 16: اصطلاح "proxy" يحلّ محلّ "middleware" (نفس السلوك).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // يعمل على كل المسارات عدا الأصول الثابتة والصور (لتجديد الجلسة وحراسة اللوحة).
  //
  // و`q/` مستثنًى معها: بابُ الرمز الديناميكيّ يقع في طريق كاميرا الزائر، وماسحُه
  // مجهولٌ بطبيعته فلا جلسةَ تُجدَّد له. وتركُه هنا يُقحم نداءَ مصادقةٍ في كلّ مسحة.
  //
  // و`logout` مستثنًى: بابُ الخروج يمحو كوكيزَ الجلسة على استجابةِ تحويلٍ يبنيها بنفسه،
  // والحارسُ قد يجدّد الرمزَ ويكتب كوكيزَه على الطلب نفسِه — فيتنازعان على المحو. ولا
  // شأنَ للحارس به أصلًا: لا جلسةَ تُجدَّد لمن هو خارج.
  // و`sw.js` و`service-worker.js` و`manifest.webmanifest` مستثناةٌ (٢٠٢٦-١٠-٠٣): ملفّاتٌ ثابتة
  // يطلبها المتصفّح بنفسه (فحصُ تحديث العامل عند التنقّل، والبيانُ عند التثبيت) ولا جلسةَ تعنيها.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|q/|logout$|sw\\.js$|service-worker\\.js$|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
