"use client";

/**
 * إشرافُ الباركود على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `tools/qr/oversight/OversightView.tsx` القديم:
 * عينُ النادي على ملصقاته. تُقال فيها ثلاثةٌ: **من يملك** كلَّ باركود، و**إلى أين يوصّل** (مضيفُ الوجهة لا الرابطَ الطويل)،
 * و**ما الذي جرى** عليه ومن فعله ومتى. والبحثُ بالاسم والرمز والوجهة والصاحب، والحالُ مواضع (كانت مرشّحًا وكاردَ إحصاء)،
 * والتحكّمُ من الصفّ كما أمر المالك ٢٠٢٦-٠٩-٠٥: الإحصاءات، ونقلُ الملكيّة، والتشغيل، والإيقافُ بتأكيد، والحذفُ بتأكيد —
 * وكلُّ فعلٍ منها يمرّ بدالّةٍ في القاعدة تفحص قدرةَ الإشراف، فالشاشةُ لا تملك ما لا تملكه القاعدة.
 */
import type { RoomView } from "../view";
import { QR_OVERSIGHT_ROOM } from "./qr-oversight.meta";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Select, matchesSearch } from "@adeeb/design-system";
import { ArrowsLeftRight, Bell, CalendarBlank, ChartLineUp, ClockCounterClockwise, FileArrowUp, FileImage, FilePdf, LinkSimple, PaintBrush, Pause, Play, Scan, Stack, Tag, UserCircle, UserSwitch } from "@phosphor-icons/react";
import { PencilSimple, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { qrFileType, qrFileUrl, targetHost } from "@/lib/qrLinks";
import { qrFileLabel } from "@/app/dashboard/tools/qr/QrTarget";
import { killText } from "@/app/dashboard/tools/qr/copy";
import { adminDeleteQr, adminSetQrActive, transferQrOwner } from "@/app/dashboard/tools/qr/oversight/actions";
import type { QrEvent, QrOversightData, QrOversightRow } from "@/app/dashboard/tools/qr/oversight/data";
import { AdActs, AdBadge, AdCard, AdConfirm, AdNote, AdRow, type AdFigure, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { AdLog, type AdLogEvent } from "../log";
import { CollectionRoom, type Position } from "../collection";
import { dayParts, fmtNum } from "../format";
import type { ArForms } from "@/lib/arabicCount";

const AR_QR: ArForms = ["باركودٌ واحد", "باركودان", "باركودات", "باركودًا"];

/**
 * **مواضعُ الباركودات بحالها**: كان فوق الجدول القديم كاردا إحصاء («باركود في النادي»، «باركود موقوف») ومرشّحُ «الحالة»
 * (يعمل، موقوف) — فصارت مواضعَ بأعدادها، والكلُّ أوّلُها. و«مسحةٌ مُحصاة» مجموعٌ لا حال: مكانُه صفحةُ الإحصاء.
 */
const POSITIONS: Position<QrOversightRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا باركودات بعد." },
  { key: "active", label: "يعمل", match: (r) => r.active, empty: "لا باركود يعمل الآن." },
  { key: "paused", label: "موقوف", match: (r) => !r.active, empty: "لا باركود موقوف." },
];

/** ما تقوله الواقعةُ بلسانٍ يُقرأ: الفعلُ أوّلًا ثمّ ما تبدّل. */
const KIND_LABEL: Record<QrEvent["kind"], string> = {
  target: "بدّل الوجهة",
  title: "غيّر الاسم",
  active: "بدّل الحالة",
  spec: "عدّل التصميم",
  delete: "حذف الباركود",
  owner: "نقل الملكيّة",
  schedule: "بدّل المواعيد",
  tags: "بدّل الوسوم",
  campaign: "بدّل الحملة",
  file: "بدّل الملف",
};

const KIND_TONE: Record<QrEvent["kind"], AdTone> = {
  target: "warn",
  title: "neutral",
  active: "info",
  spec: "neutral",
  delete: "bad",
  owner: "info",
  schedule: "neutral",
  tags: "neutral",
  campaign: "info",
  // **وزنُ تبديل الوجهة**: من استبدل ملفَّ ملصقٍ مطبوع غيّر ما يراه الناس (م٢١)
  file: "warn",
};

/** رمزُ النوع في نقطة الواقعة — والحالُ برمز ما صارت إليه (تشغيلٌ أو إيقاف). */
const KIND_ICON: Record<QrEvent["kind"], (e: QrEvent) => ReactNode> = {
  target: () => <LinkSimple />,
  title: () => <PencilSimple />,
  active: (e) => (e.newValue === "true" ? <Play /> : <Pause />),
  spec: () => <PaintBrush />,
  delete: () => <Trash />,
  owner: () => <UserSwitch />,
  schedule: () => <CalendarBlank />,
  tags: () => <Tag />,
  campaign: () => <Stack />,
  file: () => <FileArrowUp />,
};

/**
 * **أنُبِّه أحدٌ بهذا؟** الواقعةُ تُقيَّد دائمًا، والتنبيهُ يخرج لتبديل الوجهة وحدَه، ولا يخرج بريدٌ ما لم يُشغَّل الزناد.
 * فتُقال الحالُ في طرف الواقعة بلا أن يُفتَح صندوقُ بريد.
 */
function alertBadge(st: string | undefined) {
  if (st === "sent") return <AdBadge tone="ok" icon={<Bell />}>أُرسل التنبيه</AdBadge>;
  if (st === "failed") return <AdBadge tone="bad" icon={<Bell />}>تعثّر التنبيه</AdBadge>;
  if (st === "off") return <AdBadge icon={<Bell />}>التنبيهُ مطفأ</AdBadge>;
  return <AdBadge tone="info" icon={<Bell />}>التنبيهُ في الطريق</AdBadge>;
}

/** أنواعٌ تقول ما تغيّر («إلى… بعد…») فلا تُطوى مع أخواتها: كلُّ واحدةٍ تغييرٌ غيرُ الآخر */
const CHANGES = new Set<QrEvent["kind"]>(["target", "title", "owner", "active", "file"]);

const AR_EVENT: ArForms = ["واقعةٌ واحدة", "واقعتان", "وقائع", "واقعةً"];

export function QrOversightRoom({ data, serverNow, view }: { data: QrOversightData; serverNow: number; view?: RoomView }) {
  const { rows, events, error } = data;
  const [confirmStop, setConfirmStop] = useState<QrOversightRow | null>(null);
  const [confirmKill, setConfirmKill] = useState<QrOversightRow | null>(null);
  const [moving, setMoving] = useState<QrOversightRow | null>(null);
  const [heir, setHeir] = useState("");
  const [pending, startPending] = useTransition();
  const toast = useToast();
  const router = useRouter();

  /**
   * **الإيقافُ يُستأذَن فيه، والتشغيلُ لا** (٢٠٢٦-٠٩-٠٥): إيقافُ ملصقٍ ليس لك يُبطل رمزًا
   * مطبوعًا في الشارع، فيُقال أثرُه قبل وقوعه. وردُّه إلى العمل لا ضررَ فيه يُستأذَن له.
   */
  const setActive = (r: QrOversightRow, active: boolean) =>
    startPending(async () => {
      const res = await adminSetQrActive(r.id, active);
      if (!res.ok) return toast.error(res.message);
      toast.success(res.message);
      setConfirmStop(null);
      router.refresh();
    });

  const move = (r: QrOversightRow, to: string) =>
    startPending(async () => {
      const res = await transferQrOwner(r.id, to);
      if (!res.ok) return toast.error(res.message);
      toast.success(res.message);
      setMoving(null);
      setHeir("");
      router.refresh();
    });

  const kill = (r: QrOversightRow) =>
    startPending(async () => {
      const res = await adminDeleteQr(r.id);
      if (!res.ok) return toast.error(res.message);
      toast.success(res.message);
      setConfirmKill(null);
      router.refresh();
    });

  const statsOf = (r: QrOversightRow) => `/dashboard/tools/qr/${r.id}`;

  /**
   * قائمةُ الصفّ القديمة بترتيبها: الأساسيُّ الإحصاءات (صفحةُ الباركود بكلّ ما فيها)، ثمّ نقلُ الملكيّة، ثمّ التشغيلُ للموقوف
   * وحده؛ وفي منطقة الخطر الإيقافُ للعامل وحده، ثمّ الحذف — والقالبُ يجعلهما آخرَ «المزيد» بالأحمر.
   */
  const ops = (r: QrOversightRow): AdOp[] => [
    { key: "move", label: "نقل الملكيّة", icon: <UserSwitch />, disabled: pending, onClick: () => { setMoving(r); setHeir(""); } },
    ...(r.active
      ? [{ key: "stop", label: "أوقف الباركود", icon: <Pause />, danger: true, disabled: pending, onClick: () => setConfirmStop(r) }]
      : [{ key: "play", label: "شغّل الباركود", icon: <Play />, disabled: pending, onClick: () => setActive(r, true) }]),
    { key: "del", label: "حذف الباركود", icon: <Trash />, danger: true, disabled: pending, onClick: () => setConfirmKill(r) },
  ];
  const acts = (r: QrOversightRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "الإحصاءات", icon: <ChartLineUp />, href: statsOf(r) }} ops={ops(r)} />
  );

  /** الوجهةُ كما كانت في عمودها (`QrTarget`): الرابطُ مضيفُه بالخطّ اللاتينيّ، والملفُّ نوعُه بالعربيّة («صورة»، «ملف PDF»). */
  const targetOf = (r: QrOversightRow) =>
    r.kind === "file"
      ? { text: qrFileLabel(r.filePath), ltr: false, icon: r.filePath && qrFileType(r.filePath) === "pdf" ? <FilePdf /> : <FileImage /> }
      : { text: targetHost(r.targetUrl), ltr: true, icon: <LinkSimple /> };
  const ownerOf = (r: QrOversightRow) => r.owner?.name ?? "—";

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: الحالُ شارةٌ في العرضين (كانت عمودَ «الحالة»)، ثمّ اسمُ الباركود، ثمّ صاحبُه ووجهتُه سطرين
   * بترتيب أعمدتهما القديمة — وهما في السطر عمودان فيخرجان من سطوره. والمسحاتُ رقمُ الكرت وعمودُ السطر، والكعبُ يومُ الإنشاء
   * وشهرُه (كان عمودَ «أُنشئ»).
   */
  const chips = (r: QrOversightRow) =>
    r.active
      ? <AdBadge tone="ok" icon={<Play />}>يعمل</AdBadge>
      : <AdBadge icon={<Pause />}>موقوف</AdBadge>;
  const info = (r: QrOversightRow, inCard: boolean): AdMeta[] => {
    if (!inCard) return [];
    const t = targetOf(r);
    return [
      { icon: <UserCircle />, text: ownerOf(r) },
      { icon: t.icon, text: t.text, ltr: t.ltr || undefined },
    ];
  };
  const stubOf = (r: QrOversightRow) => { const d = dayParts(r.createdAt); return { big: d.day, small: d.month }; };
  const figures = (r: QrOversightRow): AdFigure[] => [{ icon: <Scan />, value: fmtNum(r.scanCount), label: "المسحات" }];

  /** معرّفٌ في السجلّ يُقرأ اسمًا: أسماءُ المُلّاك والورثة كلُّها محمولةٌ في الصفحة أصلًا. */
  const nameOf = (id: string | null) => {
    if (!id) return "غيرُ معروف";
    const inRows = rows.find((r) => r.owner?.id === id)?.owner?.name;
    return inRows ?? data.candidates.find((c) => c.id === id)?.name ?? "غيرُ معروف";
  };

  /**
   * **الواقعةُ جملةٌ على الخطّ الزمنيّ** (`AdLog`): ما وقعت عليه، ونوعُها شارةً بنغمتها، وما تغيّر ومَن فعله تحته، وحالُ
   * التنبيه في الطرف — أعمدةُ الجدول القديم الستّة نفسُها («الفعل»، «الباركود»، «ما تغيّر»، «التنبيه»، «من»، «متى»).
   */
  const logEvent = (e: QrEvent): AdLogEvent => {
    const lat = (v: string) => <bdi className="lat" dir="ltr">{targetHost(v)}</bdi>;
    const change =
      e.kind === "target" && e.newValue ? <>إلى {lat(e.newValue)}{e.oldValue ? <>، بعد {lat(e.oldValue)}</> : null}</>
      : e.kind === "title" && e.newValue ? <>«{e.newValue}»{e.oldValue ? <>، بعد «{e.oldValue}»</> : null}</>
      : e.kind === "owner" ? <>إلى {nameOf(e.newValue)}{e.oldValue ? <>، بعد {nameOf(e.oldValue)}</> : null}</>
      : e.kind === "active" ? <>{e.newValue === "true" ? "شُغّل" : "أُوقف"}</>
      : undefined;
    return {
      icon: KIND_ICON[e.kind](e),
      tone: KIND_TONE[e.kind],
      label: KIND_LABEL[e.kind],
      // باركودٌ حُذف لا عنوانَ له اليوم، وواقعتُه تبقى: تُسمّى بما هي لا بفراغ.
      title: e.linkTitle ?? "باركود محذوف",
      change,
      changeIcon: <ArrowsLeftRight />,
      meta: [{ icon: <UserCircle />, text: `بيد ${e.actor ?? "غيرِ معروف"}` }],
      side: e.kind === "target" ? alertBadge(data.alerts[e.id]) : undefined,
      // الملفُّ الجديدُ يُفتح لمن يراقب: «ما الذي صار يراه الناس؟» سؤالُ الإشراف كلُّه
      open: e.kind === "file" && e.newValue ? { label: "الملف الجديد", icon: <FileImage />, href: qrFileUrl(e.newValue) } : undefined,
    };
  };

  return (
    <>
        <CollectionRoom<QrOversightRow>
          navPath={QR_OVERSIGHT_ROOM.navPath}
          // **السجلُّ تحت القائمة كما كان، داخل الغرفة** (`after`): كرتُه وجدولُه بهيئتهما القديمة
          after={
            <AdLog<QrEvent>
              title="ما الذي جرى"
              icon={<ClockCounterClockwise />}
              items={events}
              at={(e) => e.at}
              idOf={(e) => String(e.id)}
              event={logEvent}
              // التعديلاتُ المتتاليةُ بلا تغييرٍ يُقال (تصميمٌ يُضبط مرّاتٍ في دقيقة) سطرٌ واحدٌ بعدده؛ وما له «إلى… بعد…» يبقى وحده
              same={(a, b) => a.linkId === b.linkId && a.kind === b.kind && a.actor === b.actor && !CHANGES.has(a.kind)}
              noun={AR_EVENT}
              now={serverNow}
              empty={{ title: "لا تغييرات بعد", text: "كلّ تبديل وجهة أو اسم أو إيقاف أو حذف سيُقيَّد هنا بصاحبه ووقته." }}
            />
          }
          title={QR_OVERSIGHT_ROOM.title}
          noun={AR_QR}
          items={rows}
          positions={POSITIONS}
          defaultPosition="all"
          searchPlaceholder="ابحث باسم الباركود أو صاحبه أو وجهته…"
          matchSearch={(r, q) => matchesSearch(q, r.title, r.code, r.targetUrl, r.owner?.name)}
          viewKey={QR_OVERSIGHT_ROOM.viewKey}
          initialView={view}
          idOf={(r) => r.id}
          // قراءةُ السجلّ تعذّرت والباركوداتُ قُرئت: النقصُ يُقال فوق القائمة كما كان (`page.tsx`)
          notice={error ? <AdNote>{`نقصٌ في القراءة: ${error}`}</AdNote> : undefined}
          table={{
            // الترتيبُ بالاسم وتاريخ الإنشاء من رأسيهما كجداول الغرف كلّها (محمد ٢٠٢٦-١١-٠١؛ لم يكن في الجدول القديم)
            head: "الباركود",
            headSortBy: (r) => r.title.toLowerCase(),
            stub: { key: "created", label: "أُنشئ", icon: <CalendarBlank />, sortBy: (r) => +new Date(r.createdAt) },
            columns: [
              { key: "owner", label: "صاحبه", icon: <UserCircle />, text: true },
              { key: "target", label: "الوجهة", icon: <LinkSimple />, text: true },
              { key: "scans", label: "المسحات", icon: <Scan /> },
            ],
          }}
          emptyAll={{ title: "لا باركودات بعد", desc: "حين يُنشئ أعضاء النادي باركوداتهم ستُعرَض هنا بوجهاتها وأصحابها." }}
          renderCard={(r) => (
            <AdCard
              key={r.id}
              seed={r.id}
              stub={stubOf(r)}
              chips={chips(r)}
              title={r.title}
              href={statsOf(r)}
              meta={info(r, true)}
              figures={figures(r)}
              foot={acts(r)}
            />
          )}
          renderRow={(r) => {
            const t = targetOf(r);
            return (
              <AdRow
                key={r.id}
                title={r.title}
                href={statsOf(r)}
                stub={{ ...stubOf(r), seed: r.id }}
                badge={chips(r)}
                sub={info(r, false)}
                cells={[
                  { label: "صاحبه", value: ownerOf(r), text: true },
                  { label: "الوجهة", value: t.text, text: true, ltr: t.ltr || undefined },
                  ...figures(r).map((f) => ({ label: f.label, value: f.value })),
                ]}
                acts={acts(r, true)}
              />
            );
          }}
        />


      {/* نصُّ التبعة كما هي: إيقافٌ لا حذف، ورجعةٌ بضغطة. والاسمُ يُقال كي لا يُوقَف غيرُ المقصود. */}
      <AdConfirm
        open={confirmStop !== null}
        onClose={() => setConfirmStop(null)}
        tone="warning"
        icon={<Pause />}
        title="إيقاف الباركود؟"
        text={confirmStop
          ? `سيتوقّف «${confirmStop.title}» عن التوصيل، ومن يمسحه يرى صفحةً تقول إنّه غير متاح. والملصقُ المطبوعُ يبقى صالحًا، فتشغيلُه يعيده كما كان. وسيُقيَّد هذا في السجلّ باسمك.`
          : undefined}
        confirmLabel="أوقف"
        loading={pending}
        onConfirm={() => confirmStop && setActive(confirmStop, false)}
      />

      {/**
        * **نقلُ الملكيّة نافذةٌ لا بندٌ في قائمة**: يقتضي اختيارَ شخصٍ بعينه، والاختيارُ
        * لا يقع في منسدلِ أفعال. والقائمةُ تعرض **من يملك قدرةَ المولّد وحدَهم**: من نُقل
        * إليه بلا قدرةٍ ملَك باركودًا لا يرى غرفتَه، والقاعدةُ ترفض ذلك أصلًا.
        */}
      <Modal
        open={moving !== null}
        onClose={() => setMoving(null)}
        size="sm"
        title="نقل ملكيّة الباركود"
        description="ينتقل الباركود ومسحاتُه إلى صاحبٍ جديد، ويُقيَّد ذلك في السجلّ باسمك. والملصقُ المطبوعُ لا يتغيّر."
        footer={
          <>
            <Button
              variant="primary"
              size="md"
              loading={pending}
              disabled={!heir}
              onClick={() => moving && heir && move(moving, heir)}
            >
              انقل الملكيّة
            </Button>
            <Button variant="ghost" size="md" disabled={pending} onClick={() => setMoving(null)}>إلغاء</Button>
          </>
        }
      >
        <Select
          label="الصاحب الجديد"
          icon={<UserSwitch />}
          value={heir}
          onValueChange={setHeir}
          searchable
          options={data.candidates
            .filter((c) => c.id !== moving?.owner?.id)
            .map((c) => ({ value: c.id, label: c.name }))}
          helper={moving ? `صاحبُه الآن: ${moving.owner?.name ?? "غيرُ معروف"}` : undefined}
        />
      </Modal>

      {/* تبعةُ الحذف كما تُقال لصاحبه: هي هي في الغرفتين، ومصدرُها واحدٌ في `copy`. */}
      <AdConfirm
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الباركود؟"
        text={confirmKill ? killText(confirmKill.title) : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => confirmKill && kill(confirmKill)}
      />
    </>
  );
}
