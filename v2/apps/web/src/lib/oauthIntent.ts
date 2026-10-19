/**
 * **نيّةُ الضاغط على قوقل أو أبل** — أدخولٌ أم إنشاء؟ (قرار المالك ٢٠٢٦-١٠-١٨)
 *
 * بوّابةُ أدِيب (`/login`) تُدخل من له حسابٌ وحده، وإنشاءُ الحساب بابُه `/signup` وحده.
 * والمزوّدُ واحدٌ في البابين، فالنيّةُ تعبر في رابط العودة (`intent`) ومعها علامةُ الوقت
 * (`markLoginOAuth`)، ويحكم بها `/auth/callback`.
 */
export type AuthIntent = "login" | "signup";
export type OAuthProvider = "google" | "apple";

export const LOGIN_OAUTH_COOKIE = "adeeb_login_oauth";

/** رمزُ «لا حسابَ لك» يعبر من بابِ العودة إلى البوّابة في `?e=`. */
export const NO_ACCOUNT = "adeeb_no_account";

export const PROVIDER_NAME: Record<OAuthProvider, string> = { google: "قوقل", apple: "أبل" };

export const isProvider = (v: string | null | undefined): v is OAuthProvider => v === "google" || v === "apple";

/** خطأُ الرمز لمن لا حسابَ له حين يُمنع الإنشاء (`shouldCreateUser: false`). */
export function isNoAccountError(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes("signups not allowed") || m.includes("otp_disabled") || m.includes("user not found");
}

/** البريدُ يعبر من البوّابة إلى صفحة الإنشاء في ذاكرة الجلسة لا في الرابط. */
export const SIGNUP_EMAIL_KEY = "adeeb_signup_email";
