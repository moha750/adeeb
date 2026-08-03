import type { Metadata } from "next";
import { WalletPreview } from "./WalletPreview";

/**
 * **معاينة بطاقة الولاء** — صفحةٌ قائمةٌ بذاتها خارج اللوحة، ببياناتٍ وهميّة، تُعرَض على
 * الرعاة والمستثمرين ثمّ **تُحذف بمجلّدها**. لا قاعدةَ ولا قدرةَ ولا مساسَ بنظامٍ قائم:
 * كلُّ ما تحتاجه في `src/app/wallet-preview/` وحده.
 *
 * **علنيّةٌ بلا حساب** عمدًا — الرابط يُرسَل لمن يُعرَض عليه، وليس فيها ما يُحرَس (ولا
 * تُفهرَس: `robots` أدناه يمنعها من محرّكات البحث فلا تظهر معاينةٌ مكان الموقع).
 */
export const metadata: Metadata = {
  title: "معاينة بطاقة الولاء — أَدِيب",
  description: "معاينةُ بطاقة ولاء نادي أديب ونظامِ مكافآتها — ببياناتٍ وهميّة، للعرض قبل البناء.",
  robots: { index: false, follow: false },
};

export default function WalletPreviewPage() {
  return <WalletPreview />;
}
