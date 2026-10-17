import { Container } from "@adeeb/design-system";
import { EMAIL_KINDS } from "@/lib/email/kinds";
import { renderLayout } from "@/lib/email/layout";

/**
 * **معاينةُ بريد التنبيه** — يُبنى من الدليل والثوب اللذين يرسم بهما مُرسِلُ البريد
 * (`lib/email/kinds.ts` · `lib/email/layout.ts`)، فما تراه هنا هو ما يصل صندوقَ البريد حرفًا بحرف.
 *
 * والحالُ المعروضةُ أسوأُ ما يقع: وجهةٌ بُدّلت إلى نطاقٍ يتشبّه باسم النادي.
 */

export const metadata = { title: "بريد تنبيه الوجهة، معرض أدِيب" };

const KIND = EMAIL_KINDS["qr.destination_changed"];
const CONTENT = KIND.render(KIND.sample);
const SAMPLE = { subject: CONTENT.subject, html: renderLayout(CONTENT).html };

export default function QrAlertMailLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Mail</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">بريدُ تنبيه الوجهة</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          هذا نصُّ البريد كما يصل: عنوانُه «{SAMPLE.subject}». ولا يُنقَر فيه رابطُ الوجهة
          الجديدة، فبريدٌ ينبّه من تصيّدٍ لا يضع رابطَ المُتصيَّد قابلًا للنقر.
        </p>
        <div className="mt-8 overflow-hidden rounded border border-line" dangerouslySetInnerHTML={{ __html: SAMPLE.html }} />
      </Container>
    </main>
  );
}
