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
import { CalendarBlank, EnvelopeSimpleOpen, PaperPlaneTilt } from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowsClockwise } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { clubDayKey, daysBetweenKeys } from "@/lib/dates";
import { liftSuppression, retryMail, sendTestMail } from "@/app/dashboard/system/email/actions";
import type { MailHealth, MailRow } from "@/app/dashboard/system/email/data";
import type { ArForms } from "@/lib/arabicCount";
import type { RoomView } from "../view";
import { AdActs, AdCard, AdNote, AdRow, type AdOp } from "../primitives";
import { CollectionRoom, type FilterDef, type Position } from "../collection";
import { localDay, relTime } from "../format";
import { atOf, canRetry, mailChips, mailInfo, mailStub, pending, returned } from "./email-ticket";
import { EMAIL_LOG_ROOM } from "./email-log.meta";

const AR_MAIL: ArForms = ["رسالةٌ واحدة", "رسالتان", "رسائل", "رسالةً"];

/** المتعثّرُ في أسبوعه يحتاج نظرًا، وما بعده صار تاريخًا يُقرأ في السجلّ لا مهمّةً في الصدر. */
const NEEDS_DAYS = 7;

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

  // الشارةُ والسطورُ والكعبُ من مصدرها الواحد (`email-ticket.tsx`): هي نفسُها رأسُ صفحة الرسالة
  const chips = mailChips;
  const info = mailInfo;
  const stubOf = mailStub;
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
        ? <AdNote tone="bad" label="البريد" title="متعطّل.">{`${pulse}.`}</AdNote>
        : <AdNote tone="ok" label="البريد" title="يعمل.">{`${pulse}.`}</AdNote>}
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
