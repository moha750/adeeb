"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, ModalSectionHeading } from "@adeeb/design-system";
import { At, Buildings, Clock, EnvelopeSimple, Hash, Mailbox, PaperPlaneTilt, Repeat, UserCircle } from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowsClockwise, Info, Warning } from "@/app/_components/glyphs";
import { Cell } from "../../../_components/Cell";
import { PageHeader, type HeaderStatus } from "../../../_components/PageHeader";
import { Section } from "../../../_components/Section";
import { useToast } from "../../../_components/ToastProvider";
import { fmtStamp } from "@/lib/dates";
import { liftSuppression, retryMail } from "../actions";
import type { MailDetail } from "../data";
import { MailFrame } from "../MailFrame";

const DELIVERY: Record<NonNullable<MailDetail["delivery"]>, HeaderStatus> = {
  delivered: { label: "وصلت", tone: "success" },
  delayed: { label: "تتأخّر", tone: "warning" },
  bounced: { label: "ارتدّت", tone: "danger" },
  complained: { label: "عُدّت مزعجة", tone: "danger" },
};

const STATUS: Record<MailDetail["status"], HeaderStatus> = {
  sent: { label: "خرجت", tone: "success" },
  queued: { label: "تنتظر", tone: "warning" },
  sending: { label: "تخرج الآن", tone: "warning" },
  dead: { label: "تعثّرت", tone: "danger" },
  cancelled: { label: "أُلغيت", tone: "neutral" },
};

/**
 * **رسالةٌ من سجلّ البريد**: حقائقُها، ثمّ الرسالةُ نفسُها كما تصل.
 *
 * «خرجت» تعني أنّ المزوّد قبلها. وما جرى بعدها (وصلت، تأخّرت، ارتدّت، عُدّت مزعجة) يصل بخطّاف Resend فيغلبها
 * في الرأس. ورسالةُ المصادقة تُعرَض حقائقُها وحدَها، فمتنُها رمزُ دخولٍ أو رابطُه.
 */
export function MailView({ mail }: { mail: MailDetail }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const retry = () =>
    start(async () => {
      const r = await retryMail(mail.id);
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      router.refresh();
    });

  const lift = () =>
    start(async () => {
      const r = await liftSuppression(mail.email);
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      router.refresh();
    });

  // الفعلُ الواحد: رفعُ الإيقاف يسبق الإعادة، فرسالةٌ إلى عنوانٍ موقوفٍ تموت ثانيةً.
  const action = mail.suppressed
    ? { label: "ارفع إيقاف العنوان", icon: <ArrowCounterClockwise size={18} />, onClick: lift, loading: busy }
    : mail.status === "dead" && !mail.auth
      ? { label: "أعد إرسالها", icon: <ArrowsClockwise size={18} />, onClick: retry, loading: busy }
      : undefined;

  return (
    <>
      <PageHeader
        title={mail.subject}
        crumbLeaf="رسالة"
        status={mail.status === "sent" && mail.delivery ? DELIVERY[mail.delivery] : STATUS[mail.status]}
        action={action}
      />

      <Section icon={<Info />} title="معلومات الرسالة">
        <Cell label="إلى" icon={<UserCircle />} value={mail.to} noCopy />
        <Cell label="البريد" icon={<At />} value={mail.email} lat />
        <Cell label="الجهة" icon={<Buildings />} value={mail.unit} noCopy />
        <Cell label="المحاولات" icon={<Repeat />} value={String(mail.attempts)} noCopy />
        <Cell full label="كُتبت" icon={<Clock />} value={fmtStamp(mail.createdAt)} noCopy />
        {mail.sentAt ? <Cell full label="خرجت" icon={<PaperPlaneTilt />} value={fmtStamp(mail.sentAt)} noCopy /> : null}
        {mail.deliveryAt && mail.delivery ? (
          <Cell full label={DELIVERY[mail.delivery].label} icon={<Mailbox />} value={fmtStamp(mail.deliveryAt)} noCopy />
        ) : null}
        {mail.why ? <Cell full wrap label="السبب" icon={<Warning />} value={mail.why} noCopy /> : null}
        {mail.deliveryNote ? (
          <Cell full wrap lat label="ردُّ خادم المستلم كما جاء" icon={<EnvelopeSimple />} value={mail.deliveryNote} />
        ) : null}
        {mail.rawError && mail.status !== "sent" ? (
          <Cell full wrap lat label="ردُّ المزوّد كما جاء" icon={<EnvelopeSimple />} value={mail.rawError} />
        ) : null}
        {mail.providerId ? <Cell full lat label="معرّفُها عند المزوّد" icon={<Hash />} value={mail.providerId} /> : null}
      </Section>

      <ModalSectionHeading className="mt-5" icon={<EnvelopeSimple />} title="الرسالة" />
      {mail.html ? (
        <>
          <p className="mb-3 text-sm text-content-muted">
            مرسومةٌ بقالبها اليوم كما يعرضها Gmail على الجوّال. فإن تبدّل القالبُ بعد إرسالها فهذا شكلُها الجديد.
          </p>
          <MailFrame html={mail.html} title={mail.subject} />
        </>
      ) : (
        <Alert
          tone="info"
          title={mail.auth ? "لا تُعرض رسائلُ الدخول" : mail.kind.startsWith("contact.") ? "متنُها لأهل رسائل التواصل" : "تعذّر رسمُ الرسالة"}
        >
          {mail.auth
            ? "متنُها رمزُ دخولٍ أو رابطُه، ومن رآه دخل حسابَ صاحبه. فتُعرض حقائقُها وحدَها."
            : mail.kind.startsWith("contact.")
              ? "فيها رسالةُ الزائر وردُّنا عليه، وتُقرأ في غرفة رسائل التواصل."
              : "قالبُها حُذف أو لم تكفِه حقائقُها."}
        </Alert>
      )}
    </>
  );
}
