/**
 * **قياسُ طُرق الدخول** — المصدرُ الواحد لكتابة `signin_events` (قرار المالك ٢٠٢٦-١٠-٠٤).
 *
 * تبقى كلمةُ المرور ويُضاف الرمزُ إلى جانبها، ثمّ يُقارَن الطريقان بالأرقام: كم أُرسل رمز، وكم
 * دخل به، وكم فشل، وكم طُلبت استعادةُ كلمة مرور. وسجلُّ Supabase لا يحفظ إلّا يومًا ولا يرى
 * الفشل، فالقياسُ ههنا.
 *
 * **لا يعطّل شيئًا**: يُنادى ولا يُنتظَر، وخطؤه يُبتلع. قياسٌ سقط خيرٌ من دخولٍ تعثّر لأجله.
 */
/** أيُّ عميلٍ ينادي دوالَّ القاعدة — عميلُ المتصفّح في النماذج وعميلُ الخادم في بابِ العودة. */
type RpcClient = {
  rpc(
    fn: "log_signin_event",
    args: { p_method: string; p_outcome: string; p_place: string; p_detail: string | null },
  ): PromiseLike<unknown>;
};

export type SigninMethod = "password" | "code" | "google" | "apple";
export type SigninOutcome = "code_sent" | "success" | "fail" | "reset_requested";
export type SigninPlace = "login" | "booking" | "forgot" | "oauth";

export function logSignin(
  sb: RpcClient,
  method: SigninMethod,
  outcome: SigninOutcome,
  place: SigninPlace,
  detail?: string | null,
): void {
  void sb
    .rpc("log_signin_event", {
      p_method: method,
      p_outcome: outcome,
      p_place: place,
      p_detail: detail ? detail.slice(0, 80) : null,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}
