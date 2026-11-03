"use client";

/**
 * «حملات الباركود» على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `tools/qr/campaigns/CampaignsView.tsx` القديم:
 * بابُ الحاويات في مولّد الباركود، كلُّ سجلٍّ فيه حملةٌ تُفتح على غرفتها. والبحثُ بالاسم والتعريف، ولا مواضعَ ولا مرشّحات
 * (لم تكن). والفعلُ الأوّلُ على اللوح «حملة جديدة» (البابُ يقول ما يُصنَع فيه)، و**ما شُورِكتَ فيه تفتحه ولا تعيد ترتيبَه** (م٢٠):
 * التسميةُ والحذفُ للمالك وحده. والحذفُ هيّنٌ هنا (`on delete set null`: الباركوداتُ تخرج وتبقى تعمل) ونغمتُه حمراءُ بأمر المالك.
 * وجارُه «باركودات مفردة» فعلٌ ثانٍ على اللوح (`extra`)، كما يفتح هو هذا الباب.
 */
import type { RoomView } from "../view";
import { QR_CAMPAIGNS_ROOM } from "./qr-campaigns.meta";
import { QR_LINKS_ROOM } from "./qr-links.meta";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { matchesSearch } from "@adeeb/design-system";
import { Article, CalendarBlank, Megaphone, QrCode, Scan, Trophy, UsersThree } from "@phosphor-icons/react";
import { PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { campaignKillText } from "@/app/dashboard/tools/qr/campaigns/copy";
import { deleteQrCampaign } from "@/app/dashboard/tools/qr/campaigns/actions";
import type { QrCampaignRow } from "@/app/dashboard/tools/qr/campaigns/data";
import { CampaignFormModal } from "@/app/dashboard/tools/qr/campaigns/CampaignFormModal";
import { AdActs, AdBadge, AdButton, AdCard, AdConfirm, AdRow, type AdFigure, type AdMeta, type AdOp, type AdStub } from "../primitives";
import { CollectionRoom } from "../collection";
import { dayParts, fmtNum } from "../format";
import type { ArForms } from "@/lib/arabicCount";

const AR_CAMPAIGN: ArForms = ["حملةٌ واحدة", "حملتان", "حملات", "حملةً"];

export function QrCampaignsRoom({ rows, view }: { rows: QrCampaignRow[]; serverNow: number; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  /** `null` مغلقةٌ، و`{ row: null }` حاويةٌ جديدة، و`{ row }` تعديلُ قائمة — نافذةُ القديمة نفسُها. */
  const [form, setForm] = useState<{ row: QrCampaignRow | null } | null>(null);
  const [confirmKill, setConfirmKill] = useState<QrCampaignRow | null>(null);

  const openNew = () => setForm({ row: null });
  const roomHref = (r: QrCampaignRow) => `/dashboard/tools/qr/campaigns/${r.id}`;

  const kill = () => {
    if (!confirmKill) return;
    startPending(async () => {
      const res = await deleteQrCampaign(confirmKill.id);
      if (res.ok) { toast.success(res.message); setConfirmKill(null); router.refresh(); } else toast.error(res.message);
    });
  };

  /** الأساسيُّ فتحُ الحملة (وجهةُ النقر على الصفّ)، ثمّ للمالك وحده تعديلُ الاسم والتعريف، والحذفُ آخرُها. والشريكُ يفتح فحسب. */
  const ops = (r: QrCampaignRow): AdOp[] =>
    r.access === "owner"
      ? [
          { key: "edit", label: "تعديل الاسم والتعريف", icon: <PencilSimple />, onClick: () => setForm({ row: r }) },
          { key: "del", label: "حذف الحملة", icon: <Trash />, danger: true, onClick: () => setConfirmKill(r) },
        ]
      : [];
  const acts = (r: QrCampaignRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "فتح الحملة", icon: <Megaphone />, href: roomHref(r) }} ops={ops(r)} />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: المشاركةُ شارةٌ لما شُورِكتَ فيه وحده (كانت شارةً في خانة الاسم: خبرٌ يخصّ قليلًا من الصفوف)،
   * ثمّ الاسم، ثمّ التعريفُ (كان تحت اسم الكرت وحده) وأنشطُ ملصقٍ فيها (كان عمودَ الجدول وحده) سطرين في العرضين — وأنشطُها
   * سطرٌ لا عمود: نصٌّ حرٌّ لا يُقارَن بين السطور. والحملةُ الفارغةُ بلا سطرِ أنشطِها: «0» باركوداتِها تقولها.
   * والعددان رقما الكرت وعمودا السطر، والكعبُ يومُ الإنشاء (كان عمودَ «أُنشئت»).
   */
  const chips = (r: QrCampaignRow) =>
    r.access === "owner" ? undefined : (
      <AdBadge icon={<UsersThree />}>{r.access === "edit" ? "مشاركة، تحرير" : "مشاركة، قراءة"}</AdBadge>
    );
  const info = (r: QrCampaignRow): AdMeta[] => [
    ...(r.note ? [{ icon: <Article />, text: r.note, clip: true }] : []),
    ...(r.topTitle ? [{ icon: <Trophy />, text: `أنشطُها «${r.topTitle}»` }] : []),
  ];
  const stubOf = (r: QrCampaignRow): AdStub => { const d = dayParts(r.createdAt); return { big: d.day, small: d.month }; };
  const figures = (r: QrCampaignRow): AdFigure[] => [
    { icon: <QrCode />, value: fmtNum(r.links), label: "باركوداتها" },
    { icon: <Scan />, value: fmtNum(r.scans), label: "المسحات" },
  ];

  return (
    <>
      <CollectionRoom<QrCampaignRow>
        navPath={QR_CAMPAIGNS_ROOM.navPath}
        title={QR_CAMPAIGNS_ROOM.title}
        action={{ label: "حملة جديدة", icon: <Plus />, onClick: openNew }}
        // جارُ البابِ بابُه الآخر (كانا تبويبين بين مسارين)
        extra={{ label: QR_LINKS_ROOM.title, icon: <QrCode />, href: "/dashboard/tools/qr/links" }}
        noun={AR_CAMPAIGN}
        items={rows}
        positions={[]}
        searchPlaceholder="ابحث باسم الحملة…"
        matchSearch={(r, q) => matchesSearch(q, `${r.name} ${r.note ?? ""}`)}
        viewKey={QR_CAMPAIGNS_ROOM.viewKey}
        initialView={view}
        idOf={(r) => r.id}
        table={{
          // الترتيبُ بالاسم والتاريخ والعددين من رؤوسها كجداول الغرف كلّها (محمد ٢٠٢٦-١١-٠١؛ لم يكن في الجدول القديم)
          head: "الحملة",
          headSortBy: (r) => r.name,
          stub: { key: "created", label: "أُنشئت", icon: <CalendarBlank />, sortBy: (r) => +new Date(r.createdAt) },
          columns: [
            { key: "links", label: "باركوداتها", icon: <QrCode />, sortBy: (r) => r.links },
            { key: "scans", label: "المسحات", icon: <Scan />, sortBy: (r) => r.scans },
          ],
        }}
        emptyAll={{ title: "لا حملات بعد", desc: "الحملةُ حاويةٌ تجمع ملصقاتِ عملٍ واحد، فتُقرأ مسحاتُها مجموعةً ويُعرَف أيُّ موضعٍ نجح." }}
        createAction={<AdButton variant="fill" icon={<Plus />} onClick={openNew}>حملة جديدة</AdButton>}
        renderCard={(r) => (
          <AdCard
            key={r.id}
            seed={r.id}
            stub={stubOf(r)}
            chips={chips(r)}
            title={r.name}
            href={roomHref(r)}
            meta={info(r)}
            figures={figures(r)}
            foot={acts(r)}
          />
        )}
        renderRow={(r) => (
          <AdRow
            key={r.id}
            title={r.name}
            href={roomHref(r)}
            stub={{ ...stubOf(r), seed: r.id }}
            badge={chips(r)}
            sub={info(r)}
            cells={figures(r).map((f) => ({ label: f.label, value: f.value }))}
            acts={acts(r, true)}
          />
        )}
      />

      {/* نافذةُ القديمة كما هي: مفتاحُ الصفّ يعيد تركيبَها، فتُبذَر حقولُها بالقيم بلا أثرٍ يزامنها */}
      <CampaignFormModal key={form?.row?.id ?? "new"} open={form !== null} row={form?.row ?? null} onClose={() => setForm(null)} />

      {/* **نغمةُ الحذف خطرٌ لا تحذير** (أمرُ المالك ٢٠٢٦-٠٩-٢٤)، والتبعةُ من مصدرها الواحد (`campaigns/copy`) */}
      <AdConfirm
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الحملة؟"
        text={confirmKill ? campaignKillText(confirmKill.name, confirmKill.links) : undefined}
        confirmLabel="حذف الحملة"
        loading={pending}
        onConfirm={kill}
      />
    </>
  );
}
