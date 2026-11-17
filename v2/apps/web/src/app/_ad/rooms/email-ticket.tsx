"use client";

/**
 * **تذكرةُ رسالة البريد من مصدرٍ واحد** (٢٠٢٦-١١-٠٧): شارتُها وسطورُها وكعبُها — يقرؤها كرتُها وسطرُها في سجلّ البريد
 * (`EmailLogRoom`) ورأسُ صفحتها (`EmailRecordRoom`، قالب «التذكرة المفتوحة») فلا تفترق الرسالةُ في القائمة عنها مفتوحة.
 * نُقلت من `EmailLogRoom.tsx` كما هي حرفًا.
 */
import { Buildings, Clock, EnvelopeSimple, EnvelopeSimpleOpen, Hourglass, UserCircle } from "@phosphor-icons/react";
import { ArrowUUpLeft, Prohibit, Warning } from "@/app/_components/glyphs";
import type { MailRow, MailStatus } from "@/app/dashboard/system/email/data";
import { AdBadge, type AdMeta, type AdStub, type AdTone } from "../primitives";
import { dayParts, fmtClock } from "../format";

export const MAIL_STATUS: Record<MailStatus, { label: string; tone: AdTone }> = {
  sent: { label: "خرجت", tone: "ok" },
  queued: { label: "تنتظر", tone: "warn" },
  sending: { label: "تخرج الآن", tone: "warn" },
  dead: { label: "تعثّرت", tone: "bad" },
  cancelled: { label: "أُلغيت", tone: "neutral" },
};
/**
 * **حالُ ما بعد الخروج يغلب «خرجت»** (خطّافُ Resend، ٢٠٢٦-١٠-١٩): «خرجت» تعني أنّ المزوّد قبلها، فإن قال بعدها
 * وصلت أو ارتدّت قيل ذلك مكانها.
 */
export const MAIL_DELIVERY: Record<NonNullable<MailRow["delivery"]>, { label: string; tone: AdTone }> = {
  delivered: { label: "وصلت", tone: "ok" },
  delayed: { label: "تتأخّر", tone: "warn" },
  bounced: { label: "ارتدّت", tone: "bad" },
  complained: { label: "عُدّت مزعجة", tone: "bad" },
};
const badgeOf = (m: MailRow) => (m.status === "sent" && m.delivery ? MAIL_DELIVERY[m.delivery] : MAIL_STATUS[m.status]);

/** الإعادةُ لما مات قبل الخروج، لا لرسالة مصادقة، ولا لعنوانٍ موقوف: تموت ثانيةً حتى يُرفع إيقافُه. */
export const canRetry = (m: MailRow) => m.status === "dead" && !m.auth && !m.suppressed;
export const pending = (m: MailRow) => m.status === "queued" || m.status === "sending";
export const returned = (m: MailRow) => m.delivery === "bounced" || m.delivery === "complained";

/** رمزُ حالها في شارتها: خرجت مغلقة، ووصلت مفتوحة، وتنتظر ساعةً رمليّة، وتعثّرت تحذيرًا، وارتدّت راجعة. */
const iconOf = (m: MailRow) =>
  returned(m) ? <ArrowUUpLeft /> : m.status === "dead" ? <Warning /> : pending(m) ? <Hourglass />
  : m.status === "cancelled" ? <Prohibit /> : m.delivery === "delivered" ? <EnvelopeSimpleOpen /> : <EnvelopeSimple />;

/** وقتُ الرسالة: خروجُها إن خرجت، وإلّا كتابتُها — كما كان سطرُ «متى» في الكرت القديم */
export const atOf = (m: MailRow) => m.sentAt ?? m.createdAt;

/** شارةُ حالها — أوّلُ ما يُسأل عن رسالة: أوصلت أم تعثّرت (كانت شارةَ الكرت القديم) */
export function mailChips(m: MailRow) {
  const b = badgeOf(m);
  return <AdBadge tone={b.tone} icon={iconOf(m)}>{b.label}</AdBadge>;
}
/**
 * سطورُها بترتيب حقائق الكرت القديم: لمن، وسببُ تعثّرها، وجهتُها، وساعتُها (يومُها في الكعب). و`record`: صفحةُ الرسالة تقول الجهةَ
 * وإن غابت («الجهة غير متوفّرة») كما كانت خليّتُها في `MailView` القديمة، والكرتُ يُسقطها فلا يزدحم بما لا خبرَ فيه.
 */
export const mailInfo = (m: MailRow, record = false): AdMeta[] => [
  { icon: <UserCircle />, text: `إلى ${m.to}` },
  ...(m.why ? [{ icon: <Warning />, text: m.why, tone: "bad" as const }] : []),
  ...(m.auth && m.status === "dead" ? [{ icon: <Warning />, text: "رسالةُ مصادقةٍ لا تُعاد: يطلب صاحبُها رمزًا جديدًا" }] : []),
  ...(m.unit ? [{ icon: <Buildings />, text: m.unit }] : record ? [{ icon: <Buildings />, text: "الجهة غير متوفّرة", tone: "muted" as const }] : []),
  { icon: <Clock />, text: fmtClock(atOf(m)) },
];
export const mailStub = (m: MailRow): AdStub => { const d = dayParts(atOf(m)); return { big: d.day, small: d.month }; };
