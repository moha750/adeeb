"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Stat, countPhrase, matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, ChartLineUp, Megaphone, QrCode } from "@phosphor-icons/react";
import { PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../../_components/DataTable";
import { DataCards, type CardSpec } from "../../../_components/DataCards";
import { PageHeader } from "../../../_components/PageHeader";
import { Toolbar } from "../../../_components/Toolbar";
import { usePersistentView } from "../../../_components/usePersistentView";
import { EmptyState } from "../../../_components/EmptyState";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import { useToast } from "../../../_components/ToastProvider";
import type { MenuGroup } from "../../../_components/DropdownMenu";
import { formatThousands as fmt } from "@/app/_components/format";
import { fmtDate } from "@/lib/dates";
import { QrRoomTabs } from "../QrRoomTabs";
import { SCAN_UNIT } from "../copy";
import { LINK_UNIT, campaignKillText } from "./copy";
import type { QrCampaignRow } from "./data";
import { deleteQrCampaign } from "./actions";
import { CampaignFormModal } from "./CampaignFormModal";

/**
 * **الحملات** — بابُ الحاويات في غرفة الباركود (الشكل ب، اختيارُ المالك ٢٠٢٦-٠٩-٢٤).
 *
 * كلُّ صفٍّ هنا حاويةٌ تُفتح على غرفتها: مجموعُها، ونصيبُ كلّ ملصقٍ فيها من ذلك المجموع.
 * **والفعلُ الأوّل هنا «حملة جديدة»** لا «باركود جديد»: زرٌّ واحدٌ ثابتٌ في البابين يعطي
 * الفعلَ الخطأ في نصف الوقت، والبابُ يقول ما يُصنَع فيه.
 *
 * **والحذفُ هيّنٌ ههنا بخلاف حذف الباركود**: `on delete set null` في القاعدة، فالباركوداتُ
 * تخرج من الحاوية وتبقى تعمل، ولا يموت ملصقٌ مطبوع.
 */

const CARD_SPEC: CardSpec = {
  lead: "ic",
  title: "name",
  subtitle: "note",
  facts: ["links", "scans"],
  bareFacts: true,
};

export function CampaignsView({ rows, error }: { rows: QrCampaignRow[]; error: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [view, changeView] = usePersistentView("qr-campaigns-view");
  const [search, setSearch] = useState("");
  /** `null` مغلقةٌ، و`{ row: null }` حاويةٌ جديدة، و`{ row }` تعديلُ قائمة. */
  const [form, setForm] = useState<{ row: QrCampaignRow | null } | null>(null);
  const [confirmKill, setConfirmKill] = useState<QrCampaignRow | null>(null);

  const filtered = useMemo(
    () => rows.filter((r) => matchesSearch(search, `${r.name} ${r.note ?? ""}`)),
    [rows, search],
  );

  const totals = useMemo(
    () => rows.reduce((acc, r) => ({ links: acc.links + r.links, scans: acc.scans + r.scans }), { links: 0, scans: 0 }),
    [rows],
  );

  const openNew = () => setForm({ row: null });
  const openEdit = (r: QrCampaignRow) => setForm({ row: r });

  const open = (r: QrCampaignRow) => router.push(`/dashboard/tools/qr/campaigns/${r.id}`);

  /**
   * **وما شُورِكتَ فيه تفتحه ولا تعيد ترتيبَه** (م٢٠): التسميةُ والحذفُ للمالك، فلا يُعرَض
   * بندٌ تردّه القاعدةُ. والفتحُ يبقى للجميع، وفيه يقرأ الشريكُ ما له.
   */
  const actionsFor = (r: QrCampaignRow): MenuGroup[] =>
    r.access === "owner"
      ? [
          { header: "إجراءات", items: [
            { label: "فتح الحملة", icon: <Megaphone />, onSelect: () => open(r) },
            { label: "تعديل الاسم والتعريف", icon: <PencilSimple />, onSelect: () => openEdit(r) },
          ] },
          { header: "منطقة الخطر", danger: true, items: [
            { label: "حذف الحملة", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(r) },
          ] },
        ]
      : [{ header: "إجراءات", items: [{ label: "فتح الحملة", icon: <Megaphone />, onSelect: () => open(r) }] }];

  /**
   * أعمدةُ الحاوية. و«أنشطُ ملصقٍ فيها» **عرضُه `auto` ولفُّه حرّ**: نصٌّ حرٌّ في مسارِ
   * `fr` يجرّ الشبكةَ إلى أطولِ سطرٍ فيه فيصير التمريرُ الأفقيُّ شرطًا لقراءة أيّ صفّ
   * (درسُ سجلّ ديبو ٢٠٢٦-٠٨-٢٢).
   */
  const columns: Column<QrCampaignRow>[] = [
    {
      // **والمشاركةُ تُقال في خانة الاسم** لا في عمودٍ رابع: خبرٌ يخصّ قليلًا من الصفوف،
      // وعمودٌ كاملٌ لأجله يأكل عرضًا في شاشةٍ مقياسُها ٣٧٥.
      key: "name", header: "الحملة", width: "minmax(180px, 2fr)",
      render: (r) => (
        <span className="txt">
          <b>{r.name}</b>
          {r.access === "owner" ? null : (
            <Badge tone="info" size="sm" className="ms-2">
              {r.access === "edit" ? "مشاركة، تحرير" : "مشاركة، قراءة"}
            </Badge>
          )}
        </span>
      ),
    },
    { key: "links", header: "باركوداتها", width: "1fr", align: "center", icon: <QrCode />, render: (r) => <span className="txt num">{fmt(r.links)}</span> },
    { key: "scans", header: "المسحات", width: "1fr", align: "center", icon: <ChartLineUp />, render: (r) => <span className="txt num">{fmt(r.scans)}</span> },
    {
      key: "top", header: "أنشطُ ملصقٍ فيها", width: "auto", wrap: true,
      render: (r) => <span className="txt">{r.topTitle ?? "لا ملصقَ بعد"}</span>,
    },
    { key: "created", header: "أُنشئت", width: "1fr", align: "center", icon: <CalendarBlank />, render: (r) => <span className="txt num">{fmtDate(r.createdAt)}</span> },
  ];

  /** أعمدةُ الكرت: أعمدةُ الجدول نفسُها، وتُزاد صدرُه ويُسمّي عددُه نفسَه بلا ترويسةٍ فوقه. */
  const cardColumns: Column<QrCampaignRow>[] = [
    { key: "ic", header: "", render: () => <span className="tico tico-lead" aria-hidden><Megaphone /></span> },
    { key: "note", header: "التعريف", render: (r) => <span className="txt">{r.note ?? ""}</span> },
    ...columns.map((c) =>
      c.key === "links"
        ? { ...c, render: (r: QrCampaignRow) => <span className="txt num">{countPhrase(r.links, LINK_UNIT)}</span> }
        : c.key === "scans"
          ? { ...c, render: (r: QrCampaignRow) => <span className="txt num">{countPhrase(r.scans, SCAN_UNIT)}</span> }
          : c,
    ),
  ];

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<Megaphone />}
      title="لا حملات بعد"
      description="الحملةُ حاويةٌ تجمع ملصقاتِ عملٍ واحد، فتُقرأ مسحاتُها مجموعةً ويُعرَف أيُّ موضعٍ نجح."
      action={<Button size="sm" onClick={openNew}><Plus size={18} />حملة جديدة</Button>}
    />
  );

  return (
    <>
      <PageHeader title="مولّد الباركود" crumbLeaf="الحملات" action={{ label: "حملة جديدة", icon: <Plus size={18} />, onClick: openNew }} />

      <QrRoomTabs on="campaigns" />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<Megaphone />} value={fmt(rows.length)} label="حملة قائمة" tone="warning" />
        <Stat icon={<QrCode />} value={fmt(totals.links)} label="باركودٌ داخلها" />
        <Stat icon={<ChartLineUp />} value={fmt(totals.scans)} label="مسحةٌ لها" tone="success" />
      </div>

      <Toolbar
        searchPlaceholder="ابحث باسم الحملة"
        search={search}
        onSearch={setSearch}
        onReset={() => setSearch("")}
        view={view}
        onViewChange={changeView}
      />

      {error ? (
        <p className="txt">تعذّرت قراءة حملاتك: {error}</p>
      ) : view === "table" ? (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(r) => r.id}
          emptyState={emptyState}
          rowActions={actionsFor}
          onRowClick={open}
        />
      ) : (
        <DataCards
          columns={cardColumns}
          rows={filtered}
          getRowId={(r) => r.id}
          spec={CARD_SPEC}
          variant="compact"
          emptyState={emptyState}
          rowActions={actionsFor}
          onRowClick={open}
          openLabel="فتح الحملة"
        />
      )}

      {/* مفتاحُ الصفّ يعيد تركيبَ النموذج، فتُبذَر حقولُه بالقيم بلا أثرٍ يزامنها. */}
      <CampaignFormModal
        key={form?.row?.id ?? "new"}
        open={form !== null}
        row={form?.row ?? null}
        onClose={() => setForm(null)}
      />

      {/* **نغمةُ الحذف خطرٌ لا تحذير** (أمرُ المالك ٢٠٢٦-٠٩-٢٤): جُعلت صفراءَ أوّلًا لأنّ
          التبعةَ هيّنة (الباركوداتُ تخرج وتبقى تعمل)، فأمر بالأحمر. والحذفُ حذفٌ: صفٌّ
          يذهب بلا رجعة، واللونُ يقول ذلك قبل النصّ. وتبقى نافذةُ الإخراج صفراء. */}
      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الحملة؟"
        text={confirmKill ? campaignKillText(confirmKill.name, confirmKill.links) : undefined}
        confirmLabel="حذف الحملة"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const res = await deleteQrCampaign(confirmKill.id);
            if (res.ok) { toast.success(res.message); setConfirmKill(null); router.refresh(); } else toast.error(res.message);
          });
        }}
      />
    </>
  );
}
