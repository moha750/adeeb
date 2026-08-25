"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Field, Modal, Stat, countPhrase, matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, ChartLineUp, Copy, Globe, LinkSimple, Pause, Play, QrCode, TextAa } from "@phosphor-icons/react";
import { PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../_components/DataTable";
import { DataCards, type CardSpec } from "../../_components/DataCards";
import { PageHeader } from "../../_components/PageHeader";
import { Toolbar, type FilterDef } from "../../_components/Toolbar";
import { usePersistentView } from "../../_components/usePersistentView";
import { EmptyState } from "../../_components/EmptyState";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import { formatThousands as fmt } from "@/app/_components/format";
import { qrShortUrl, targetHost } from "@/lib/qrLinks";
import { fmtDate } from "@/lib/dates";
import type { QrLinkRow } from "./data";
import { deleteQrLink, setQrLinkActive, updateQrLink } from "./actions";

/**
 * أيُّ عمودٍ يصير أيَّ موضعٍ في الكرت. **مُقَرَّةٌ ٢٠٢٦-٠٨-٢٥** بعد أن عُرضت إلى جانب الحاليّة
 * بعرض جوّالٍ حقيقيّ في `/ui/cards-view`: خمسةُ صفوفٍ كانت ‏1641px فصارت ‏799.
 *
 * وقرارُها ثلاثةٌ: **أيقونةُ باركودٍ تتصدّر** الكرتَ بتدرّجٍ يتبع نغمتَه، و**مضيفُ الوجهة
 * تحت العنوان مكانَ الرمز القصير** (`/q/f9e6efk` رفاهيةٌ في الكرت، والرمزُ باقٍ في الجدول
 * وفي صفحة الرمز والبحثُ يشمله)، و**المسحاتُ والتاريخُ سطرٌ واحدٌ بأيقونتيهما** بلا تسميات.
 */
const CARD_SPEC: CardSpec = {
  lead: "qr",
  title: "title",
  subtitle: "target",
  badge: "state",
  facts: ["scans", "created"],
  bareFacts: true,
};

/** وحدةُ عدّ المسحات — تُصرَّف عربيًّا في الكرت حيث لا ترويسةَ تسمّي العمود. */
const SCAN_UNIT = { one: "مسحة", two: "مسحتان", few: "مسحات" };

const FILTERS: FilterDef[] = [
  { key: "state", label: "الحالة", options: [
    { value: "active", label: "يعمل" },
    { value: "paused", label: "موقوف" },
  ] },
];

/**
 * **رموزي المحفوظة** — الجزءُ الذي صار للمولّد ذاكرةً.
 *
 * كلُّ صفٍّ هنا رمزٌ يحمل رابطَنا لا رابطَ الوجهة، فوجهتُه تُبدَّل والملصقُ المطبوعُ في
 * الشارع لا يتغيّر. ولذلك **«تعديل الوجهة» هو الفعلُ الأوّل** في القائمة، لا الحذف ولا
 * التنزيل: هو العلّةُ التي بُني النظامُ لأجلها.
 *
 * **والإيقافُ يسبق الحذفَ رتبةً**: الورقةُ في الشارع لا تُسحب، فرمزٌ موقوفٌ يردّ قاصدَه
 * ويُبقي أثرَه، والمحذوفُ يذهب بمسحاته كلِّها.
 */
export function SavedLinksView({ rows, error }: { rows: QrLinkRow[]; error: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [view, changeView] = usePersistentView("qr-links-view");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<QrLinkRow | null>(null);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [confirmKill, setConfirmKill] = useState<QrLinkRow | null>(null);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (!matchesSearch(search, `${r.title} ${r.code} ${r.targetUrl}`)) return false;
        if (filters.state === "active" && !r.active) return false;
        if (filters.state === "paused" && r.active) return false;
        return true;
      }),
    [rows, search, filters],
  );

  const totalScans = useMemo(() => rows.reduce((n, r) => n + r.scanCount, 0), [rows]);

  const openStats = (r: QrLinkRow) => router.push(`/dashboard/tools/qr/${r.id}`);

  const openEdit = (r: QrLinkRow) => {
    setEditing(r);
    setTitle(r.title);
    setTarget(r.targetUrl);
  };

  const copyLink = async (r: QrLinkRow) => {
    try {
      await navigator.clipboard.writeText(qrShortUrl(r.code));
      toast.success("نُسخ رابطُ الباركود.");
    } catch {
      toast.error("تعذّر النسخ. انسخ الرابطَ بيدك من صفحة الباركود.");
    }
  };

  const toggleActive = (r: QrLinkRow) => {
    startPending(async () => {
      const res = await setQrLinkActive(r.id, !r.active);
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.message);
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    startPending(async () => {
      const res = await updateQrLink(editing.id, { title, target });
      if (res.ok) { toast.success(res.message); setEditing(null); router.refresh(); } else toast.error(res.message);
    });
  };

  const actionsFor = (r: QrLinkRow): MenuGroup[] => [
    { header: "إجراءات", items: [
      { label: "تعديل الوجهة", icon: <PencilSimple />, onSelect: () => openEdit(r) },
      { label: "نسخ رابط الباركود", icon: <Copy />, onSelect: () => void copyLink(r) },
      { label: "الإحصاءات", icon: <ChartLineUp />, onSelect: () => openStats(r) },
      r.active
        ? { label: "إيقاف", icon: <Pause />, disabled: pending, onSelect: () => toggleActive(r) }
        : { label: "إعادة التشغيل", icon: <Play />, disabled: pending, onSelect: () => toggleActive(r) },
    ] },
    { header: "منطقة الخطر", danger: true, items: [
      { label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(r) },
    ] },
  ];

  /**
   * أعمدةُ الجدول. **بلا «رابطه» ولا «الوجهة»** (أمرُ المالك ٢٠٢٦-٠٨-٢٥): عمودان لاتينيّان
   * طويلان بلا سقف، والجدولُ لا يقصّ أبدًا فيجرّان الشبكةَ إلى عرض أطولِ رابطٍ فيها ويصير
   * التمرير الأفقيُّ شرطًا لقراءة أيّ صفّ. والوجهةُ كاملةً في صفحة الرمز وفي نافذة تعديلها،
   * ومضيفُها في الكرت، والرمزُ القصير يبقى مبحوثًا عنه في خانة البحث.
   */
  const columns: Column<QrLinkRow>[] = [
    { key: "title", header: "الباركود", width: "minmax(180px, 2fr)", render: (r) => <span className="txt"><b>{r.title}</b></span> },
    { key: "scans", header: "المسحات", width: "0.9fr", align: "center", render: (r) => <span className="txt num">{fmt(r.scanCount)}</span> },
    {
      key: "state", header: "الحالة", width: "0.9fr", align: "center",
      render: (r) => <Badge tone={r.active ? "success" : "neutral"} size="sm">{r.active ? "يعمل" : "موقوف"}</Badge>,
    },
    // `fmtDate` لا `fmtDateOnly`: الأخيرةُ تشطر نصَّ عمودِ `date` عند الشرطة، و`created_at`
    // طابعٌ بوقتٍ ومنطقة (`2026-08-22T06:19:…`) فينكسر شطرُها ويردّ **فراغًا**. كان التاريخُ
    // خاليًا في الجدول والكرت معًا حتّى رُئي في الكروت (٢٠٢٦-٠٨-٢٥).
    { key: "created", header: "أُنشئ", width: "1fr", align: "center", render: (r) => <span className="txt num">{fmtDate(r.createdAt)}</span> },
  ];

  /**
   * أعمدةُ الكرت: **أعمدةُ الجدول نفسُها إلّا ما يقتضيه ضيقُه**، فالقيمةُ تبقى من مصدرٍ واحد
   * ولا تُصاغ صياغةً ثانية. والفروقُ أربعةٌ لكلٍّ حجّتُه:
   * · **الوجهةُ مضيفُها** (`targetHost`): عمودٌ لا وجودَ له في الجدول أصلًا.
   * · **المسحاتُ تسمّي نفسَها** («٨٥ مسحة»): لا ترويسةَ فوقها هنا، ورقمٌ عارٍ بجانب تاريخٍ
   *   لا يُعرَف ما هو.
   * · **أيقونتان للمسحات والتاريخ** يلبسهما الكرتُ رقاقتَه المنغَّمة.
   * · **الشارةُ تقول ما يعمل**: في الجدول تعلوها ترويسةُ «الحالة» فتكفي كلمة، وفي الكرت
   *   تقف وحدَها في شريط الفعل.
   * ويُزاد عمودٌ لا وجودَ له في الجدول: صدرُ الكرت.
   */
  const cardColumns: Column<QrLinkRow>[] = [
    { key: "qr", header: "", render: () => <span className="tico tico-lead" aria-hidden><QrCode /></span> },
    // الوجهةُ عمودُ كرتٍ لا عمودَ جدول: مضيفُها يسع سطرًا تحت الاسم، وكاملُها لا يسع صفًّا.
    { key: "target", header: "الوجهة", render: (r) => <span className="txt font-latin" dir="ltr">{targetHost(r.targetUrl)}</span> },
    ...columns.map((c) =>
      c.key === "scans"
          ? { ...c, icon: <ChartLineUp />, render: (r: QrLinkRow) => <span className="txt num">{countPhrase(r.scanCount, SCAN_UNIT)}</span> }
          : c.key === "created"
            ? { ...c, icon: <CalendarBlank /> }
            : c.key === "state"
              ? { ...c, render: (r: QrLinkRow) => <Badge tone={r.active ? "success" : "neutral"} size="sm">{r.active ? "الباركود يعمل" : "الباركود موقوف"}</Badge> }
              : c,
    ),
  ];

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<QrCode />}
      title="لا باركودات محفوظة بعد"
      description="أنشئ باركودًا باسمه ووجهته، فيُحفَظ هنا وتُعَدّ مسحاتُه وتُبدَّل وجهتُه بعد الطباعة."
      action={<Link href="/dashboard/tools/qr/new" className="abtn abtn-primary abtn-md"><Plus size={18} />باركود جديد</Link>}
    />
  );

  return (
    <>
      <PageHeader
        title="مولّد الباركود"
        action={{ label: "باركود جديد", icon: <Plus size={18} />, href: "/dashboard/tools/qr/new" }}
      />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<QrCode />} value={fmt(rows.length)} label="باركود محفوظ" />
        <Stat icon={<ChartLineUp />} value={fmt(totalScans)} label="مسحةٌ مُحصاة" tone="success" />
      </div>

      <Toolbar
        searchPlaceholder="ابحث باسم الباركود أو رمزه أو وجهته"
        search={search}
        onSearch={setSearch}
        filters={FILTERS}
        filterValues={filters}
        onFilter={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        onReset={() => { setSearch(""); setFilters({}); }}
        view={view}
        onViewChange={changeView}
      />

      {error ? (
        <p className="txt">تعذّرت قراءة باركوداتك: {error}</p>
      ) : view === "table" ? (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(r) => r.id}
          emptyState={emptyState}
          rowActions={actionsFor}
          onRowClick={openStats}
          rowTone={(r) => (r.active ? undefined : "neutral")}
        />
      ) : (
        // خدمةُ الكروت ترسم الكرتَ من أعمدة الجدول نفسِها، فلا كرتٌ يُخترَع لهذه الشاشة.
        // والهيئةُ **المضغوطة** مُقَرَّةٌ ٢٠٢٦-٠٨-٢٥ (معرضُها `/ui/cards-view`).
        <DataCards
          columns={cardColumns}
          rows={filtered}
          getRowId={(r) => r.id}
          spec={CARD_SPEC}
          variant="compact"
          emptyState={emptyState}
          rowActions={actionsFor}
          onRowClick={openStats}
          rowTone={(r) => (r.active ? undefined : "neutral")}
        />
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="md"
        title="تعديل الباركود"
        description="الوجهةُ تتبدّل والباركود المطبوعُ لا يتغيّر، فمن يمسحه بعد الحفظ يصل إلى الوجهة الجديدة."
        footer={
          <>
            <Button variant="primary" size="md" loading={pending} onClick={saveEdit}>حفظ</Button>
            <Button variant="ghost" size="md" disabled={pending} onClick={() => setEditing(null)}>إلغاء</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field
            label="اسم الباركود"
            icon={<TextAa />}
            innerIcon={<QrCode />}
            placeholder="اكتب اسم الباركود"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            helper="تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن يمسحه."
            required
          />
          <Field
            label="الوجهة"
            icon={<LinkSimple />}
            innerIcon={<Globe />}
            placeholder="https://adeeb.club"
            dir="ltr"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            helper="حيثما يصل من يمسح الباركود."
            required
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الباركود؟"
        text={confirmKill
          ? `سيُحذف «${confirmKill.title}» ومسحاتُه كلُّها. وكلُّ ملصقٍ مطبوعٍ يحمله يصير رمزًا ميّتًا. والإيقافُ يكفي إن أردتَ تعطيلَه فحسب.`
          : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const res = await deleteQrLink(confirmKill.id);
            if (res.ok) { toast.success(res.message); setConfirmKill(null); router.refresh(); } else toast.error(res.message);
          });
        }}
      />
    </>
  );
}
