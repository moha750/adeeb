"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardHeader, Modal, Select, Stat } from "@adeeb/design-system";
import { ChartLineUp, Pause, Play, QrCode, ShieldCheck, UserCircle, UserSwitch } from "@phosphor-icons/react";
import { Trash } from "@/app/_components/glyphs";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import { DataTable, type Column } from "../../../_components/DataTable";
import type { MenuGroup } from "../../../_components/DropdownMenu";
import { EmptyState } from "../../../_components/EmptyState";
import { PageHeader } from "../../../_components/PageHeader";
import { useToast } from "../../../_components/ToastProvider";
import { Toolbar, type FilterDef } from "../../../_components/Toolbar";
import { formatThousands as fmt } from "@/app/_components/format";
import { targetHost } from "@/lib/qrLinks";
import { fmtDate, fmtSince } from "@/lib/dates";
import { killText } from "../copy";
import { adminDeleteQr, adminSetQrActive, transferQrOwner } from "./actions";
import type { QrEvent, QrOversightData, QrOversightRow } from "./data";

/**
 * **إشرافُ الباركود** — عينُ النادي على ملصقاته.
 *
 * علّتُها مقيسة: الملصقُ المطبوعُ يحمل رابطنا، ووجهتُه صفٌّ يُبدَّل في ثانية. فحسابٌ يُخترَق
 * أو عضوٌ يغادر بضغينةٍ يحوّل ملصقًا في الجامعة إلى صفحةِ تصيّدٍ تحمل اسمنا، ولا أحدَ يرى.
 *
 * **وهي قراءةٌ محضة.** لا زرَّ تعديلٍ ولا إيقاف: الإشرافُ رؤيةٌ لا سلطةٌ على صفّ غيرِه،
 * والقاعدةُ لا تعرف لهذه القدرة إلّا سياسةَ قراءة — فلو نبت زرٌّ هنا لردّته.
 *
 * وتُقال فيها ثلاثةٌ: **من يملك** كلَّ باركود، و**إلى أين يوصّل** (مضيفُ الوجهة لا الرابطَ
 * الطويل)، و**ما الذي جرى** عليه ومن فعله ومتى.
 */

const FILTERS: FilterDef[] = [
  { key: "state", label: "الحالة", options: [{ value: "active", label: "يعمل" }, { value: "paused", label: "موقوف" }] },
];

/** ما تقوله الواقعةُ بلسانٍ يُقرأ: الفعلُ أوّلًا ثمّ ما تبدّل. */
const KIND_LABEL: Record<QrEvent["kind"], string> = {
  target: "بدّل الوجهة",
  title: "غيّر الاسم",
  active: "بدّل الحالة",
  spec: "عدّل التصميم",
  delete: "حذف الباركود",
  owner: "نقل الملكيّة",
};

const KIND_TONE: Record<QrEvent["kind"], "info" | "warning" | "danger" | "neutral"> = {
  target: "warning",
  title: "neutral",
  active: "info",
  spec: "neutral",
  delete: "danger",
  owner: "info",
};

export function OversightView({ data }: { data: QrOversightData }) {
  const { rows, events, error } = data;
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
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

  /**
   * **تحكّمٌ كاملٌ من الصفّ** (أمرُ المالك ٢٠٢٦-٠٩-٠٥): الاطّلاعُ على صفحة الباركود بكلّ
   * ما فيها، ثمّ نقلُ الملكيّة، ثمّ الإيقافُ والحذف في منطقة الخطر. وكلُّ فعلٍ منها يمرّ
   * بدالّةٍ في القاعدة تفحص قدرةَ الإشراف، فالشاشةُ لا تملك ما لا تملكه القاعدة.
   */
  const rowActions = (r: QrOversightRow): MenuGroup[] => [
    { items: [
        { label: "الإحصاءات", icon: <ChartLineUp />, onSelect: () => router.push(`/dashboard/tools/qr/${r.id}`) },
        { label: "نقل الملكيّة", icon: <UserSwitch />, disabled: pending, onSelect: () => { setMoving(r); setHeir(""); } },
        ...(r.active
          ? []
          : [{ label: "شغّل الباركود", icon: <Play />, disabled: pending, onSelect: () => setActive(r, true) }]),
      ] },
    { header: "منطقة الخطر", danger: true, items: [
        ...(r.active
          ? [{ label: "أوقف الباركود", icon: <Pause />, danger: true, disabled: pending, onSelect: () => setConfirmStop(r) }]
          : []),
        { label: "حذف الباركود", icon: <Trash />, danger: true, disabled: pending, onSelect: () => setConfirmKill(r) },
      ] },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.state === "active" && !r.active) return false;
      if (filters.state === "paused" && r.active) return false;
      if (!q) return true;
      return [r.title, r.code, r.targetUrl, r.owner?.name ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, search, filters]);

  const paused = rows.filter((r) => !r.active).length;

  const columns: Column<QrOversightRow>[] = [
    /**
     * **العمودُ الملتفُّ عرضُه ثابتٌ بالبكسل** (صُحّح ٢٠٢٦-٠٩-٠٥): أُعطي `auto` أوّلًا فرارًا
     * من جرّ الشبكة، فانضغط إلى حرفٍ في السطر — لأنّ `.dt-wrap` يكسر الكلمة أينما كانت
     * (`overflow-wrap: anywhere`)، فأدنى عرضٍ له حرفٌ واحد لا كلمة. والعقدُ في المكتبة يقول
     * ذلك صراحةً: «عرض العمود ثابتٌ (px) فيلتفّ داخله».
     */
    { key: "title", header: "الباركود", width: "240px", wrap: true, render: (r) => <span className="txt"><b>{r.title}</b></span> },
    { key: "owner", header: "صاحبه", width: "minmax(120px, 1fr)", render: (r) => <span className="txt">{r.owner?.name ?? "—"}</span> },
    {
      key: "target", header: "الوجهة", width: "minmax(120px, 1fr)",
      render: (r) => <span className="txt font-latin" dir="ltr">{targetHost(r.targetUrl)}</span>,
    },
    { key: "scans", header: "المسحات", width: "0.8fr", align: "center", render: (r) => <span className="txt num">{fmt(r.scanCount)}</span> },
    {
      key: "state", header: "الحالة", width: "0.9fr", align: "center",
      render: (r) => <Badge tone={r.active ? "success" : "neutral"} size="sm">{r.active ? "يعمل" : "موقوف"}</Badge>,
    },
    { key: "created", header: "أُنشئ", width: "0.9fr", align: "center", render: (r) => <span className="txt num">{fmtDate(r.createdAt)}</span> },
  ];

  /** معرّفٌ في السجلّ يُقرأ اسمًا: أسماءُ المُلّاك والورثة كلُّها محمولةٌ في الصفحة أصلًا. */
  const nameOf = (id: string | null) => {
    if (!id) return "غيرُ معروف";
    const inRows = rows.find((r) => r.owner?.id === id)?.owner?.name;
    return inRows ?? data.candidates.find((c) => c.id === id)?.name ?? "غيرُ معروف";
  };

  const eventColumns: Column<QrEvent>[] = [
    {
      key: "kind", header: "الفعل", width: "minmax(110px, 0.9fr)",
      render: (e) => <Badge tone={KIND_TONE[e.kind]} size="sm">{KIND_LABEL[e.kind]}</Badge>,
    },
    {
      key: "link", header: "الباركود", width: "180px", wrap: true,
      // باركودٌ حُذف لا عنوانَ له اليوم، وواقعتُه تبقى: تُسمّى بما هي لا بفراغ.
      render: (e) => <span className="txt"><b>{e.linkTitle ?? "باركود محذوف"}</b></span>,
    },
    {
      key: "change", header: "ما تغيّر", width: "200px", wrap: true,
      render: (e) =>
        e.kind === "target" && e.newValue ? (
          <span className="txt">
            <bdi className="font-latin" dir="ltr">{targetHost(e.newValue)}</bdi>
            {e.oldValue ? (
              <span className="text-content-muted"> بعد <bdi className="font-latin" dir="ltr">{targetHost(e.oldValue)}</bdi></span>
            ) : null}
          </span>
        ) : e.kind === "title" && e.newValue ? (
          <span className="txt">{e.newValue}{e.oldValue ? <span className="text-content-muted"> بعد {e.oldValue}</span> : null}</span>
        ) : e.kind === "owner" ? (
          <span className="txt">
            {nameOf(e.newValue)}
            {e.oldValue ? <span className="text-content-muted"> بعد {nameOf(e.oldValue)}</span> : null}
          </span>
        ) : e.kind === "active" ? (
          <span className="txt">{e.newValue === "true" ? "شُغّل" : "أُوقف"}</span>
        ) : (
          <span className="txt text-content-muted">—</span>
        ),
    },
    {
      // **أنُبِّه أحدٌ بهذا؟** الواقعةُ تُقيَّد دائمًا، والتنبيهُ يخرج لتبديل الوجهة وحدَه،
      // ولا يخرج بريدٌ ما لم يُشغَّل الزناد. فتُقال الحالُ هنا بلا أن يُفتَح صندوقُ بريد.
      key: "alert", header: "التنبيه", width: "max-content", align: "center",
      render: (e) => {
        if (e.kind !== "target") return <span className="txt text-content-muted">—</span>;
        const st = data.alerts[e.id];
        if (st === "sent") return <Badge tone="success" size="sm">أُرسل</Badge>;
        if (st === "failed") return <Badge tone="danger" size="sm">تعثّر</Badge>;
        if (st === "off") return <Badge tone="neutral" size="sm">الإرسال مطفأ</Badge>;
        return <Badge tone="info" size="sm">في الطريق</Badge>;
      },
    },
    { key: "actor", header: "من", width: "minmax(110px, 1fr)", render: (e) => <span className="txt">{e.actor ?? "غيرُ معروف"}</span> },
    { key: "at", header: "متى", width: "minmax(90px, 0.9fr)", align: "center", render: (e) => <span className="txt num">{fmtSince(e.at)}</span> },
  ];

  return (
    <>
      <PageHeader title="إشراف الباركود" crumbLeaf="الإشراف" />

      {error ? <Alert tone="warning" title="نقصٌ في القراءة">{error}</Alert> : null}

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<QrCode />} value={fmt(rows.length)} label="باركود في النادي" />
        <Stat icon={<ChartLineUp />} value={fmt(rows.reduce((s, r) => s + r.scanCount, 0))} label="مسحةٌ مُحصاة" tone="success" />
        {paused ? <Stat icon={<ShieldCheck />} value={fmt(paused)} label="باركود موقوف" /> : null}
      </div>

      <Toolbar
        searchPlaceholder="ابحث باسم الباركود أو صاحبه أو وجهته"
        search={search}
        onSearch={setSearch}
        filters={FILTERS}
        filterValues={filters}
        onFilter={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        onReset={() => { setSearch(""); setFilters({}); }}
      />

      {/* والجدولان في هيئةٍ واحدة: كرتٌ برأسه والجدولُ ابنُه المباشر (المالك ٢٠٢٦-٠٩-٠٥). */}
      <Card className="mt-4">
        <CardHeader variant="soft" icon={<QrCode />} title="باركودات النادي" />
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(r) => r.id}
          rowTone={(r) => (r.active ? undefined : "neutral")}
          rowActions={rowActions}
          emptyState={
            <EmptyState
              variant="soft"
              icon={<QrCode />}
              title="لا باركودات بعد"
              description="حين يُنشئ أعضاء النادي باركوداتهم ستُعرَض هنا بوجهاتها وأصحابها."
            />
          }
        />
      </Card>

      {/**
        * **كرتٌ برأسه، والجدولُ ابنُه المباشر** (المالك ٢٠٢٦-٠٩-٠٥، على عُرف «أحدث الزوّار»
        * في الإحصاءات): متنُ الكرت (`.acard-body`) يحمل حشوةً قدرُها ٢٠ من كلّ جانب، وهي
        * صوابٌ للنصوص وإطارٌ داخل إطارٍ للجدول. فيُترَك المتنُ ولا يُنقَض قانونُه: الرأسُ
        * وحدَه ثمّ الجدولُ مباشرةً، فيبلغ حافّتَي الكرت.
        */}
      <div className="mt-4">
        <Card>
          <CardHeader variant="soft" icon={<UserCircle />} title="ما الذي جرى" />
          <DataTable
            columns={eventColumns}
            rows={events}
            getRowId={(e) => String(e.id)}
            emptyState={
              <EmptyState
                variant="soft"
                icon={<ShieldCheck />}
                title="لا تغييرات بعد"
                description="كلّ تبديل وجهة أو اسم أو إيقاف أو حذف سيُقيَّد هنا بصاحبه ووقته."
              />
            }
          />
        </Card>
      </div>
      {/* نصُّ التبعة كما هي: إيقافٌ لا حذف، ورجعةٌ بضغطة. والاسمُ يُقال كي لا يُوقَف غيرُ المقصود. */}
      <ConfirmDialog
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
      <ConfirmDialog
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
