import { createClient } from "@/lib/supabase/client";
import { markLoginOAuth } from "@/app/auth/actions";
import type { AuthIntent, OAuthProvider } from "@/lib/oauthIntent";

/**
 * معاملاتُ كلّ مزوّد. **قوقل: اختيارُ الحساب لا آخرُ حسابٍ دخل** — أكثرُ أعضائنا لهم أكثرُ من
 * حساب قوقل في المتصفّح، وبلا هذا يمرّرهم قوقل بالأخير صامتًا. **ولا `prompt` لأبل**: لا تعرفه،
 * ومعاملٌ لا تعرفه قد يُردّ `invalid_request`.
 */
const PARAMS: Record<OAuthProvider, Record<string, string> | undefined> = {
  google: { prompt: "select_account" },
  apple: undefined,
};

/**
 * **الخروجُ إلى المزوّد — المصدرُ الواحد** لأزرار البابين ولزرّ «أنشئ حسابك بقوقل» في البوّابة.
 * يعيد رسالةَ الخطأ إن لم يغادر، و`null` إن غادر.
 */
export async function startOAuth(provider: OAuthProvider, next: string, intent: AuthIntent): Promise<string | null> {
  try {
    if (intent === "login") await markLoginOAuth();
  } catch {
    // العلامةُ لم تُكتب: يمضي الدخولُ، ويعامله بابُ العودة معاملةَ من لا علامةَ له (لا يُمحى حساب)
  }
  const { error } = await createClient().auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}&via=${provider}&intent=${intent}`,
      queryParams: PARAMS[provider],
    },
  });
  return error ? error.message : null;
}
