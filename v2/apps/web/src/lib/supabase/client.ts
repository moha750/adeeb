import { createBrowserClient } from "@supabase/ssr";

/**
 * عميل Supabase للمتصفّح — يحفظ الجلسة في **الكوكيز** (لا localStorage)
 * كي يقرأها الخادم/الـmiddleware في SSR. يُستخدم في نماذج الدخول/الخروج.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
