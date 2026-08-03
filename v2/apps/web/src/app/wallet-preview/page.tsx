import type { Metadata } from "next";
import { WalletPreview } from "./WalletPreview";
import { getAllCards } from "./store";

/**
 * **معاينة بطاقة الولاء** — صفحةٌ قائمةٌ بذاتها خارج اللوحة، ببياناتٍ وهميّة، تُعرَض على
 * الرعاة والمستثمرين ثمّ **تُحذف بمجلّدها**. لا قدرةَ ولا مساسَ بنظامٍ قائم: كلُّ ما
 * تحتاجه في `src/app/wallet-preview/` وجدولَي `wallet_preview_*` المؤقّتين.
 *
 * **علنيّةٌ بلا حساب** عمدًا — الرابط يُرسَل لمن يُعرَض عليه، وليس فيها ما يُحرَس (ولا
 * تُفهرَس: `robots` أدناه يمنعها من محرّكات البحث فلا تظهر معاينةٌ مكان الموقع).
 *
 * **والحالة تُقرأ من القاعدة خادميًّا** لا من `demo.ts`: البطاقة في جوّالك حيّةٌ تتحدّث،
 * فلو بدأت الصفحةُ من قيم البذرة لَاختلف ما تراه على الشاشة عمّا في جيبك.
 */
export const metadata: Metadata = {
  title: "معاينة بطاقة الولاء — أَدِيب",
  description: "معاينةُ بطاقة ولاء نادي أديب ونظامِ مكافآتها — ببياناتٍ وهميّة، للعرض قبل البناء.",
  robots: { index: false, follow: false },
};

// حالةٌ تتغيّر بكلّ ختم — لا تُخزَّن الصفحة مسبقًا.
export const dynamic = "force-dynamic";

export default async function WalletPreviewPage() {
  return <WalletPreview initial={await getAllCards()} />;
}
