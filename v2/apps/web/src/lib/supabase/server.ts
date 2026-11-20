import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { VIEW_AS_COOKIE } from "@/lib/view-as";
import { mintPreviewToken, previewSecret } from "@/lib/view-as-token";

/**
 * عميل Supabase الخادميّ (مكوّنات خادمية / Server Actions) — يقرأ الجلسة من كوكيز الطلب
 * ويكتب التحديثات عند توفّرها. في Next 15+ الدالة `cookies()` غير متزامنة.
 */
export async function createSessionClient() {
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

/**
 * **عميلُ الطلب: بجلسة صاحبها، أو بهويّة المُعايَن أثناء المعاينة** (٢٠٢٦-١١-٢٠). كلُّ ما في الموقع يكلّم القاعدةَ من هنا، فإذا كانت
 * المعاينةُ قائمةً (وجلسةُ صاحبها تملك قدرتَها) كلّمها برمزٍ قصيرٍ باسم المُعايَن (`lib/view-as-token.ts`)، فتعامله القاعدةُ كما
 * تعامله هو: صلاحياتُه وفلاترُه و`auth.uid()`. ويقول `auth.getUser()` و`getClaims()` و`getSession()` فيه إنّه هو.
 *
 * **وما يخصّ الجلسةَ نفسَها لا يُعار**: الدخولُ والخروجُ وكلمةُ المرور والبريدُ والحساباتُ المربوطة تبقى لصاحب الجلسة
 * (`createSessionClient`). وبلا سرّ التوقيع تعود المعاينةُ هويّةً في الموقع وحده كما كانت.
 */
export async function createClient() {
  const acting = await previewActing();
  if (!acting) return createSessionClient();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${acting.token}` } },
    },
  );
  const user = {
    id: acting.id, aud: "authenticated", role: "authenticated", email: acting.email ?? undefined,
    app_metadata: {}, user_metadata: {}, created_at: "",
  } as unknown as Awaited<ReturnType<typeof client.auth.getUser>>["data"]["user"];
  const session = {
    access_token: acting.token, token_type: "bearer", expires_in: 600,
    expires_at: Number(acting.claims.exp), refresh_token: "", user,
  } as unknown as Awaited<ReturnType<typeof client.auth.getSession>>["data"]["session"];
  // الهويّةُ تُقال بلا نداءٍ إلى خادم المصادقة: الرمزُ صنعناه، ولا جلسةَ له هناك
  client.auth.getUser = (async () => ({ data: { user }, error: null })) as typeof client.auth.getUser;
  client.auth.getSession = (async () => ({ data: { session }, error: null })) as typeof client.auth.getSession;
  client.auth.getClaims = (async () => ({ data: { claims: acting.claims, header: { alg: "HS256", typ: "JWT" }, signature: new Uint8Array() }, error: null })) as unknown as typeof client.auth.getClaims;
  return client;
}

/** المُعايَنُ ورمزُه، أو `null` بلا معاينةٍ أو بلا سرّ. كوكي المعاينة أوّلًا، فلا كلفةَ على من لا يعاين */
const previewActing = cache(async function previewActing(): Promise<{ id: string; email: string | null; token: string; claims: Record<string, unknown> } | null> {
  if (!previewSecret()) return null;
  if (!(await cookies()).get(VIEW_AS_COOKIE)?.value) return null;
  // استيرادٌ عند الحاجة: `lib/auth` يقرأ الجلسةَ من هذا الملفّ (`createSessionClient`)، فلا دورةَ في التحميل
  const { getCurrentAdmin } = await import("@/lib/auth");
  const admin = await getCurrentAdmin();
  if (!admin?.viewAs) return null;
  const minted = mintPreviewToken({ id: admin.id, email: admin.email ?? null }, admin.viewAs.realId);
  return minted ? { id: admin.id, email: admin.email ?? null, ...minted } : null;
});

/** رمزُ المعاينة لمتصفّح صاحبها (`ViewAsBar`)، أو `null` بلا معاينة. لا يُعطى إلّا لجلسةٍ تملك قدرتَها (`previewActing`) */
export async function previewBrowserAccess(): Promise<{ token: string; exp: number; userId: string } | null> {
  const a = await previewActing();
  return a ? { token: a.token, exp: Number(a.claims.exp), userId: a.id } : null;
}
