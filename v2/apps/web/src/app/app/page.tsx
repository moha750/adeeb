import "@adeeb/design-system/ad.css";
import type { Metadata } from "next";
import { Footer } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { getSessionAdmin } from "@/lib/auth";
import { shareOg } from "@/lib/share";
import { AppRoom } from "@/app/_ad/rooms/AppRoom";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adeeb.club";
const TITLE = "تطبيق أَدِيب";
const SHARE = "أدِيب على جوّالك بلا متجرٍ ولا تحميل، وما يخصّك يصلك إشعارًا.";

export const metadata: Metadata = {
  title: `${TITLE}، نادي أَدِيب`,
  description: SHARE,
  openGraph: shareOg({ type: "website", title: TITLE, description: SHARE }),
};

/**
 * **رابطُ الإعلان عن التطبيق** — `adeeb.club/app` (٢٠٢٦-١٠-٠٣)، **أُعيد بناؤه على رحلة زائره** (`AppRoom`، اعتمده محمد ١١-٢٤).
 *
 * للنشر في القروبات والحسابات: يقول ما يأخذه الزائر، ثمّ خطوتَه بحسب جهازه — آيفون مرحلتان، وأندرويد التفعيلُ والتثبيت،
 * والحاسوبُ رمزٌ يُمسح بالجوّال، ومن فتح الرابطَ داخل تطبيقٍ آخر يُقال له أن يفتحه في متصفّحه.
 *
 * ⚠️ **لا تُنشر قبل اكتمال إشعارات المتطوّعين والأصدقاء** (محمد ١١-٢٤): «ما يخصّك يبلغك» وعدٌ للجميع.
 * والجلسةُ تُسأل كي يُدعى غيرُ الداخل إلى الدخول خطوةً أولى (الإشعارُ لحسابٍ لا لجهاز).
 */
export default async function AppPage() {
  const me = await getSessionAdmin();
  return (
    <>
      <SiteHeader />
      <main className="ad-pub">
        <div className="ad-pub-wrap">
          <AppRoom signedIn={Boolean(me)} url={`${SITE}/app`} />
        </div>
      </main>
      <Footer />
    </>
  );
}
