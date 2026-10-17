import { Container } from "@adeeb/design-system";
import { emailKindEntries, emailKindOf } from "@/lib/email/kinds";
import { asSeenIn, renderLayout, type EmailContent, type FontView } from "@/lib/email/layout";
import { catalogEntries } from "@/lib/notifications/catalog";
import { renderNoteEmail } from "@/lib/notifications/render";
import EmailLooksView, { type MailRow } from "./EmailLooksView";

/**
 * **بريدُ أدِيب** — كلُّ رسالةٍ يرسلها أدِيب بثوبها «ديبو» (`lib/email/layout.ts`، اعتمده محمد ٢٠٢٦-١٠-١٧)،
 * مرسومةً بعيّنتها كما تخرج حرفًا بحرف، في إطارٍ معزولٍ لا تبلغه أوراقُ الموقع كما يعزلها صندوقُ البريد.
 *
 * وفيها **بريدُ الإشعارات** واحدًا واحدًا: كلُّ مخاطَبٍ في دليل الإشعارات قال `email: true`، مرسومًا
 * بالدالّة التي يرسل بها الموزِّع (`renderNoteEmail`)، فما يُرى هنا هو ما يصل.
 *
 * ومعها مبدّلان: عرضُ الشاشة، وبرنامجُ البريد بخطّه (`asSeenIn`)، فالخطُّ لا نملكه.
 */

export const metadata = { title: "بريد أدِيب، معرض أدِيب" };

const FONTS: FontView[] = ["adeeb", "desktop", "phone"];

/** الأكثرُ وصولًا أوّلًا: رمزُ الدخول والاستعادة يراهما كلُّ عضو. */
const ORDER = ["auth.code", "auth.recovery", "contact.reply"];

function row(key: string, when: string, c: EmailContent): MailRow {
  const html = renderLayout(c).html;
  return { key, when, subject: c.subject, html: Object.fromEntries(FONTS.map((f) => [f, asSeenIn(html, f)])) as MailRow["html"] };
}

export default function EmailsLab() {
  const note = emailKindOf("notify.note")!;

  const direct = emailKindEntries()
    .filter(([key]) => key !== "notify.note")
    .sort(([a], [b]) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))
    .map(([key, kind]) => {
      return row(key, kind.when, kind.render(kind.sample));
    });

  const notes = catalogEntries().flatMap(([key, kind]) =>
    kind.audiences
      .filter((a) => a.email)
      .map((a) => {
        return row(`${key} / ${a.key}`, kind.when, note.render(renderNoteEmail(key, a.key, kind.sample, "male", "محمد إسماعيل المطر")));
      }),
  );

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Mail</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">بريدُ أدِيب</h1>
        <p className="mt-2 max-w-3xl text-content-muted">
          كلُّ رسالةٍ يرسلها أدِيب كما تصل: ديبو يقدّمها بمزاجها، والعنوانُ في فقاعة كلامه مع الجهة المسؤولة،
          ثمّ البياناتُ سطورًا، وزرٌّ واحد، وتوقيعُ الجهة.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-content-muted">
          والخطُّ لا نملكه: برنامجُ البريد يقرّر. فاختر البرنامجَ لترى الرسالةَ بالخطّ الذي يظهر فيه. وعلى
          أندرويد يظهر خطُّ الجهاز العربيّ، وهو قريبٌ من خيار «تطبيق Gmail على الآيفون».
        </p>
        <EmailLooksView groups={[{ title: "رسائلُ الحساب والتواصل", rows: direct }, { title: "بريدُ الإشعارات", rows: notes }]} />
      </Container>
    </main>
  );
}
