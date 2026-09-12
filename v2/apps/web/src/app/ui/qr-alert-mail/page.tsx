import { Container } from "@adeeb/design-system";
import { qrAlertMail } from "@/lib/qrAlertMail";

/**
 * **معاينةُ بريد التنبيه** — يُبنى من الوحدة نفسِها التي يقرؤها منفذُ الإرسال
 * (`lib/qrAlertMail`)، فما تراه هنا هو ما يصل صندوقَ البريد حرفًا بحرف.
 *
 * والحالُ المعروضةُ أسوأُ ما يقع: وجهةٌ بُدّلت إلى نطاقٍ يتشبّه باسم النادي.
 */

export const metadata = { title: "بريد تنبيه الوجهة، معرض أديب" };

const SAMPLE = qrAlertMail({
  link: { id: "sample", title: "ملصق الملتقى التعريفيّ", code: "majles" },
  ev: {
    old_value: "https://docs.google.com/forms/d/e/1FAIpQLSf/viewform",
    new_value: "https://adeeb-club-login.example.com/verify?u=1",
    at: "2026-09-04T18:41:00Z",
  },
  actor: "محمد إسماعيل المطر",
});

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
