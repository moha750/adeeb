"use client";

/**
 * غرفةُ حملةٍ بعينها على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `tools/qr/campaigns/[id]/CampaignRoomView.tsx`
 * القديم: باركوداتُ الحاوية مرتّبةً بالمسحات تنازليًّا (الغرفةُ تُفتح على «أيُّ موضعٍ نجح؟»)، والبحثُ بالاسم والرمز والوجهة،
 * ولا مواضعَ ولا مرشّحات (لم تكن). **والنصيبُ لا الرقمُ المطلق**: مسحاتُ كلّ باركودٍ جزءٌ من مسحات الحملة كلِّها، فرقمُه
 * «مسحاتُه / مسحاتُ الحملة» بشريط نسبته — وهي نصيبُه (كان عمودَ «نصيبُه من الحملة»)، وفيها مجموعُ الحملة (كان كاردَ الصدر).
 * **والبنيةُ للمالك وحده** (م٢٠): إنشاءُ باركودٍ فيها، والنقلُ إلى حملةٍ أخرى، والإخراجُ منها بتأكيدٍ تحذيريّ (الملصقُ يخرج ولا
 * يذهب). وشركاءُ الحملة لوحُها في ذيل الغرفة كما كان (`after`)، يراه الجميعُ ويديره المالك.
 * وتعريفُ الحملة قاعدتُها الدائمة فوق القائمة (`notice`)، والرجوعُ إلى «حملات الباركود» فعلٌ ثانٍ على اللوح (`extra`) — كان
 * رابطًا في الفتات، والقالبُ يشتقّ فتاتَه من الخريطة وليس فيها «الحملات».
 */
import type { RoomView } from "../view";
import { QR_CAMPAIGN_ROOM } from "./qr-campaign.meta";
import { QR_CAMPAIGNS_ROOM } from "./qr-campaigns.meta";
import { AR_QR, qrMatch, qrSettingsHref, qrState, qrStatsHref, qrStub, qrTarget } from "./QrLinksRoom";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarBlank, ChartLineUp, Megaphone, Scan } from "@phosphor-icons/react";
import { ArrowLeft, PencilSimple, Plus } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { linkOutText } from "@/app/dashboard/tools/qr/campaigns/copy";
import { setLinksCampaign } from "@/app/dashboard/tools/qr/campaigns/actions";
import type { QrLinkRow } from "@/app/dashboard/tools/qr/data";
import type { QrCampaignBrief, QrCampaignRow, QrCampaignShare } from "@/app/dashboard/tools/qr/campaigns/data";
import type { QrOwnerBrief } from "@/app/dashboard/tools/qr/oversight/data";
import { AssignCampaignModal } from "@/app/dashboard/tools/qr/campaigns/AssignCampaignModal";
import { CampaignShares } from "@/app/dashboard/tools/qr/campaigns/CampaignShares";
import { AdActs, AdButton, AdCard, AdConfirm, AdNote, AdRow, type AdFigure, type AdMeta, type AdOp } from "../primitives";
import { CollectionRoom } from "../collection";
import { fmtNum } from "../format";

export function QrCampaignRoom({
  campaign, links, shares = [], candidates = [], campaigns = [], view,
}: {
  campaign: QrCampaignRow;
  links: QrLinkRow[];
  shares?: QrCampaignShare[];
  candidates?: QrOwnerBrief[];
  /** حملاتُ المالك: لنقل ملصقٍ من هذه الحاوية إلى أختها (م١٨). */
  campaigns?: QrCampaignBrief[];
  serverNow: number;
  view?: RoomView;
}) {
  /** المالكُ وحده يعيد ترتيبَ الحاوية، والشريكُ يعمل فيما بداخلها. */
  const isOwner = campaign.access === "owner";
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [confirmOut, setConfirmOut] = useState<QrLinkRow | null>(null);
  const [moving, setMoving] = useState<string[] | null>(null);
  const newHref = `/dashboard/tools/qr/new?campaign=${campaign.id}`;

  const pullOut = (r: QrLinkRow) =>
    startPending(async () => {
      const res = await setLinksCampaign([r.id], null);
      if (res.ok) { toast.success(res.message); setConfirmOut(null); router.refresh(); } else toast.error(res.message);
    });

  /**
   * قائمةُ الصفّ القديمة بترتيبها: الإحصاءاتُ (وجهةُ النقر على الصفّ)، ثمّ الإعدادات، ثمّ **النقلُ إلى حملةٍ أخرى** للمالك
   * حين تكون له حاويةٌ أخرى (موضعُه هنا وحده منذ أُخفي ما في الحملات من القائمة المفردة)، ثمّ الإخراجُ للمالك.
   */
  const ops = (r: QrLinkRow): AdOp[] => [
    { key: "settings", label: "الإعدادات", icon: <PencilSimple />, href: qrSettingsHref(r) },
    ...(isOwner && campaigns.length > 1
      ? [{ key: "move", label: "نقلٌ إلى حملة أخرى", icon: <Megaphone />, onClick: () => setMoving([r.id]) }]
      : []),
    ...(isOwner ? [{ key: "out", label: "إخراجٌ من الحملة", icon: <ArrowLeft />, onClick: () => setConfirmOut(r) }] : []),
  ];
  const acts = (r: QrLinkRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "الإحصاءات", icon: <ChartLineUp />, href: qrStatsHref(r) }} ops={ops(r)} />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر** — لسانُ «باركودات مفردة» نفسُه (`QrLinksRoom`): الحالُ شارة، والوجهةُ سطرٌ تحت الاسم، والكعبُ
   * يومُ الإنشاء. والرقمُ مسحاتُه من مسحات الحملة بشريط نصيبه — والحملةُ بلا مسحاتٍ بعدُ رقمُها وحده («0%» جوابٌ عن سؤالٍ لم يُسأل).
   */
  const info = (r: QrLinkRow): AdMeta[] => [qrTarget(r)];
  const total = campaign.scans;
  const figures = (r: QrLinkRow): AdFigure[] => [{
    icon: <Scan />,
    label: "المسحات",
    value: total ? `${fmtNum(r.scanCount)} / ${fmtNum(total)}` : fmtNum(r.scanCount),
    of: total ? { now: r.scanCount, max: total } : undefined,
  }];

  return (
    <>
      <CollectionRoom<QrLinkRow>
        navPath={QR_CAMPAIGN_ROOM.navPath}
        title={campaign.name}
        // البنيةُ للمالك: باركودٌ جديدٌ يولد في الحملة نفسِها
        action={isOwner ? { label: "باركود جديد", icon: <Plus />, href: newHref } : undefined}
        extra={{ label: QR_CAMPAIGNS_ROOM.title, icon: <Megaphone />, href: "/dashboard/tools/qr/campaigns" }}
        notice={campaign.note ? <AdNote tone="info">{campaign.note}</AdNote> : undefined}
        // **لوحُ الشركاء ذيلُ الغرفة** كما كان: يراه الجميعُ ليعرفوا من معهم، ويديره المالكُ وحده
        after={<CampaignShares campaignId={campaign.id} rows={shares} candidates={candidates} canManage={isOwner} />}
        noun={AR_QR}
        items={links}
        positions={[]}
        searchPlaceholder="ابحث في باركودات الحملة…"
        matchSearch={qrMatch}
        viewKey={QR_CAMPAIGN_ROOM.viewKey}
        initialView={view}
        idOf={(r) => r.id}
        table={{
          // الترتيبُ بالاسم والتاريخ والمسحات من رؤوسها كجداول الغرف كلّها؛ وبلا فرزٍ ترتيبُ القراءة: المسحاتُ تنازليًّا
          head: "الباركود",
          headSortBy: (r) => r.title.toLowerCase(),
          stub: { key: "created", label: "أُنشئ", icon: <CalendarBlank />, sortBy: (r) => +new Date(r.createdAt) },
          columns: [{ key: "scans", label: "المسحات", icon: <Scan />, wide: true, sortBy: (r) => r.scanCount }],
        }}
        emptyAll={{ title: "حملةٌ تنتظر ملصقاتِها", desc: "أنشئ باركودًا داخلها، أو ضُمّ إليها باركودًا من قائمة «باركودات مفردة»." }}
        createAction={isOwner ? <AdButton variant="fill" icon={<Plus />} href={newHref}>باركود في الحملة</AdButton> : undefined}
        renderCard={(r) => (
          <AdCard
            key={r.id}
            seed={r.id}
            stub={qrStub(r)}
            chips={qrState(r)}
            title={r.title}
            href={qrStatsHref(r)}
            meta={info(r)}
            figures={figures(r)}
            foot={acts(r)}
          />
        )}
        renderRow={(r) => (
          <AdRow
            key={r.id}
            title={r.title}
            href={qrStatsHref(r)}
            stub={{ ...qrStub(r), seed: r.id }}
            badge={qrState(r)}
            sub={info(r)}
            cells={figures(r).map((f) => ({ label: f.label, value: f.value, of: f.of }))}
            acts={acts(r, true)}
          />
        )}
      />

      {/* نافذةُ النقل كما هي، والحاويةُ الحاليّةُ ليست بين وجهاتها */}
      <AssignCampaignModal
        mode="move"
        open={moving !== null}
        linkIds={moving ?? []}
        campaigns={campaigns.filter((c) => c.id !== campaign.id)}
        onClose={() => setMoving(null)}
      />

      {/* الإخراجُ تحذيرٌ لا خطر: الملصقُ يخرج ويبقى يعمل، ويسقط من مجموع الحملة وحسب */}
      <AdConfirm
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
