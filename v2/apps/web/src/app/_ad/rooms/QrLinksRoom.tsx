"use client";

/**
 * «باركودات مفردة» على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `tools/qr/SavedLinksView.tsx` القديم:
 * البابُ الأوّل في مولّد الباركود، **ولا يحمل إلّا ما لا حملةَ له** (قرارُ المالك ٢٠٢٦-٠٩-٢٤)، ما تملكه وما شُورِكتَ فيه.
 * والبحثُ بالاسم والرمز والوجهة، والحالُ مواضع (كانت مرشّحَ «الحالة»)، والتحديدُ الجماعيُّ في الجدول للضمّ إلى حملة.
 * وقائمةُ الصفّ بترتيبها: الإحصاءاتُ (وجهةُ النقر على الصفّ)، ثمّ الإعدادات، ثمّ المشاركةُ والضمُّ للمالك وحده، ثمّ الإيقافُ
 * أو إعادةُ التشغيل بلا تأكيد (الملصقُ المطبوعُ يعود بضغطة)، والحذفُ آخرُها بتأكيد.
 * **وجارُه «حملات الباركود» فعلٌ ثانٍ على اللوح** (`extra`): كان البابان تبويبين بين مسارين (`QrRoomTabs`)، والقالبُ لا يحمل
 * تبويبًا بين غرفتين، والمواضعُ تنخل سجلّاتٍ من نوعٍ واحد (الباركودُ غيرُ الحملة).
 */
import type { RoomView } from "../view";
import { QR_LINKS_ROOM } from "./qr-links.meta";
import { QR_CAMPAIGNS_ROOM } from "./qr-campaigns.meta";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, ChartLineUp, FileImage, FilePdf, LinkSimple, Megaphone, Pause, Play, Scan, UsersThree } from "@phosphor-icons/react";
import { PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { qrFileType, targetHost } from "@/lib/qrLinks";
import { qrFileLabel } from "@/app/dashboard/tools/qr/QrTarget";
import { killText } from "@/app/dashboard/tools/qr/copy";
import { deleteQrLink, setQrLinkActive } from "@/app/dashboard/tools/qr/actions";
import type { QrLinkRow } from "@/app/dashboard/tools/qr/data";
import type { QrCampaignBrief } from "@/app/dashboard/tools/qr/campaigns/data";
import { AssignCampaignModal } from "@/app/dashboard/tools/qr/campaigns/AssignCampaignModal";
import { AdActs, AdBadge, AdButton, AdCard, AdConfirm, AdRow, type AdFigure, type AdMeta, type AdOp, type AdStub } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { dayParts, fmtNum } from "../format";
import type { ArForms } from "@/lib/arabicCount";

/* ═══ لسانُ الباركود — تقرؤه غرفةُ الحملة أيضًا (`QrCampaignRoom`)، فالباركودُ واحدٌ في البابين ═══ */

export const AR_QR: ArForms = ["باركودٌ واحد", "باركودان", "باركودات", "باركودًا"];

/** صفحةُ الباركود بإحصائه (وجهةُ النقر على الصفّ في القديمتين)، وصفحةُ إعداداته. */
export const qrStatsHref = (r: QrLinkRow) => `/dashboard/tools/qr/${r.id}`;
export const qrSettingsHref = (r: QrLinkRow) => `/dashboard/tools/qr/${r.id}/settings`;

/** البحثُ بالحقول التي كانت القديمتان تقرآنها: الاسم، والرمز، والوجهة. */
export const qrMatch = (r: QrLinkRow, q: string) => matchesSearch(q, `${r.title} ${r.code} ${r.targetUrl}`);

/** الحالُ شارةٌ في العرضين (كانت عمودَ «الحالة» في الجدول وشارةَ الكرت) — بلغة إشراف الباركود. */
export function qrState(r: QrLinkRow) {
  return r.active ? <AdBadge tone="ok" icon={<Play />}>يعمل</AdBadge> : <AdBadge icon={<Pause />}>موقوف</AdBadge>;
}

/**
 * الوجهةُ كما كانت تحت اسم الكرت (`QrTarget`): الرابطُ مضيفُه بالخطّ اللاتينيّ، والملفُّ نوعُه بالعربيّة. **سطرُ معلوماتٍ في
 * العرضين لا عمود** (أمرُ المالك ٢٠٢٦-٠٨-٢٥: لا عمودَ للوجهة في الجدول)، فالسطرُ يقولها تحت الاسم كما يقولها الكرت.
 */
export function qrTarget(r: QrLinkRow): AdMeta {
  return r.kind === "file"
    ? { icon: r.filePath && qrFileType(r.filePath) === "pdf" ? <FilePdf /> : <FileImage />, text: qrFileLabel(r.filePath) }
    : { icon: <LinkSimple />, text: targetHost(r.targetUrl), ltr: true };
}

/** الكعبُ يومُ الإنشاء وشهرُه (كان عمودَ «أُنشئ» وحقيقةَ الكرت). */
export function qrStub(r: QrLinkRow): AdStub {
  const d = dayParts(r.createdAt);
  return { big: d.day, small: d.month };
}

/**
 * **مواضعُ الباركودات بحالها**: كان فوق القائمة القديمة مرشّحُ «الحالة» (يعمل، موقوف) — فصار مواضعَ بأعدادها، والكلُّ
 * أوّلُها، كما في إشراف الباركود. وكاردا الإحصاء («باركود محفوظ»، «مسحةٌ مُحصاة») حسابُ الغرفة كلِّها بحملاتها، لا حالٌ
 * في هذا الباب: مكانُهما صفحةُ الإحصاء.
 */
const POSITIONS: Position<QrLinkRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا باركودات محفوظة بعد." },
  { key: "active", label: "يعمل", match: (r) => r.active, empty: "لا باركود يعمل الآن." },
  { key: "paused", label: "موقوف", match: (r) => !r.active, empty: "لا باركود موقوف." },
];

const NEW_HREF = "/dashboard/tools/qr/new";

export function QrLinksRoom({
  rows, meId = null, campaigns = [], view,
}: {
  rows: QrLinkRow[];
  /** صاحبُ الجلسة: القائمةُ تحمل ما يملكه وما شُورِك فيه، والمشاركةُ والضمُّ للمالك وحدَه. */
  meId?: string | null;
  /** حملاتُه أسماءً: لنافذة الضمّ (م١٨). */
  campaigns?: QrCampaignBrief[];
  serverNow: number;
  view?: RoomView;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [confirmKill, setConfirmKill] = useState<QrLinkRow | null>(null);
  const [assign, setAssign] = useState<string[] | null>(null);

  /**
   * **البابُ لا يحمل إلّا ما لا حاويةَ له** (قرارُ المالك ٢٠٢٦-٠٩-٢٤)، **والنخلُ قبل البحث لا بعده**: البحثُ لا يبلغ ما ليس
   * في الباب أصلًا. وموضعُ ما في الحملات غرفتُها.
   */
  const loose = useMemo(() => rows.filter((r) => !r.campaignId), [rows]);

  const toggleActive = (r: QrLinkRow) =>
    startPending(async () => {
      const res = await setQrLinkActive(r.id, !r.active);
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.message);
    });

  const kill = () => {
    if (!confirmKill) return;
    startPending(async () => {
      const res = await deleteQrLink(confirmKill.id);
      if (res.ok) { toast.success(res.message); setConfirmKill(null); router.refresh(); } else toast.error(res.message);
    });
  };

  /**
   * قائمةُ الصفّ القديمة بترتيبها: الإعداداتُ إلى بابها، و**المشاركةُ والضمُّ للمالك وحده** (القاعدةُ تردّ غيرَه، وبندٌ يَعِد
   * بما تردّه وعدٌ لا يُوفى)، ثمّ الإيقافُ أو إعادةُ التشغيل، ثمّ الحذفُ في منطقة الخطر — والقالبُ يجعله آخرَ «المزيد» بالأحمر.
   */
  const ops = (r: QrLinkRow): AdOp[] => {
    const own = !meId || r.ownerId === meId;
    return [
      { key: "settings", label: "الإعدادات", icon: <PencilSimple />, href: qrSettingsHref(r) },
      // طريقٌ مختصرٌ إلى المشاركة (المالك ٢٠٢٦-٠٩-٠٦): يحمل إلى الإعدادات ويفتح نافذتَها
      ...(own ? [{ key: "share", label: "المشاركة", icon: <UsersThree />, href: `${qrSettingsHref(r)}?share=1` }] : []),
      ...(own ? [{ key: "assign", label: "ضمٌّ إلى حملة", icon: <Megaphone />, onClick: () => setAssign([r.id]) }] : []),
      r.active
        ? { key: "pause", label: "إيقاف الباركود", icon: <Pause />, disabled: pending, onClick: () => toggleActive(r) }
        : { key: "play", label: "إعادة التشغيل", icon: <Play />, disabled: pending, onClick: () => toggleActive(r) },
      { key: "del", label: "حذف الباركود", icon: <Trash />, danger: true, onClick: () => setConfirmKill(r) },
    ];
  };
  const acts = (r: QrLinkRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "الإحصاءات", icon: <ChartLineUp />, href: qrStatsHref(r) }} ops={ops(r)} />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: الحالُ شارة، ثمّ اسمُ الباركود، ثمّ وجهتُه سطرًا تحته (كانت تحت اسم الكرت، ولا عمودَ لها في
   * الجدول)، والمسحاتُ رقمُ الكرت وعمودُ السطر، والكعبُ يومُ الإنشاء.
   */
  const info = (r: QrLinkRow): AdMeta[] => [qrTarget(r)];
  const figures = (r: QrLinkRow): AdFigure[] => [{ icon: <Scan />, value: fmtNum(r.scanCount), label: "المسحات" }];

  return (
    <>
      <CollectionRoom<QrLinkRow>
        navPath={QR_LINKS_ROOM.navPath}
        title={QR_LINKS_ROOM.title}
        action={{ label: "باركود جديد", icon: <Plus />, href: NEW_HREF }}
        // جارُ البابِ بابُه الآخر (كانا تبويبين بين مسارين): نصٌّ هادئٌ على اللوح يفتح «حملات الباركود»
        extra={{ label: QR_CAMPAIGNS_ROOM.title, icon: <Megaphone />, href: "/dashboard/tools/qr/campaigns" }}
        noun={AR_QR}
        items={loose}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث باسم الباركود أو رمزه أو وجهته…"
        matchSearch={qrMatch}
        viewKey={QR_LINKS_ROOM.viewKey}
        initialView={view}
        idOf={(r) => r.id}
        // الضمُّ الجماعيّ كما كان في شريط أدوات القديمة: يُحدَّد في الجدول ويُضمّ إلى حملة (والقاعدةُ تردّ ما ليس لك)
        bulk={(ids) => [{ key: "assign", label: "ضمّ إلى حملة", icon: <Megaphone />, onClick: () => setAssign(ids) }]}
        table={{
          // الترتيبُ بالاسم والتاريخ والمسحات من رؤوسها كجداول الغرف كلّها (محمد ٢٠٢٦-١١-٠١؛ لم يكن في الجدول القديم)
          head: "الباركود",
          headSortBy: (r) => r.title.toLowerCase(),
          stub: { key: "created", label: "أُنشئ", icon: <CalendarBlank />, sortBy: (r) => +new Date(r.createdAt) },
          columns: [{ key: "scans", label: "المسحات", icon: <Scan />, sortBy: (r) => r.scanCount }],
        }}
        emptyAll={{ title: "لا باركودات محفوظة بعد", desc: "أنشئ باركودًا باسمه ووجهته، فيُحفَظ هنا وتُعَدّ مسحاتُه وتُبدَّل وجهتُه بعد الطباعة." }}
        createAction={<AdButton variant="fill" icon={<Plus />} href={NEW_HREF}>باركود جديد</AdButton>}
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
            cells={figures(r).map((f) => ({ label: f.label, value: f.value }))}
            acts={acts(r, true)}
          />
        )}
      />

      {/* نافذةُ الضمّ كما هي — للواحد من «المزيد» وللمحدَّد من شريط التحديد */}
      <AssignCampaignModal open={assign !== null} linkIds={assign ?? []} campaigns={campaigns} onClose={() => setAssign(null)} />

      {/* تبعةُ الحذف من مصدرها الواحد (`copy`)، هي هي في صفحة الإحصاء وفي الإشراف */}
      <AdConfirm
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الباركود؟"
        text={confirmKill ? killText(confirmKill.title) : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={kill}
      />
    </>
  );
}
