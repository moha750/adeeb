import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Next 16: اصطلاح "proxy" يحلّ محلّ "middleware" (نفس السلوك).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // يعمل على كل المسارات عدا الأصول الثابتة والصور (لتجديد الجلسة وحراسة اللوحة).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
