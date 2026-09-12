import Link from "next/link";
import { Ambient, Container, LandingHeading } from "@adeeb/design-system";
import { SiteHeader } from "../../_components/SiteHeader";

/**
 * **بابُ الباركود حين لا يقود إلى شيء.**
 *
 * كان بابُ الرمز يردّ **٤٠٤ بلا جسد** (منفذُ طريقٍ لا صفحة)، فيرى الماسحُ صفحةَ المتصفّح
 * السوداء: «لا يمكن العثور على صفحة adeeb.club هذه». وذاك عطبٌ في عين من مسح ملصقًا،
 * لا رسالةٌ من نادٍ (رآها المالك ٢٠٢٦-٠٨-٣٠ بعد إيقاف باركود).
 *
 * فصار البابُ يحوّل إلى هذه الصفحة، وهي **بابٌ واحدٌ لثلاث حالات**: باركودٌ أُوقف،
 * وباركودٌ لا وجود له، وعطبٌ في القراءة. ووحدةُ البابِ مقصودة: من يجرّب الرموزَ لا
 * يُخبَر أنّه أصاب رمزًا موقوفًا، فلا يُستدَلّ على الموجود من المعدوم.
 */

export const metadata = {
  title: "الباركود غير متاح، أديب",
  description: "هذا الباركود لا يقود إلى وجهةٍ الآن.",
  robots: { index: false, follow: false },
};

export default function QrUnavailable() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="amb-host flex flex-1 items-center py-12">
        <Ambient />
        <Container className="max-w-2xl text-center">
          <LandingHeading
            eyebrow="الباركود"
            title="غير متاح"
            deck="هذا الباركود لا يقود إلى وجهةٍ الآن: قد يكون أُوقف، أو أنّ الملصق قديم. اسأل من أعطاك الباركود."
            align="center"
          />
          <div className="mt-8 flex justify-center">
            <Link href="/" className="abtn abtn-primary abtn-lg">تصفّح موقع أديب</Link>
          </div>
        </Container>
      </main>
    </div>
  );
}
