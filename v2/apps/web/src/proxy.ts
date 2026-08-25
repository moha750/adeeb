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
  // و`g/` مثلُه: غرفةُ اللعب هويّتُها كوكيزُ اللاعب لا جلسةُ حساب، فلا تُقرأ الجلسةُ
  // فيها ولا تُستعمَل. وقاعةٌ فيها خمسون هاتفًا تنبض كلَّ ثوانٍ تعني خمسين نداءَ
  // مصادقةٍ لا يُنتفَع بواحدٍ منها.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|q/|g/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
