"use client";

/**
 * **سجلُّ البريد** على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `system/email/EmailLogView.tsx` القديم:
 * كلُّ رسالةٍ خرجت من أدِيب أو تعثّرت في ثلاثين يومًا، الأحدثُ أوّلًا، بحثًا بالموضوع والمستلم وبريده، ومرشّحًا بالجهة.
 * وما تغيّر شكلُه لا معلومتُه:
 * - **الرسالةُ سجلٌّ يُفتح لا واقعةٌ تُقرأ في سطرها** (محمد ٢٠٢٦-١١-٠٢: «كيف يفهم أنّه بضغطه على النصّ يدخل؟»): كرتٌ أو سطرٌ
 *   كرسائل التواصل — يومُها في الكعب، وحالُها شارةً بنغمتها، وموضوعُها عنوانُها، ومستلمُها وجهتُها وساعتُها وسببُ تعثّرها
 *   سطورُها، و«افتح الرسالة» فعلُها الظاهر، ثمّ إعادتُها أو رفعُ إيقاف عنوانها إن كانا. كانت كروتًا مضغوطةً بالأيّام.
 * - **مرشّحُ «الحال» مواضع** (القاعدة: حالاتُ السجلّ مواضعُ لا مرشّح)، وكاردُ «في الطابور» موضعُ «تنتظر» بعدده.
 * - **صندوقُ «يحتاج نظرك» موضعٌ أوّل ما دام فيه شيء**، والغرفةُ تُفتح عليه: من فتحها من إنذار تعطّل البريد رأى جوابَ سؤاله
 *   أوّلًا كما كان («النبضُ أوّلًا»). وما فيه هو ما كان في الصندوق: المتعثّرُ والمرتدُّ في أسبوعه. وإن خلا غاب كما كان يغيب.
 * - **النبضُ سطرٌ فوق القائمة** (كانا شارةَ «البريد يعمل» في الرأس وكاردَ «ساعات منذ آخر رسالة»): «البريدُ يعمل، وآخرُ رسالةٍ
 *   خرجت قبل 9 ساعات» — وبنغمة الخطر حين يتعطّل.
 * **ورسالةُ المصادقة لا تُعاد ولا تُعرَض**: تُذكر بموضوعها ومستلمها لا غير، ويطلب صاحبُها رمزًا جديدًا بنفسه.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { matchesSearch } from "@adeeb/design-system";
import { Buildings, CalendarBlank, Clock, EnvelopeSimple, EnvelopeSimpleOpen, Hourglass, PaperPlaneTilt, UserCircle } from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowsClockwise, ArrowUUpLeft, Prohibit, Warning } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { clubDayKey, daysBetweenKeys } from "@/lib/dates";
import { liftSuppression, retryMail, sendTestMail } from "@/app/dashboard/system/email/actions";
import type { MailHealth, MailRow, MailStatus } from "@/app/dashboard/system/email/data";
import type { ArForms } from "@/lib/arabicCount";
import type { RoomView } from "../view";
import { AdActs, AdBadge, AdCard, AdNote, AdRow, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { CollectionRoom, type FilterDef, type Position } from "../collection";
import { dayParts, fmtClock, localDay, relTime } from "../format";
import { EMAIL_LOG_ROOM } from "./email-log.meta";

const AR_MAIL: ArForms = ["رسالةٌ واحدة", "رسالتان", "رسائل", "رسالةً"];

const STATUS: Record<MailStatus, { label: string; tone: AdTone }> = {
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
const DELIVERY: Record<NonNullable<MailRow["delivery"]>, { label: string; tone: AdTone }> = {
  delivered: { label: "وصلت", tone: "ok" },
  delayed: { label: "تتأخّر", tone: "warn" },
  bounced: { label: "ارتدّت", tone: "bad" },
  complained: { label: "عُدّت مزعجة", tone: "bad" },
};
const badgeOf = (m: MailRow) => (m.status === "sent" && m.delivery ? DELIVERY[m.delivery] : STATUS[m.status]);
/** المتعثّرُ في أسبوعه يحتاج نظرًا، وما بعده صار تاريخًا يُقرأ في السجلّ لا مهمّةً في الصدر. */
const NEEDS_DAYS = 7;

/** الإعادةُ لما مات قبل الخروج، لا لرسالة مصادقة، ولا لعنوانٍ موقوف: تموت ثانيةً حتى يُرفع إيقافُه. */
const canRetry = (m: MailRow) => m.status === "dead" && !m.auth && !m.suppressed;
const pending = (m: MailRow) => m.status === "queued" || m.status === "sending";
const returned = (m: MailRow) => m.delivery === "bounced" || m.delivery === "complained";

/** رمزُ حالها في شارتها: خرجت مغلقة، ووصلت مفتوحة، وتنتظر ساعةً رمليّة، وتعثّرت تحذيرًا، وارتدّت راجعة. */
const iconOf = (m: MailRow) =>
  returned(m) ? <ArrowUUpLeft /> : m.status === "dead" ? <Warning /> : pending(m) ? <Hourglass />
  : m.status === "cancelled" ? <Prohibit /> : m.delivery === "delivered" ? <EnvelopeSimpleOpen /> : <EnvelopeSimple />;

/** وقتُ الرسالة: خروجُها إن خرجت، وإلّا كتابتُها — كما كان سطرُ «متى» في الكرت القديم */
const atOf = (m: MailRow) => m.sentAt ?? m.createdAt;

export function EmailLogRoom({ rows, health, serverNow, view }: { rows: MailRow[]; health: MailHealth; serverNow: number; view?: RoomView }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  const run = (id: number | null, act: () => Promise<{ ok: boolean; message: string }>) => {
    setBusyId(id);
    start(async () => {
      const r = await act();
      setBusyId(null);
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      router.refresh();
    });
  };

  const todayKey = localDay(serverNow);
  const needs = (m: MailRow) => (m.status === "dead" || returned(m)) && daysBetweenKeys(clubDayKey(m.createdAt), todayKey) <= NEEDS_DAYS;

  const anyNeeds = rows.some(needs);
  // «يحتاج نظرك» موضعٌ ما دام فيه شيء، أوّلًا والغرفةُ تُفتح عليه؛ وإن خلا لم يُرسم صفرًا في صدر المبدّل (كان الصندوقُ يختفي)
  const POSITIONS: Position<MailRow>[] = [
    ...(anyNeeds ? [{ key: "needs", label: "يحتاج نظرك", match: needs, empty: "لا شيءَ يحتاج نظرك." }] : []),
    { key: "all", label: "الكلّ", match: () => true, empty: "لم تخرج رسالةٌ في ثلاثين يومًا." },
    { key: "sent", label: "خرجت", match: (m) => m.status === "sent", empty: "لم تخرج رسالةٌ بعد." },
    { key: "pending", label: "تنتظر", match: pending, empty: "لا رسالةَ في الطابور." },
    { key: "dead", label: "تعثّرت", match: (m) => m.status === "dead", empty: "لم تتعثّر رسالة." },
    { key: "returned", label: "ارتدّت", match: returned, empty: "لم ترتدّ رسالة." },
    { key: "cancelled", label: "أُلغيت", match: (m) => m.status === "cancelled", empty: "لم تُلغَ رسالة.", rare: true },
  ];

  /** الجهاتُ الحاضرةُ في السجلّ نفسِه لا قائمةٌ مكتوبةٌ بجانبه: جهةٌ جديدةٌ تظهر يومَ تُرسل. */
  const units = [...new Set(rows.map((m) => m.unit).filter((u): u is string => !!u))];
  const FILTERS: FilterDef<MailRow>[] = units.length > 1
    ? [{ key: "unit", label: "الجهة", options: units.map((u) => ({ value: u, label: u })), match: (m, v) => m.unit === v }]
    : [];

  /** شارةُ حالها — أوّلُ ما يُسأل عن رسالة: أوصلت أم تعثّرت (كانت شارةَ الكرت القديم) */
  const chips = (m: MailRow) => { const b = badgeOf(m); return <AdBadge tone={b.tone} icon={iconOf(m)}>{b.label}</AdBadge>; };
  /** سطورُها بترتيب حقائق الكرت القديم: لمن، وسببُ تعثّرها، وجهتُها، وساعتُها (يومُها في الكعب) */
  const info = (m: MailRow): AdMeta[] => [
    { icon: <UserCircle />, text: `إلى ${m.to}` },
    ...(m.why ? [{ icon: <Warning />, text: m.why, tone: "bad" as const }] : []),
    ...(m.auth && m.status === "dead" ? [{ icon: <Warning />, text: "رسالةُ مصادقةٍ لا تُعاد: يطلب صاحبُها رمزًا جديدًا" }] : []),
    ...(m.unit ? [{ icon: <Buildings />, text: m.unit }] : []),
    { icon: <Clock />, text: fmtClock(atOf(m)) },
  ];
  const stubOf = (m: MailRow) => { const d = dayParts(atOf(m)); return { big: d.day, small: d.month }; };
  const hrefOf = (m: MailRow) => `/dashboard/system/email/${m.id}`;
  /**
   * الأساسيُّ فتحُها (وجهةُ النقر على الكرت القديم)، ثمّ فعلُها الآخرُ إن كان: العنوانُ الموقوفُ يُرفع إيقافُه بعد تصحيحه،
   * والمتعثّرُ يُعاد — ولا يجتمعان (الإعادةُ لا تكون لعنوانٍ موقوف). ورسالةُ المصادقة لا تُعاد.
   */
  const ops = (m: MailRow): AdOp[] => [
    ...(canRetry(m) ? [{ key: "retry", label: "أعد إرسالها", icon: <ArrowsClockwise />, onClick: () => run(m.id, () => retryMail(m.id)), disabled: busy }] : []),
    ...(m.suppressed ? [{ key: "lift", label: "ارفع إيقاف العنوان", icon: <ArrowCounterClockwise />, onClick: () => run(m.id, () => liftSuppression(m.email)), disabled: busy }] : []),
  ];
  const acts = (m: MailRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "افتح الرسالة", icon: <EnvelopeSimpleOpen />, href: hrefOf(m) }} ops={ops(m)} />
  );

  const pulse = health.lastSentAt ? `آخرُ رسالةٍ خرجت ${relTime(health.lastSentAt, serverNow)}` : "لم تخرج رسالةٌ بعد";

  return (
    <CollectionRoom<MailRow>
      navPath={EMAIL_LOG_ROOM.navPath}
      title={EMAIL_LOG_ROOM.title}
      noun={AR_MAIL}
      items={rows}
      positions={POSITIONS}
      // من فتحها من إنذار التعطّل يرى المتعثّرَ أوّلًا كما كان الصندوقُ في صدرها
      defaultPosition={anyNeeds ? "needs" : "all"}
      searchPlaceholder="ابحث بالموضوع أو المستلم أو بريده…"
      matchSearch={(m, q) => matchesSearch(q, m.subject, m.to, m.email)}
      filters={FILTERS}
      idOf={(m) => String(m.id)}
      action={{ label: busy && busyId === null ? "تُرسل الآن…" : "أرسل رسالة تجربة", icon: <PaperPlaneTilt />, onClick: () => run(null, sendTestMail) }}
      notice={health.down
        ? <AdNote tone="bad">{`البريدُ متعطّل، و${pulse}.`}</AdNote>
        : <AdNote tone="info">{`البريدُ يعمل، و${pulse}.`}</AdNote>}
      emptyAll={{
        title: "لم تخرج رسالةٌ في ثلاثين يومًا",
        desc: "كلُّ رسالةٍ يرسلها أدِيب تُكتب هنا من نفسها: رموزُ الدخول، والإشعارات، والردود.",
      }}
      viewKey={EMAIL_LOG_ROOM.viewKey}
      initialView={view}
      table={{
        head: "الرسالة",
        stub: { key: "date", label: "التاريخ", icon: <CalendarBlank />, sortBy: (m) => +new Date(atOf(m)) },
        columns: [],
      }}
      renderCard={(m) => (
        <AdCard key={m.id} seed={String(m.id)} stub={stubOf(m)} chips={chips(m)} title={m.subject} href={hrefOf(m)} meta={info(m)} foot={acts(m)} />
      )}
      renderRow={(m) => (
        <AdRow
          key={m.id}
          title={m.subject}
          href={hrefOf(m)}
          stub={{ ...stubOf(m), seed: String(m.id) }}
          badge={chips(m)}
          sub={info(m)}
          cells={[]}
          acts={acts(m, true)}
        />
      )}
    />
  );
}
