import { Container } from "@adeeb/design-system";
import { emailKindEntries } from "@/lib/email/kinds";
import { LOOKS, renderLook, type FontView } from "@/lib/email/looks";
import EmailLooksView, { type MailRow } from "./EmailLooksView";

/**
 * **بريدُ أدِيب: الوجهان** — مرحلةُ التصميم في `v2/EMAIL-SYSTEM.md` (٢٠٢٦-١٠-١٧).
 *
 * كلُّ نوعٍ في دليل البريد (`lib/email/kinds.ts`) مرسومًا بعيّنته في الوجهين (`lib/email/looks.ts`)،
 * جنبًا إلى جنب، بعرض الحاسوب أو الجوّال. فما يُرى هنا هو الرسالةُ نفسُها حرفًا بحرف، في إطارٍ معزولٍ
 * لا تبلغه أوراقُ الموقع، كما يعزلها صندوقُ البريد.
 */

export const metadata = { title: "بريد أدِيب: الوجهان، معرض أدِيب" };

/** الخطوطُ الثلاثة التي قد تُقرأ بها الرسالة (`FontView` في `looks.ts`). */
const FONTS: FontView[] = ["adeeb", "desktop", "phone"];

/** الأكثرُ وصولًا أوّلًا: رمزُ الدخول والاستعادة يراهما كلُّ عضو. */
const ORDER = ["auth.code", "auth.recovery", "notify.note", "contact.reply"];

export default function EmailLooksLab() {
  const rows: MailRow[] = emailKindEntries()
    .sort(([a], [b]) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))
    .map(([key, kind]) => {
      const content = kind.render(kind.sample);
      return {
        key,
        when: kind.when,
        subject: content.subject,
        html: Object.fromEntries(
          FONTS.map((f) => [f, { band: renderLook(content, "band", f), letter: renderLook(content, "letter", f) }]),
        ) as MailRow["html"],
      };
    });

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Mail</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">بريدُ أدِيب: الوجهان</h1>
        <p className="mt-2 max-w-3xl text-content-muted">
          كلُّ رسالةٍ يرسلها أدِيب في وجهين، لتختار واحدًا يلبسه البريدُ كلُّه. «{LOOKS.band.name}»: {LOOKS.band.idea}{" "}
          «{LOOKS.letter.name}»: {LOOKS.letter.idea}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-content-muted">
          والخطُّ لا نملكه: برنامجُ البريد يقرّر. فاختر البرنامجَ لترى الرسالةَ بالخطّ الذي يظهر فيه. وعلى
          أندرويد يظهر خطُّ الجهاز العربيّ، وهو قريبٌ من خيار «تطبيق Gmail على الآيفون».
        </p>
        <EmailLooksView rows={rows} names={{ band: LOOKS.band.name, letter: LOOKS.letter.name }} />
      </Container>
    </main>
  );
}
