import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * عميل Supabase الخادميّ (مكوّنات خادمية / Server Actions) — يقرأ الجلسة من كوكيز الطلب
 * ويكتب التحديثات عند توفّرها. في Next 15+ الدالة `cookies()` غير متزامنة.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // استُدعيت من مكوّن خادميّ (لا يُسمح بالكتابة) — الـmiddleware يتكفّل بتجديد الجلسة.
          }
        },
      },
    },
  );
}
