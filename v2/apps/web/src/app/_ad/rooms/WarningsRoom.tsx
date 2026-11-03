"use client";

/**
 * غرفةُ الإنذارات على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `members/warnings/WarningsView.tsx` القديم:
 * البحثُ باسم العضو والسبب، ومرشّحاتُ التصنيف والإبلاغ واللجنة، وتفاصيلُ الإنذار في نافذته (السببُ كما كُتب، وتاريخُ الواقعة،
 * وسحبُ العضويّة، والإلغاءُ بسببه)، وتنزيلُ الخطاب، والإرسالُ عبر واتساب وإعادتُه، وفتحُ واتساب يدويًّا، والإلغاءُ بسببٍ لمن يبلغ
 * صاحبَ الإنذار والساري وحده، والإصدارُ بنافذته نفسِها (`IssueWarningModal`) لمن يملك الإصدار.
 * **والأفعالُ تتبع الصفَّ لا صاحبَ الشاشة**: `mayManage` جوابُ القاعدة عن هذا العضو بعينه، فالرئيسان يريان ولا يُصدران.
 */
import type { RoomView } from "../view";
import { WARNINGS_ROOM } from "./warnings.meta";
import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal, Textarea, matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, ChatCenteredText, IdentificationCard, NotePencil, UserCircle, WarningOctagon, WhatsappLogo } from "@phosphor-icons/react";
import { DownloadSimple, Eye, Prohibit, Warning } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { positionLine } from "@/lib/positionLabel";
import { WARNING_CATEGORIES, categoryLabel, remainingText, toneOf, warningTitle } from "@/lib/warnings/vocab";
import { downloadWarningLetter, renderWarningLetter } from "@/lib/warnings/letter";
import { warningWhatsappMessage } from "@/lib/warnings/message";
import { DELIVERY_STATUSES, deliveryLabel, deliveryTone, maySend, sendBlockedWhy } from "@/lib/warnings/delivery";
import { phoneRejection, toE164, waHref } from "@/lib/whatsapp";
import { cancelWarning, sendWarningWhatsapp } from "@/app/dashboard/members/warnings/actions";
import { IssueWarningModal } from "@/app/dashboard/members/warnings/IssueWarningModal";
import type { WarningRow, WarningTarget } from "@/app/dashboard/members/warnings/data";
import type { ArForms } from "@/lib/arabicCount";
import { AdActs, AdBadge, AdCard, AdGroupHead, AdRow, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { dayParts, fmtDayFull } from "../format";

const AR_WARNING: ArForms = ["إنذارٌ واحد", "إنذاران", "إنذارات", "إنذارًا"];

/**
 * **مواضعُ الإنذارات بحالها**: كان فوق الجدول القديم كاردُ «إنذارات سارية» ومرشّحُ حالة («سارٍ»، «ملغى») — فصارت مواضعَ
 * بأعدادها كما في الشهادات. و«أعضاء عليهم إنذارات» و«بلغوا الحدّ» عددُ أشخاصٍ لا حال: مكانُهما صفحةُ الإحصاء.
 * والملغاةُ تُفتح نادرًا (`rare`) كملغاة الفعاليّات.
 */
const POSITIONS: Position<WarningRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا إنذارات بعد." },
  { key: "active", label: "سارية", match: (r) => r.status === "active", empty: "لا إنذار سارٍ الآن." },
  { key: "cancelled", label: "ملغاة", match: (r) => r.status === "cancelled", empty: "لم يُلغَ إنذارٌ قطّ.", rare: true },
];

/** نغمةُ الرتبة من قربها من الحدّ (`toneOf`): آخرُ إنذارٍ قبل السحب أحمر. */
const RANK_TONE: Record<ReturnType<typeof toneOf>, "warn" | "bad"> = { warning: "warn", danger: "bad" };
const DELIVERY_TONE: Record<ReturnType<typeof deliveryTone>, AdTone> = { success: "ok", danger: "bad", info: "info", neutral: "neutral" };

/** يومٌ بلا وقت (`YYYY-MM-DD`، تاريخُ الواقعة) بسنته — ظهرَه بساعة النادي، فلا ينقلب يومًا بين الخادم والمتصفّح. */
const dayOnly = (d: string) => fmtDayFull(`${d.slice(0, 10)}T12:00:00+03:00`);
/** السببُ بأسطره كما كتبها المُصدِر (كان `white-space: pre-wrap` تنسيقًا مضمَّنًا، ولا تنسيقَ مضمَّنًا في القالب). */
const asWritten = (s: string) => s.split("\n").map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>);

/** `serverNow` يمرّره كلُّ مسارٍ على القالب؛ ولا وقتَ نسبيًّا يُعرض في الإنذارات فلا يُقرأ هنا. */
export function WarningsRoom({ rows, targets, limit, mayIssue, view }: {
  rows: WarningRow[];
  targets: WarningTarget[];
  /** حدّ الإنذارات — من `warning_limit()` في القاعدة */
  limit: number;
  /** هل يملك القارئ فعلَ الإصدار أصلًا؟ (الرئيسان يريان ولا يُصدران.) */
  mayIssue: boolean;
  serverNow: number;
  view?: RoomView;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [issuing, setIssuing] = useState(false);
  const [cancelling, setCancelling] = useState<WarningRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [detail, setDetail] = useState<WarningRow | null>(null);
  /** الإنذارُ الذي تُرسَل رسالتُه الآن — والإرسالُ معطَّلٌ في غيره حتى ينتهي. */
  const [sendingId, setSendingId] = useState<string | null>(null);

  const letterOf = (r: WarningRow) => ({
    name: r.name,
    gender: r.gender,
    // النداء من **لقطة** الإنذار (منصبه ولجنتُه يومَها) لا من حاله اليوم — وهما لسطر النداء وحده،
    // وهما القطعتان كما يعرفهما `lib/positionLabel` فيصلهما النداءُ بقاعدته الواحدة.
    role: r.roleAr,
    committee: r.scope,
    ordinal: r.ordinal ?? 1,
    category: r.category,
    reason: r.reason,
    issuedAt: r.createdAt,
    activeCount: r.activeCount,
    limit,
  });

  const onDownload = async (r: WarningRow) => {
    try {
      await downloadWarningLetter(letterOf(r));
      toast.success(`نُزّل خطاب «${r.name}».`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الخطاب.");
    }
  };

  const onWhatsapp = (r: WarningRow) => {
    if (!r.phone) { toast.error("لا جوّال مسجّل لهذا العضو."); return; }
    window.open(waHref(r.phone, warningWhatsappMessage(letterOf(r))), "_blank", "noopener");
  };

  /**
   * **إرسالُ القالب عبر واتساب**: الخطابُ يُرسَم ههنا (رسّامه يمسّ DOM)، ثمّ يُرفَع مع المعرّف وحده. والقفلُ ضدّ الإرسال
   * المكرّر في القاعدة لا في هذا الزرّ (`maySend` عرضٌ لِما تقوله القاعدة، لا حكمٌ مستقلّ عنها).
   */
  const onSend = async (r: WarningRow) => {
    const phone = toE164(r.phone);
    if (!phone.ok) { toast.error(phoneRejection(phone.code)); return; }
    if (!maySend(r.delivery?.status ?? null, r.delivery?.updatedAt)) {
      toast.error(sendBlockedWhy(r.delivery!.status));
      return;
    }

    setSendingId(r.id);
    try {
      const blob = await renderWarningLetter(letterOf(r));
      const fd = new FormData();
      fd.append("warningId", r.id);
      fd.append("letter", blob, `${r.id}.png`);
      const res = await sendWarningWhatsapp(fd);
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر إرسال الرسالة.");
    } finally {
      setSendingId(null);
    }
  };

  const submitCancel = () => {
    const w = cancelling;
    if (!w) return;
    start(async () => {
      const res = await cancelWarning({ warningId: w.id, reason: cancelReason });
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(
        res.offerRestore
          ? "أُلغي الإنذار. وعضويّة صاحبه ما زالت منتهية، أعِدها من تبويب «أعضاء سابقون»."
          : res.message,
      );
      setCancelling(null);
      setCancelReason("");
    });
  };

  /**
   * **الشاراتُ في العرضين** (كانتا عمودَي «الإنذار» و«الإبلاغ»): رتبتُه بنغمة قربها من الحدّ أو إلغاؤه — والرتبةُ تسقط عن
   * الملغى لأنّه خرج من العدّ — ثمّ أين بلغ خبرُه صاحبَه عبر واتساب. والإنذارُ بلا صفّ تسليمٍ سبق هذه القناة، فلا شارةَ له
   * (كان «—»)؛ وسببُ الفشل تلميحٌ على شارته كما كان.
   */
  const chips = (r: WarningRow) => {
    const d = r.delivery;
    const sent = d ? <AdBadge tone={DELIVERY_TONE[deliveryTone(d.status)]} icon={<WhatsappLogo />}>{deliveryLabel(d.status)}</AdBadge> : null;
    return (
      <>
        {r.status === "cancelled"
          ? <AdBadge tone="neutral" icon={<Prohibit />}>ملغى</AdBadge>
          : <AdBadge tone={RANK_TONE[toneOf(r.ordinal ?? 1, limit)]} icon={<Warning />}>{warningTitle(r.ordinal ?? 1)}</AdBadge>}
        {d && sent && (d.status === "failed" && d.errorMessage ? <span title={d.errorMessage}>{sent}</span> : sent)}
      </>
    );
  };
  /**
   * **الإنذاراتُ تحت أصحابها** (محمد ٢٠٢٦-١١-٠٢: «شريطٌ باسم الشخص وتحته إنذاراته — بدل أن أقرأ الإنذارَ الثاني ثمّ أنزل وأمرّ
   * على أشخاص حتى أصل إلى الأوّل»؛ وكان «حسب العضو» العرضَ الأوّلَ في الغرفة القديمة): رأسُ المجموعة العضوُ — اسمُه ومنصبُه وما
   * بقي له قبل سحب العضويّة درجاتٍ بعدد الحدّ تمتلئ بنغمتها وتحتها كلمتُها، وصورتُه — وتحته إنذاراتُه من أوّلها. والأعضاءُ بأكثرهم سواريَ ثمّ بأحدثهم إنذارًا.
   */
  const group = {
    of: (r: WarningRow) => r.userId,
    order: (a: WarningRow[], b: WarningRow[]) =>
      b[0].activeCount - a[0].activeCount || Math.max(...b.map((r) => +new Date(r.createdAt))) - Math.max(...a.map((r) => +new Date(r.createdAt))),
    inner: (a: WarningRow, b: WarningRow) => +new Date(a.createdAt) - +new Date(b.createdAt),
    head: (items: WarningRow[]) => {
      const r = items[0];
      return (
        <AdGroupHead
          title={r.name}
          lead={<Avatar src={r.avatar ?? undefined} name={r.name} gender={r.gender} />}
          sub={[{ icon: <IdentificationCard />, text: positionLine(r.roleAr, r.scope) ?? "بلا موقع" }]}
          steps={{ now: r.activeCount, max: limit, tone: RANK_TONE[toneOf(r.activeCount, limit)], label: remainingText(r.activeCount, limit) }}
        />
      );
    },
  };
  /**
   * **السطورُ مصدرُها واحدٌ وترتيبُها واحد**: العضوُ في رأس مجموعته، فالإنذارُ عنوانُه تصنيفُه (كان عمودَ «التصنيف»)، ثمّ سببُه
   * سطرًا واحدًا (كاملُه في التفاصيل)، و«بإصدار فلان» (على قاعدة «بتحرير»، فلا يُخطئ جنسَ المُصدِر).
   */
  const info = (r: WarningRow): AdMeta[] => [
    { icon: <ChatCenteredText />, text: r.reason, clip: true },
    ...(r.issuer ? [{ icon: <UserCircle />, text: `بإصدار ${r.issuer}` }] : []),
  ];
  /** الكعبُ: يومُ الإصدار وشهرُه (كان عمودَ «التاريخ») — في الكرت، وكعبًا مصغّرًا أوّلَ السطر. */
  const stubOf = (r: WarningRow) => { const d = dayParts(r.createdAt); return { big: d.day, small: d.month }; };

  /**
   * قائمةُ الصفّ القديمة بترتيبها: «عرض التفاصيل» أساسيًّا (أوّلُها، وكان النقرُ على السبب يفتحها)، ثمّ تنزيلُ الخطاب، ثمّ
   * الإرسالُ عبر واتساب لمن يبلغه والساري وحده (معطَّلٌ لما أُرسل فعلًا، ولمن لا جوّالَ له، وأثناءَ إرسالٍ آخر)، ثمّ واتساب
   * يدويًّا، والإلغاءُ آخرُها.
   */
  const ops = (r: WarningRow): AdOp[] => {
    const live = r.mayManage && r.status === "active";
    return [
      { key: "letter", label: "تنزيل الخطاب", icon: <DownloadSimple />, onClick: () => void onDownload(r) },
      ...(live
        ? [{
            key: "send",
            label: r.delivery?.status === "failed" ? "إعادة الإرسال عبر واتساب" : "إرسال عبر واتساب",
            icon: <WhatsappLogo />,
            onClick: () => void onSend(r),
            // مُعطَّلٌ لما أُرسل فعلًا: القفلُ في القاعدة، وهذا وجهُه في الشاشة
            disabled: !r.phone || sendingId !== null || !maySend(r.delivery?.status ?? null, r.delivery?.updatedAt),
          }]
        : []),
      { key: "wa", label: "فتح واتساب يدويًّا", icon: <WhatsappLogo />, onClick: () => onWhatsapp(r), disabled: !r.phone },
      ...(live
        ? [{ key: "cancel", label: "إلغاء الإنذار", icon: <Prohibit />, onClick: () => { setCancelling(r); setCancelReason(""); }, danger: true }]
        : []),
    ];
  };
  const acts = (r: WarningRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "عرض التفاصيل", icon: <Eye />, onClick: () => setDetail(r) }} ops={ops(r)} />
  );

  const committees = [...new Set(rows.map((r) => r.committee).filter((c): c is string => !!c))].map((c) => ({ value: c, label: c }));

  return (
    <>
      <CollectionRoom<WarningRow>
        navPath={WARNINGS_ROOM.navPath}
        title={WARNINGS_ROOM.title}
        // معاينةُ القوالب — عيّنةٌ متخيَّلة بالتصنيفات السبعة، لا سجلّ فيها؛ فعلٌ ثانٍ هادئٌ على اللوح كما في الشهادات
        extra={{ label: "افتح الخطاب", icon: <Eye />, href: "/dashboard/members/warnings/preview" }}
        // كان زرُّ الإصدار لمن يملكه وحده، ومعطَّلًا حين لا عضوَ يبلغه الإصدار؛ واللوحُ لا يحمل فعلًا معطَّلًا، فلا يُعرض
        action={mayIssue && targets.length > 0 ? { label: "إصدار إنذار", icon: <Warning />, onClick: () => setIssuing(true) } : undefined}
        noun={AR_WARNING}
        items={rows}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث باسم العضو أو بالسبب…"
        matchSearch={(r, q) => matchesSearch(q, `${r.name} ${r.reason}`)}
        filters={[
          { key: "category", label: "التصنيف", options: WARNING_CATEGORIES.map((c) => ({ value: c.value, label: c.label })), match: (r, v) => r.category === v },
          {
            key: "delivery",
            label: "الإبلاغ",
            options: [{ value: "none", label: "لم يُطلَب" }, ...DELIVERY_STATUSES.map((d) => ({ value: d.value, label: d.label }))],
            match: (r, v) => (r.delivery?.status ?? "none") === v,
          },
          { key: "committee", label: "اللجنة", options: committees, match: (r, v) => (r.committee ?? "") === v },
        ]}
        viewKey={WARNINGS_ROOM.viewKey}
        initialView={view}
        idOf={(r) => r.id}
        group={group}
        table={{
          // الترتيبُ من الرأسين داخل كلّ عضو: بالتصنيف وبتاريخ الإصدار
          head: "الإنذار",
          headSortBy: (r) => categoryLabel(r.category),
          stub: { key: "date", label: "التاريخ", icon: <CalendarBlank />, sortBy: (r) => +new Date(r.createdAt) },
          columns: [],
        }}
        emptyAll={{
          title: "لا إنذارات، والحمد لله",
          desc: mayIssue
            ? "لم يصدر إنذارٌ على أحدٍ في نطاقك بعد. وحين يلزم، يُصدَر من هنا فيُسجَّل ويُبلَّغ صاحبه."
            : "لم يصدر إنذارٌ بعد في نطاق اطّلاعك.",
        }}
        renderCard={(r) => (
          <AdCard
            key={r.id}
            seed={r.id}
            stub={stubOf(r)}
            chips={chips(r)}
            title={categoryLabel(r.category)}
            onOpen={() => setDetail(r)}
            meta={info(r)}
            foot={acts(r)}
          />
        )}
        renderRow={(r) => (
          <AdRow
            key={r.id}
            title={categoryLabel(r.category)}
            onOpen={() => setDetail(r)}
            stub={{ ...stubOf(r), seed: r.id }}
            badge={chips(r)}
            sub={info(r)}
            cells={[]}
            acts={acts(r, true)}
          />
        )}
      />

      {/* تفاصيل الإنذار — السبب كما كُتب، ومصيرُه إن أُلغي أو سحب عضويّة (نافذةُ الغرفة القديمة كما هي) */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        size="md"
        className={detail?.status === "cancelled" ? undefined : "mdl-tone-warning"}
        title={detail ? `${warningTitle(detail.ordinal ?? 1)}: ${detail.name}` : ""}
        description={detail ? `${categoryLabel(detail.category)}، ${fmtDayFull(detail.createdAt)}${detail.issuer ? `، بإصدار ${detail.issuer}` : ""}` : undefined}
        footer={<Button variant="ghost" size="md" onClick={() => setDetail(null)}>إغلاق</Button>}
      >
        {detail ? (
          <>
            <Alert tone={detail.status === "cancelled" ? "info" : "warning"} title="السبب كما كُتب">
              {asWritten(detail.reason)}
            </Alert>
            {detail.occurredOn ? (
              <Alert tone="info" title="تاريخ الواقعة">{dayOnly(detail.occurredOn)}</Alert>
            ) : null}
            {detail.causedTermination ? (
              <Alert tone="danger" title="هذا الإنذار سحب العضويّة">
                ببلوغه الحدّ ({limit}) سُحبت عضويّة {detail.name}.
              </Alert>
            ) : null}
            {detail.status === "cancelled" ? (
              <Alert tone="neutral" title={`أُلغي${detail.canceller ? ` بقرار ${detail.canceller}` : ""}${detail.cancelledAt ? `، ${fmtDayFull(detail.cancelledAt)}` : ""}`}>
                {detail.cancelReason ?? "بلا سبب مكتوب."}
              </Alert>
            ) : null}
          </>
        ) : null}
      </Modal>

      {/* الإلغاء — قرارٌ مُسبَّب: الصفّ يبقى مشطوبًا ويخرج من العدّ فيُعاد ترتيب ما بعده (نافذةُ الغرفة القديمة كما هي) */}
      <Modal
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        size="sm"
        busy={pending}
        className="mdl-tone-danger"
        title={cancelling ? `إلغاء ${warningTitle(cancelling.ordinal ?? 1)}: ${cancelling.name}` : ""}
        description="الملغى يبقى في السجلّ مشطوبًا، ويخرج من العدّ فتُعاد رتبةُ ما بعده."
        footer={
          <>
            <Button variant="danger" size="md" loading={pending} disabled={cancelReason.trim().length < 5} onClick={submitCancel}>
              <Prohibit aria-hidden /> إلغاء الإنذار
            </Button>
            <Button variant="ghost-danger" size="md" onClick={() => setCancelling(null)} disabled={pending}>تراجع</Button>
          </>
        }
      >
        {cancelling?.causedTermination ? (
          <Alert tone="warning" title="هذا الإنذار سحب العضويّة">
            إلغاؤه لا يُعيدها تلقائيًّا، تُعاد بقرارٍ من تبويب «أعضاء سابقون».
          </Alert>
        ) : null}
        <Textarea
          label="سبب الإلغاء"
          icon={<WarningOctagon />}
          innerIcon={<NotePencil />}
          placeholder="لماذا يُلغى هذا الإنذار؟"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          required
          helper="خمسة أحرف فأكثر، يبقى في السجلّ."
        />
      </Modal>

      {mayIssue ? (
        <IssueWarningModal open={issuing} targets={targets} limit={limit} onClose={() => setIssuing(false)} />
      ) : null}
    </>
  );
}
