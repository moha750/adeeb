"use client";

/**
 * غرفةُ الإحصاءات («ملخص المسيرة») على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `website/achievements/AchievementsView.tsx`
 * القديم: قائمةٌ واحدةٌ بلا مواضع ولا مرشّحات (وكاردُ «إحصاءات في الملخّص» هو عددُ القائمة نفسُه في شريط الأدوات)، والتحريرُ في
 * صفحته، والحذفُ بتأكيد، و**الترتيبُ بمحرّك القالب** (`reorder`، كان «تحريك لأعلى/لأسفل» في القائمة) — فهي قائمةٌ وحدها بلا كروت،
 * ولا ترتيبَ من رأس الجدول: ترتيبُ الملخّص يدويٌّ (`order`)، والفرزُ يُخفي ترتيبَه الحقيقيّ.
 */
import type { RoomView } from "../view";
import { ACHIEVEMENTS_ROOM } from "./achievements.meta";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Hash, ListNumbers } from "@phosphor-icons/react";
import { PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { matchesSearch } from "@adeeb/design-system";
import { DEFAULT_STAT_ICON, STAT_ICONS, StatIcon, asIconKey } from "@/app/_components/statIcons";
import type { AchievementRow } from "@/app/dashboard/website/achievements/data";
import { deleteAchievement, reorderAchievements } from "@/app/dashboard/website/achievements/actions";
import { AdActs, AdButton, AdCard, AdConfirm, AdRow, type AdCell, type AdFigure, type AdMeta, type AdOp } from "../primitives";
import { CollectionRoom } from "../collection";
import { fmtNum } from "../format";

const NEW_HREF = "/dashboard/website/achievements/new";

export function AchievementsRoom({ items, view }: { items: AchievementRow[]; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kill, setKill] = useState<AchievementRow | null>(null);

  /** موضعُ الإحصائيّة في القائمة كلِّها (لا فيما بقي بعد البحث) — والرقمُ رقمُ القديم (`i + 1`). */
  const place = useMemo(() => new Map(items.map((a, i) => [a.id, i])), [items]);
  const indexOf = (a: AchievementRow) => place.get(a.id) ?? 0;

  /** قائمةُ الصفّ: الحذفُ وحده (والتحريكُ صار محرّكَ القالب، و«تحرير» الأساسيّ — وجهةُ النقر على الكرت والصفّ في القديمة). */
  const ops = (a: AchievementRow): AdOp[] => [
    { key: "del", label: "حذف", icon: <Trash />, onClick: () => setKill(a), danger: true },
  ];
  const editHref = (a: AchievementRow) => `/dashboard/website/achievements/${a.id}/edit`;
  const acts = (a: AchievementRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "تحرير", icon: <PencilSimple />, href: editHref(a) }} ops={ops(a)} />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: أيقونةُ الإحصائيّة سطرُ معلومةٍ برمزها نفسِه واسمِه من المنتقي (كانت قرصَ رأس الكرت وعمودَ
   * «الأيقونة» في الجدول؛ والمفتاحُ الفارغ يقع على الافتراض كما في القديم)، والرقمُ رقمُ الكرت وعمودُ الجدول بـ«+» إن كان
   * (`formatThousands` القديم: أرقامٌ لاتينيّةٌ بفواصل الآلاف، وهو ما يكتبه `fmtNum`)، والكعبُ ترتيبُها (كان «الترتيب N» في ذيل
   * الكرت وعمودًا في الجدول).
   */
  const info = (a: AchievementRow): AdMeta[] => [
    { icon: <StatIcon name={a.icon} />, text: `أيقونة «${STAT_ICONS[asIconKey(a.icon) ?? DEFAULT_STAT_ICON].label}»` },
  ];
  const countOf = (a: AchievementRow) => `${fmtNum(a.count)}${a.plus ? "+" : ""}`;
  const figures = (a: AchievementRow): AdFigure[] => [{ value: countOf(a), label: "الرقم", icon: <Hash /> }];
  const cells = (a: AchievementRow): AdCell[] => [{ label: "الرقم", value: countOf(a) }];
  const stubOf = (a: AchievementRow) => ({ big: fmtNum(indexOf(a) + 1), small: "الترتيب" });

  const create = <AdButton variant="fill" icon={<Plus />} href={NEW_HREF}>إحصائيّة جديدة</AdButton>;

  return (
    <>
      <CollectionRoom<AchievementRow>
        navPath={ACHIEVEMENTS_ROOM.navPath}
        title={ACHIEVEMENTS_ROOM.title}
        action={{ label: "إحصائيّة جديدة", icon: <Plus />, href: NEW_HREF }}
        noun={["إحصائيّةٌ واحدة", "إحصائيّتان", "إحصاءات", "إحصائيّةً"]}
        items={items}
        positions={[]}
        searchPlaceholder="ابحث باسم الإحصائيّة…"
        matchSearch={(a, q) => matchesSearch(q, a.label)}
        viewKey={ACHIEVEMENTS_ROOM.viewKey}
        initialView={view}
        idOf={(a) => a.id}
        // الترتيبُ بمحرّك القالب (سحبٌ أو سهمان) بدل «تحريك لأعلى/لأسفل» في قائمة الصفّ خطوةً خطوة
        reorder={{ title: (a) => a.label, save: reorderAchievements }}
        table={{
          head: "الإحصائيّة",
          stub: { key: "order", label: "الترتيب", icon: <ListNumbers /> },
          columns: [{ key: "count", label: "الرقم", icon: <Hash /> }],
        }}
        emptyAll={{ title: "لا إحصاءات بعد", desc: "أضِف أوّل إحصائيّة، تظهر مباشرةً في «ملخص المسيرة» بحجمٍ يتناسب مع رقمها." }}
        createAction={create}
        renderCard={(a) => (
          <AdCard
            key={a.id}
            seed={a.id}
            stub={stubOf(a)}
            title={a.label}
            href={editHref(a)}
            meta={info(a)}
            figures={figures(a)}
            foot={acts(a)}
          />
        )}
        renderRow={(a) => (
          <AdRow
            key={a.id}
            title={a.label}
            href={editHref(a)}
            stub={{ ...stubOf(a), seed: a.id }}
            sub={info(a)}
            cells={cells(a)}
            acts={acts(a, true)}
          />
        )}
      />
      <AdConfirm
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الإحصائيّة؟"
        text={kill ? `ستُحذف «${kill.label}» من ملخّص المسيرة نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteAchievement(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
