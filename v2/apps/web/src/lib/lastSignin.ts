/**
 * **آخرُ طريقٍ دخل به صاحبُ هذا الجهاز** (قرار المالك ٢٠٢٦-١٠-١٨) — البوّابةُ بابُ من يعرف
 * الطريق، فتذكّره بطريقه: حبّةُ «آخر دخول» على زرّ المزوّد، أو تُفتح على الرمز إن كان به دخل.
 *
 * في ذاكرة المتصفّح وحده (لا يُرسَل ولا يُقرأ في الخادم)، وكلُّ قراءةٍ وكتابةٍ في `try`: نافذةٌ
 * خاصّة أو ذاكرةٌ محجوبة تُرجع لا شيء، والبوّابةُ تعمل بلا ذكرى كما كانت.
 */
export type SigninWay = "google" | "apple" | "password" | "code";

const KEY = "adeeb_last_signin";
const WAYS: readonly SigninWay[] = ["google", "apple", "password", "code"];

export function readLastSignin(): SigninWay | null {
  try {
    const v = localStorage.getItem(KEY);
    return WAYS.includes(v as SigninWay) ? (v as SigninWay) : null;
  } catch {
    return null;
  }
}

export function rememberSignin(way: SigninWay): void {
  try {
    localStorage.setItem(KEY, way);
  } catch {
    /* بلا ذاكرة: لا ذكرى، ولا يتعطّل شيء */
  }
}
