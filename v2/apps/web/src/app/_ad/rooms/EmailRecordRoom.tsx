"use client";

/**
 * **رسالةٌ من سجلّ البريد على قالب «التذكرة المفتوحة»** (`_ad/record.tsx`، اعتمده محمد ٢٠٢٦-١١-٠٧). السلوكُ سلوكُ
 * `system/email/[id]/MailView.tsx` حرفًا: حالُها (وما جرى بعد خروجها يغلب «خرجت»)، وفعلُها الواحد — رفعُ إيقاف العنوان يسبق الإعادة،
 * فرسالةٌ إلى عنوانٍ موقوفٍ تموت ثانيةً — بإشعاره وتحديث الصفحة، وحقائقُها كلُّها بنسخ ما يُنسخ منها، ثمّ الرسالةُ نفسُها كما تصل، أو
 * سببُ غيابها (رسالةُ دخول، أو ردُّ تواصلٍ لغير أهله، أو قالبٌ لا يُرسَم). والفرقُ في الشكل:
 * - **الرأسُ تذكرتُها في السجلّ مفتوحة** (`email-ticket.tsx` مصدرٌ واحدٌ للكرت والرأس): يومُها في الكعب ومسارُ الغرفة فوقه رابطَ رجوع،
 *   وشارةُ حالها، وفعلُها في طرف سطرها، وموضوعُها `h1`، ثمّ مستلمُها وسببُ تعثّرها وجهتُها وساعتُها سطورًا — كانت لوحَ رأسٍ قديمًا
 *   وخاناتٍ تكرّرها.
 * - **وما لا تقوله التذكرةُ قسمُ «حسابي»** («معلومات الرسالة»): البريدُ والمحاولاتُ ومواعيدُ الكتابة والخروج والوصول، وردودُ الخوادم
 *   كما جاءت، ومعرّفُها عند المزوّد. والسطرُ الذي يُنسخ زرٌّ كلُّه بـ«نسخ» في طرفه (كان رمزَ نسخٍ في ركن الخانة).
 * **ولا تُعرَض رسالةُ المصادقة**: متنُها رمزُ دخولٍ أو رابطُه، ومن رآه دخل حسابَ صاحبه.
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { At, Clock, Copy, EnvelopeSimple, Hash, Mailbox, PaperPlaneTilt, Repeat } from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowsClockwise, Info } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { copyText } from "@/lib/clipboard";
import { fmtStamp } from "@/lib/dates";
import { liftSuppression, retryMail } from "@/app/dashboard/system/email/actions";
import type { MailDetail } from "@/app/dashboard/system/email/data";
import { MailFrame } from "@/app/dashboard/system/email/MailFrame";
import { RecordTicket } from "../record";
import { AdButton, AdNote, AdRoom } from "../primitives";
import { AdCols, AdLine, AdSection } from "../account";
import { fmtNum } from "../format";
import { MAIL_DELIVERY, mailChips, mailInfo, mailStub } from "./email-ticket";

export function EmailRecordRoom({ mail }: { mail: MailDetail }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();

  // الفعلان كما كانا: إشعارُ ما ردّه الخادم بنغمته، ثمّ تحديثُ الصفحة نجح أو لم ينجح
  const run = (act: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await act();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      router.refresh();
    });

  // نسخُ الخانة كما كان في `Cell` القديم: «نُسِخ: التسمية»، و«تعذّر النسخ» إن رُدّت الحافظة
  const copy = (label: string, value: string) => async () => {
    try { await copyText(value); toast.success(`نُسِخ: ${label}`); } catch { toast.error("تعذّر النسخ"); }
  };
  const copyAct = (label: string) => ({ icon: <Copy />, text: "نسخ", label: `نسخ ${label}` });

  // الفعلُ الواحد: رفعُ الإيقاف يسبق الإعادة، فرسالةٌ إلى عنوانٍ موقوفٍ تموت ثانيةً. ورسالةُ المصادقة لا تُعاد: رمزُها مات.
  const act = mail.suppressed ? (
    <AdButton variant="fill" size="sm" icon={<ArrowCounterClockwise />} busy={busy} onClick={() => run(() => liftSuppression(mail.email))}>
      ارفع إيقاف العنوان
    </AdButton>
  ) : mail.status === "dead" && !mail.auth ? (
    <AdButton variant="fill" size="sm" icon={<ArrowsClockwise />} busy={busy} onClick={() => run(() => retryMail(mail.id))}>
      أعد إرسالها
    </AdButton>
  ) : null;

  /* ── ما لا تقوله التذكرة: المستلمُ والسببُ والجهةُ والساعةُ فيها، فلا تُكرَّر هنا ── */
  const facts = (
    <AdSection icon={<Info />} title="معلومات الرسالة">
      <AdLine icon={<At />} k="البريد" v={mail.email} ltr act={copyAct("البريد")} onClick={copy("البريد", mail.email)} />
      <AdLine icon={<Repeat />} k="المحاولات" v={fmtNum(mail.attempts)} />
      <AdLine icon={<Clock />} k="كُتبت" v={fmtStamp(mail.createdAt)} />
      {mail.sentAt ? <AdLine icon={<PaperPlaneTilt />} k="خرجت" v={fmtStamp(mail.sentAt)} /> : null}
      {mail.deliveryAt && mail.delivery ? (
        <AdLine icon={<Mailbox />} k={MAIL_DELIVERY[mail.delivery].label} v={fmtStamp(mail.deliveryAt)} />
      ) : null}
      {mail.deliveryNote ? (
        <AdLine icon={<EnvelopeSimple />} k="ردُّ خادم المستلم كما جاء" v={mail.deliveryNote} ltr
          act={copyAct("ردّ خادم المستلم")} onClick={copy("ردُّ خادم المستلم كما جاء", mail.deliveryNote)} />
      ) : null}
      {/* ردُّ المزوّد لما لم يخرج وحده: الخارجةُ قد تحمل خطأَ محاولةٍ سبقت نجاحَها */}
      {mail.rawError && mail.status !== "sent" ? (
        <AdLine icon={<EnvelopeSimple />} k="ردُّ المزوّد كما جاء" v={mail.rawError} ltr
          act={copyAct("ردّ المزوّد")} onClick={copy("ردُّ المزوّد كما جاء", mail.rawError)} />
      ) : null}
      {mail.providerId ? (
        <AdLine icon={<Hash />} k="معرّفُها عند المزوّد" v={mail.providerId} ltr
          act={copyAct("معرّفها عند المزوّد")} onClick={copy("معرّفُها عند المزوّد", mail.providerId)} />
      ) : null}
    </AdSection>
  );

  /* ── الرسالةُ نفسُها: مرسومةً بقالبها اليوم، أو سببُ غيابها ── */
  const body = mail.html ? (
    <AdSection
      icon={<EnvelopeSimple />}
      title="الرسالة"
      sub="مرسومةٌ بقالبها اليوم كما يعرضها Gmail على الجوّال. فإن تبدّل القالبُ بعد إرسالها فهذا شكلُها الجديد."
      media={<MailFrame html={mail.html} title={mail.subject} />}
    />
  ) : (
    <AdNote
      tone="info"
      label="الرسالة"
      title={mail.auth ? "لا تُعرض رسائلُ الدخول" : mail.kind.startsWith("contact.") ? "متنُها لأهل رسائل التواصل" : "تعذّر رسمُ الرسالة"}
    >
      {mail.auth
        ? "متنُها رمزُ دخولٍ أو رابطُه، ومن رآه دخل حسابَ صاحبه. فتُعرض حقائقُها وحدَها."
        : mail.kind.startsWith("contact.")
          ? "فيها رسالةُ الزائر وردُّنا عليه، وتُقرأ في غرفة رسائل التواصل."
          : "قالبُها حُذف أو لم تكفِه حقائقُها."}
    </AdNote>
  );

  return (
    <AdRoom label={mail.subject}>
      <div className="ad-room-head">
        <RecordTicket
          title={mail.subject}
          seed={String(mail.id)}
          stub={mailStub(mail)}
          chips={mailChips(mail)}
          acts={act}
          info={mailInfo(mail, true)}
        />
      </div>
      {/* الحقائقُ في العمود الضيّق وأوّلًا في الجوّال (كانت قبل الرسالة)، والرسالةُ بعرضها في العريض */}
      <AdCols aside={facts} top>
        {body}
      </AdCols>
    </AdRoom>
  );
}
