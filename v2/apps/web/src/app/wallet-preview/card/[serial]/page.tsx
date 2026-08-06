import type { Metadata } from "next";
import { Alert, Container } from "@adeeb/design-system";
import { memberBySerial, modeOfSerial } from "../../demo";
import { getAllCards } from "../../store";
import { ScanView } from "./ScanView";

/**
 * **صفحةُ المسح** — وجهةُ الباركود المطبوع على البطاقة.
 *
 * هي النصفُ الذي كان ناقصًا في العرض: قبلها كان الختمُ زرًّا في حاسوب، وهي تُعيده إلى
 * موضعه الطبيعيّ — **بابُ الفعاليّة**. يفتح العضو بطاقته، ويمسحها مسؤولُ الحضور بجوّاله،
 * فتُفتَح هذه الصفحة ببطاقته وحالتِها، وضغطةٌ واحدة تختم وتدفع، فتتبدّل البطاقةُ في يده
 * وهو واقف.
 *
 * **علنيّةٌ بلا حساب** — كسائر هذا المجلّد، وبياناتُها وهميّة. وفي النظام الحقيقيّ هذه
 * أوّلُ صفحةٍ تُحرَس: قدرةُ ختمٍ وسجلٌّ يقول من ختم لمن ومتى.
 *
 * **ولا تُخزَّن**: الحالة تتغيّر مع كلّ مسح، وصفحةٌ محفوظةٌ تُري الماسحَ عددًا قديمًا.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "بطاقة عضو · معاينة أَدِيب",
  robots: { index: false, follow: false },
};

export default async function ScanPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;

  const decoded = decodeURIComponent(serial);
  const holder = memberBySerial(decoded);
  // **الرقمُ يقول أيَّ نظامٍ يخصّ** — فالصفحةُ واحدةٌ والنظامان يفترقان في أفعالها.
  const mode = modeOfSerial(decoded);

  // **رقمٌ مجهول ⇒ شاشةٌ صريحة لا صفحةُ ٤٠٤ العامّة.** من يمسح رمزًا عند بابٍ مزدحم
  // يحتاج جملةً تقول له ما العمل، لا صفحةَ خطأ. (و`notFound()` هنا يخرج بـ٢٠٠ على كلّ
  // حال: الصفحة ديناميّةٌ فيبدأ بثُّها قبل النداء، فلا يُغيَّر الرمز بعده.)
  if (!holder || !mode) {
    return (
      <main className="py-10">
        <Container>
          <div className="mx-auto max-w-md">
            <Alert tone="danger" title="هذه ليست بطاقةَ أديب">
              الرقم <b className="font-latin">{decodeURIComponent(serial)}</b> غير مسجَّل عندنا. تأكّد أنّك
              مسحتَ الرمز الموجود على بطاقة العضو في المحفظة.
            </Alert>
          </div>
        </Container>
      </main>
    );
  }

  // الحالةُ كلُّها لا حالةُ هذه البطاقة وحدها: المتابعُ يقرأ الجدول دفعةً، فتُمرَّر كما هي.
  return <ScanView holder={holder} mode={mode} initial={await getAllCards()} />;
}
