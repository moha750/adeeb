import { socialAuthError } from "@adeeb/core/auth-errors";
import * as AppleAuthentication from "expo-apple-authentication";

import { supabase } from "@/lib/supabase";

/**
 * الدخولُ بأبل — **أصيلًا لا بمتصفّح**.
 *
 * ولهذا الطريق فضيلةٌ قِيست لا تُظَنّ (٢٠٢٦-٠٨-١٨): إعدادُ Supabase يفعّل حاجزَ Turnstile
 * على مستوى GoTrue، فيردّ كلَّ دخولٍ بالبريد أو بكلمة المرور بلا رمزٍ من أيّ عميل.
 * وجُرّب `grant_type=id_token` فمرّ. فهذا البابُ يعمل بلا حاجزٍ ولا عرضٍ خفيّ يصكّ رمزًا.
 *
 * ونمرّر الرمزَ الذي تصكّه أبل إلى `signInWithIdToken`، فلا يمرّ بمتصفّحٍ ولا برابطٍ عميق.
 */

export type SignInResult = { ok: true } | { ok: false; message: string } | { ok: false; cancelled: true };

export async function signInWithApple(): Promise<SignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });


    if (!credential.identityToken) {
      return { ok: false, message: "لم تُصدِر أبل رمزًا. أعِد المحاولة." };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });


    if (error) {
      /**
       * خطّافُ القاعدة `hook_block_oauth_signup` يردّ من أخفى بريده، ورسالتُه من
       * `@adeeb/core` كي يقرأ الداخلُ من الجوّال ما يقرؤه الداخلُ من الموقع سواء.
       */
      return { ok: false, message: socialAuthError(error.message) ?? "تعذّر الدخول بأبل. أعِد المحاولة." };
    }

    return { ok: true };
  } catch (err) {
    // إلغاءُ المستخدِم ليس عطلًا فلا رسالةَ له
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "ERR_REQUEST_CANCELED") {
      return { ok: false, cancelled: true };
    }
    return { ok: false, message: "تعذّر الدخول بأبل. أعِد المحاولة." };
  }
}

/** الجهازُ يدعم الدخولَ بأبل؟ (أجهزةٌ قديمةٌ ومحاكياتٌ قد لا تدعمه) */
export const appleAvailable = AppleAuthentication.isAvailableAsync;
