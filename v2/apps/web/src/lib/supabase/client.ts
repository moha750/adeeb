import { createBrowserClient } from "@supabase/ssr";
import { previewAccess } from "./preview-access";

/**
 * عميل Supabase للمتصفّح — يحفظ الجلسة في **الكوكيز** (لا localStorage)
 * كي يقرأها الخادم/الـmiddleware في SSR. يُستخدم في نماذج الدخول/الخروج.
 */
export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // **أثناء المعاينة يقرأ المتصفّحُ بهويّة المُعايَن** (`preview-access.ts`): القاعدةُ والتخزينُ والدوالّ برمزه، والمصادقةُ بجلسة صاحبها
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const a = previewAccess();
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
          if (!a || url.includes("/auth/v1/")) return fetch(input, init);
          const headers = new Headers(init?.headers);
          headers.set("Authorization", `Bearer ${a.token}`);
          return fetch(input, { ...init, headers });
        },
      },
    },
  );
  // ومن سأل «من أنا؟» في المتصفّح أُجيب بالمُعايَن: الحجزُ والملفُّ يبنيان على معرّفه
  const realGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = (async (jwt?: string) => {
    const a = previewAccess();
    if (!a || jwt) return realGetUser(jwt);
    const res = await realGetUser();
    return res.data.user ? { ...res, data: { user: { ...res.data.user, id: a.userId } } } : res;
  }) as typeof client.auth.getUser;
  return client;
}
