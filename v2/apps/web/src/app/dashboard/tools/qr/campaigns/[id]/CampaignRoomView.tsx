"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Stat, countPhrase, matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, ChartLineUp, Megaphone, QrCode, Trophy } from "@phosphor-icons/react";
import { ArrowLeft, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../../../_components/DataTable";
import { DataCards, type CardSpec } from "../../../../_components/DataCards";
import { PageHeader } from "../../../../_components/PageHeader";
import { Toolbar } from "../../../../_components/Toolbar";
import { usePersistentView } from "../../../../_components/usePersistentView";
import { EmptyState } from "../../../../_components/EmptyState";
import { ConfirmDialog } from "../../../../_components/ConfirmDialog";
import { useToast } from "../../../../_components/ToastProvider";
import type { MenuGroup } from "../../../../_components/DropdownMenu";
import { formatThousands as fmt } from "@/app/_components/format";
import { fmtDate } from "@/lib/dates";
import { SCAN_UNIT } from "../../copy";
import type { QrLinkRow } from "../../data";
import { campaignKillText, linkOutText } from "../copy";
import { CampaignFormModal } from "../CampaignFormModal";
import { CampaignShares } from "../CampaignShares";
import { AssignCampaignModal } from "../AssignCampaignModal";
import { deleteQrCampaign, setLinksCampaign } from "../actions";
import type { QrCampaignBrief, QrCampaignRow, QrCampaignShare } from "../data";
import type { QrOwnerBrief } from "../../oversight/data";

/**
 * **غرفةُ الحملة** — الجوابُ عن السؤالين اللذين وُلدت الحاويةُ لأجلهما:
 * «كم مسحةً للحملة كلِّها؟» في صفّ الصدر، و«أيُّ موضعٍ نجح؟» في عمود **النصيب**.
 *
 * **والنصيبُ لا الرقمُ المطلق**: ٤١٢ مسحةً لا تقول شيئًا وحدَها، و٣٣٪ من مجموع الحملة
 * تقول إنّ ثلثَ من جاء دخل من بوّابة المعرض. ولذلك يُحسَب من مجموع الحاوية لا من عمر
 * الباركود.
 *
 * **والإخراجُ من الحملة ليس حذفًا**: الملصقُ يخرج ويبقى يعمل ومسحاتُه له، ويسقط من
 * مجموعها وحسب. فالتأكيدُ نغمتُه تحذيرٌ لا خطر.
 *
 * **والغرفةُ يدخلها ثلاثة** (م٢٠): مالكُها، وشريكٌ يحرّر باركوداتها، وشريكٌ يقرأ. و**البنيةُ
 * للمالك وحدَه**: التسميةُ والحذفُ والضمُّ والإخراجُ وإنشاءُ باركودٍ فيها والمشاركةُ نفسُها.
 * فما لا يملكه الناظرُ لا يُعرَض له زرُّه: بندٌ يَعِد بما تردّه القاعدةُ وعدٌ لا يُوفى.
 */

const CARD_SPEC: CardSpec = {
  lead: "ic",
  title: "title",
  badge: "state",
  facts: ["scans", "share", "created"],
  bareFacts: true,
};

export function CampaignRoomView({
  campaign,
  links,
  shares = [],
  candidates = [],
  campaigns = [],
}: {
  campaign: QrCampaignRow;
  links: QrLinkRow[];
  shares?: QrCampaignShare[];
  candidates?: QrOwnerBrief[];
  /** حملاتُ المالك: لنقل ملصقٍ من هذه الحاوية إلى أختها (م١٨). */
  campaigns?: QrCampaignBrief[];
}) {
  /** المالكُ وحدَه يعيد ترتيبَ الحاوية. والشريكُ يعمل فيما بداخلها. */
  const isOwner = campaign.access === "owner";
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [view, changeView] = usePersistentView("qr-links-view");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [confirmOut, setConfirmOut] = useState<QrLinkRow | null>(null);
  const [moving, setMoving] = useState<string[] | null>(null);

  const filtered = useMemo(
    () => links.filter((r) => matchesSearch(search, `${r.title} ${r.code} ${r.targetUrl}`)),
    [links, search],
  );

  const top = links[0] ?? null; // القراءةُ ترد مرتَّبةً بالمسحات تنازليًّا
  const share = (n: number) => (campaign.scans ? Math.round((n / campaign.scans) * 100) : 0);

  const pullOut = (r: QrLinkRow) => {
    startPending(async () => {
      const res = await setLinksCampaign([r.id], null);
      if (res.ok) { toast.success(res.message); setConfirmOut(null); router.refresh(); } else toast.error(res.message);
    });
  };

  const actionsFor = (r: QrLinkRow): MenuGroup[] => [
    { header: "إجراءات", items: [
      { label: "الإحصاءات", icon: <ChartLineUp />, onSelect: () => router.push(`/dashboard/tools/qr/${r.id}`) },
      { label: "الإعدادات", icon: <PencilSimple />, onSelect: () => router.push(`/dashboard/tools/qr/${r.id}/settings`) },
      // **والنقلُ موضعُه ههنا** (٢٠٢٦-٠٩-٢٤): يومَ أُخفي ما يتبع حملةً من القائمة المفردة
      // لم يبقَ للنقل بين حاويتين بابٌ إلّا غرفةُ الحاوية نفسِها. ولا يُعرَض إلّا لمن له
      // حاويةٌ أخرى يُنقَل إليها.
      ...(isOwner && campaigns.length > 1
        ? [{ label: "نقلٌ إلى حملة أخرى", icon: <Megaphone />, onSelect: () => setMoving([r.id]) }]
        : []),
      ...(isOwner
        ? [{ label: "إخراجٌ من الحملة", icon: <ArrowLeft />, onSelect: () => setConfirmOut(r) }]
        : []),
    ] },
  ];

  const columns: Column<QrLinkRow>[] = [
    { key: "title", header: "الباركود", width: "minmax(180px, 2fr)", render: (r) => <span className="txt"><b>{r.title}</b></span> },
    { key: "scans", header: "المسحات", width: "0.9fr", align: "center", icon: <ChartLineUp />, render: (r) => <span className="txt num">{fmt(r.scanCount)}</span> },
    {
      key: "share", header: "نصيبُه من الحملة", width: "1fr", align: "center", icon: <Trophy />,
      render: (r) => <span className="txt num" dir="ltr">{share(r.scanCount)}%</span>,
    },
    {
      key: "state", header: "الحالة", width: "0.9fr", align: "center",
      render: (r) => <Badge tone={r.active ? "success" : "neutral"} size="sm">{r.active ? "يعمل" : "موقوف"}</Badge>,
    },
    { key: "created", header: "أُنشئ", width: "1fr", align: "center", icon: <CalendarBlank />, render: (r) => <span className="txt num">{fmtDate(r.createdAt)}</span> },
  ];

  const cardColumns: Column<QrLinkRow>[] = [
    { key: "ic", header: "", render: () => <span className="tico tico-lead" aria-hidden><QrCode /></span> },
    ...columns.map((c) =>
      c.key === "scans"
        ? { ...c, render: (r: QrLinkRow) => <span className="txt num">{countPhrase(r.scanCount, SCAN_UNIT)}</span> }
        : c.key === "state"
          ? { ...c, render: (r: QrLinkRow) => <Badge tone={r.active ? "success" : "neutral"} size="sm">{r.active ? "الباركود يعمل" : "الباركود موقوف"}</Badge> }
          : c,
    ),
  ];

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<QrCode />}
      title="حملةٌ تنتظر ملصقاتِها"
      description="أنشئ باركودًا داخلها، أو ضُمّ إليها باركودًا من قائمة «باركودات مفردة»."
      action={
        isOwner ? (
          <Link href={`/dashboard/tools/qr/new?campaign=${campaign.id}`} className="abtn abtn-primary abtn-md">
            <Plus size={18} />باركود في الحملة
          </Link>
        ) : undefined
      }
    />
  );

  return (
    <>
      <PageHeader
        title={campaign.name}
        crumbLeaf={campaign.name}
        parent={{ label: "الحملات", href: "/dashboard/tools/qr/campaigns" }}
        {...(isOwner
          ? {
              action: {
                label: "باركود جديد",
                icon: <Plus size={18} />,
                href: `/dashboard/tools/qr/new?campaign=${campaign.id}`,
              } as const,
              menu: [
                { header: "إجراءات", items: [{ label: "تعديل الاسم والتعريف", icon: <PencilSimple />, onSelect: () => setEditing(true) }] },
                { header: "منطقة الخطر", danger: true, items: [{ label: "حذف الحملة", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(true) }] },
              ],
            }
          : {
              // **والشريكُ يُقال له منزلتُه** بدل زرٍّ لا يملكه: شارةُ الحال موضعُها.
              status: {
                label: campaign.access === "edit" ? "مشاركة، تحرير" : "مشاركة، قراءة",
                tone: "info" as const,
              },
            })}
      />

      {campaign.note ? <p className="txt" style={{ marginBottom: 14 }}>{campaign.note}</p> : null}

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<QrCode />} value={fmt(campaign.links)} label="باركودٌ في الحملة" />
        <Stat icon={<ChartLineUp />} value={fmt(campaign.scans)} label="مسحةٌ للحملة كلِّها" tone="success" />
        {/**
          * **ولا يُعرَض النصيبُ لحاويةٍ فارغة**: «٠٪ نصيبُ أنشطِ ملصق» جوابٌ عن سؤالٍ لم
          * يُسأل بعد، ويقرؤه صاحبُه عطلًا. وصفٌّ من كرتين يقتسمانه بحكم ق٦ بلا فراغ.
          */}
        {top ? (
          <Stat
            icon={<Trophy />}
            value={`${share(top.scanCount)}%`}
            label="نصيبُ أنشطِ ملصق"
            note={top.title}
            tone="warning"
          />
        ) : null}
      </div>

      <Toolbar
        searchPlaceholder="ابحث في باركودات الحملة"
        search={search}
        onSearch={setSearch}
        onReset={() => setSearch("")}
        view={view}
        onViewChange={changeView}
      />

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(r) => r.id}
          emptyState={emptyState}
          rowActions={actionsFor}
          onRowClick={(r) => router.push(`/dashboard/tools/qr/${r.id}`)}
          rowTone={(r) => (r.active ? undefined : "neutral")}
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
          onRowClick={(r) => router.push(`/dashboard/tools/qr/${r.id}`)}
          rowTone={(r) => (r.active ? undefined : "neutral")}
          openLabel="فتح الإحصاء"
        />
      )}

      {/* **لوحُ الشركاء ذيلُ الغرفة**: يراه الجميعُ ليعرفوا من معهم، ويديره المالكُ وحدَه. */}
      <CampaignShares campaignId={campaign.id} rows={shares} candidates={candidates} canManage={isOwner} />

      <AssignCampaignModal
        mode="move"
        open={moving !== null}
        linkIds={moving ?? []}
        campaigns={campaigns.filter((c) => c.id !== campaign.id)}
        onClose={() => setMoving(null)}
      />

      <CampaignFormModal open={editing} row={campaign} onClose={() => setEditing(false)} />

      {/* حمراءُ كأختها في القائمة (أمرُ المالك ٢٠٢٦-٠٩-٢٤): نافذةٌ واحدةٌ في بابين
          فلا تفترق نغمتُها. والإخراجُ أدناه يبقى تحذيرًا: الملصقُ يخرج ولا يذهب. */}
      <ConfirmDialog
        open={confirmKill}
        onClose={() => setConfirmKill(false)}
        tone="danger"
        icon={<Trash />}
        title="حذف الحملة؟"
        text={campaignKillText(campaign.name, campaign.links)}
        confirmLabel="حذف الحملة"
        loading={pending}
        onConfirm={() =>
          startPending(async () => {
            const res = await deleteQrCampaign(campaign.id);
            if (res.ok) { toast.success(res.message); router.push("/dashboard/tools/qr/campaigns"); } else toast.error(res.message);
          })
        }
      />

      <ConfirmDialog
        open={confirmOut !== null}
        onClose={() => setConfirmOut(null)}
        tone="warning"
        icon={<ArrowLeft />}
        title="إخراجٌ من الحملة؟"
        text={confirmOut ? linkOutText(confirmOut.title) : undefined}
        confirmLabel="إخراج"
        loading={pending}
        onConfirm={() => confirmOut && pullOut(confirmOut)}
      />
    </>
  );
}
