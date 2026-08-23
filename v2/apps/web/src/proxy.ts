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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|q/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
