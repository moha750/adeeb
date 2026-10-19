/**
 * **ردُّ المُرسِل على ردّنا** (٢٠٢٦-١٠-١٩) — كيف يعود البريدُ إلى صندوق أدِيب لا إلى Gmail النادي.
 *
 * ردُّنا يخرج و«ردَّ على هذا البريد» فيه (`reply_to`) عنوانٌ خاصٌّ بالرسالة: `r+<معرّفها>@<نطاق الاستقبال>`.
 * فإذا ردَّ المُرسِل وصل ردُّه Resend (سجلُّ MX لنطاق الاستقبال)، فطرق `/api/email/inbound`، فعرفنا من العنوان
 * أيَّ رسالةٍ يتبع، فكُتب دورًا في محادثتها. والمعرّفُ UUID لا يُخمَّن، فلا يدسّ أحدٌ كلامًا في محادثة غيره.
 *
 * **ونطاقُ الاستقبال مفتاحٌ في البيئة** (`CONTACT_REPLY_DOMAIN`): ما لم يُضبط بقي «ردَّ على هذا البريد» بريدَ
 * النادي كما كان، فلا يُرسَل عنوانٌ لا يستقبل بعدُ فترتدّ ردودُ الناس.
 */
import { CLUB_EMAIL } from "@/lib/clubContact";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

export function replyDomain(): string | null {
  const d = process.env.CONTACT_REPLY_DOMAIN?.trim().toLowerCase();
  return d && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) ? d : null;
}

/** عنوانُ «ردَّ على هذا البريد» لرسالة تواصل: خاصٌّ بها إن ضُبط نطاقُ الاستقبال، وإلّا بريدُ النادي. */
export function replyAddressFor(messageId: string, domain: string | null = replyDomain()): string {
  return domain && UUID.test(messageId) ? `r+${messageId.toLowerCase()}@${domain}` : CLUB_EMAIL;
}

/** أيُّ رسالةٍ يتبعها البريدُ الوارد؟ من أوّل عنوانٍ بصيغة `r+<معرّف>@<نطاقنا>` بين المستلمين. */
export function messageIdFrom(recipients: readonly string[], domain: string | null = replyDomain()): string | null {
  if (!domain) return null;
  for (const raw of recipients) {
    // «الاسم <العنوان>» أو العنوانُ وحده
    const addr = (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim().toLowerCase();
    const at = addr.lastIndexOf("@");
    if (at < 0 || addr.slice(at + 1) !== domain) continue;
    const local = addr.slice(0, at);
    const m = local.match(new RegExp(`^r\\+(${UUID.source})$`));
    if (m) return m[1];
  }
  return null;
}

/**
 * **نصُّ الردّ وحده بلا ما اقتبسه برنامجُ بريده** — كلُّ برنامجٍ يُلحق رسالتَنا تحت ردّه. يُقطَع النصُّ عند
 * أوّل سطرٍ يفتتح الاقتباس: «On … wrote:» وأخواتها بالعربيّة، أو ترويسةُ «From:/من:»، أو «-----Original
 * Message-----»، أو سطرٌ يبدأ بـ`>`. وإن لم يبقَ شيءٌ أُخذ النصُّ كلُّه: كلامٌ زائدٌ خيرٌ من ردٍّ ضائع.
 */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const opener = [
    /^\s*On\b.+\bwrote:\s*$/i,
    /^\s*(?:في|بتاريخ)\s.+\s(?:كتب|كتبت)(?=[\s:]|$).*$/,  // `\b` لا يعرف الحرفَ العربيّ
    /^\s*-{2,}\s*(?:Original Message|Forwarded message|الرسالة الأصلية)\s*-{2,}\s*$/i,
    /^\s*(?:From|من)\s*:\s.+$/i,
    /^\s*>/,
  ];
  let cut = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (opener.some((re) => re.test(lines[i]))) { cut = i; break; }
  }
  // «On …» قد ينكسر سطرين في Gmail: السطرُ قبل «wrote:» من الاقتباس أيضًا
  if (cut < lines.length && /^\s*wrote:\s*$/i.test(lines[cut] ?? "") && cut > 0) cut -= 1;
  const kept = lines.slice(0, cut).join("\n").trim();
  return kept || text.trim();
}
