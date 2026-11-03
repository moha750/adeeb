"use client";

/**
 * غرفةُ معرض الأعمال على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١) — السلوكُ سلوكُ `website/works/WorksView.tsx` القديم:
 * قائمةٌ واحدةٌ بلا مواضع ولا مرشّحات، و**ترتيبُه بسحب كعب السجلّ في القائمة نفسِها** (محمد
 * ٢٠٢٦-١١-٠١، كان «تحريكًا لأعلى/لأسفل» خطوةً خطوة في القائمة)، والحذفُ بتأكيد، ورابطُه يُفتح في لسانٍ جديد (وبلا رابطٍ «عارض داخليّ»). ولا ترتيبَ
 * من رأس الجدول: ترتيبُ المعرض يدويٌّ (`order`)، والفرزُ يُخفي ترتيبَه الحقيقيّ.
 */
import type { RoomView } from "../view";
import { WORKS_ROOM } from "./works.meta";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LinkSimple, ListNumbers } from "@phosphor-icons/react";
import { ArrowUpRight, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { matchesSearch } from "@adeeb/design-system";
import type { WorkRow } from "@/app/dashboard/website/works/data";
import { deleteWork, reorderWorks } from "@/app/dashboard/website/works/actions";
import { AdActs, AdBadge, AdButton, AdCard, AdConfirm, AdRow, type AdCell, type AdMeta, type AdOp } from "../primitives";
import { CollectionRoom } from "../collection";
import { fmtNum } from "../format";

/** نطاقُ الرابط للعرض المختصر (بلا بروتوكول ولا www)، أو الرابطُ كما هو إن تعذّر — كما في القديم. */
function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
/** العملُ بلا رابطٍ يُعرض في عارض الموقع الداخليّ — نصُّ القديم في مكان الرابط. */
const INTERNAL = "عارض داخليّ";

export function WorksRoom({ works, view }: { works: WorkRow[]; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kill, setKill] = useState<WorkRow | null>(null);

  /** موضعُ العمل في القائمة كلِّها (لا فيما بقي بعد البحث) — والرقمُ رقمُ القديم (`i + 1`). */
  const place = useMemo(() => new Map(works.map((w, i) => [w.id, i])), [works]);
  const indexOf = (w: WorkRow) => place.get(w.id) ?? 0;

  /**
   * فتحُ الرابط أوّلًا (كان ظاهرًا في قاع الكرت وعمودِ الجدول، ويُفتح في لسانٍ جديد)، ثمّ الحذفُ آخرُها
   * (والتحريكُ صار سحبَ الكعب؛ و«تحرير» الأساسيّ).
   */
  const ops = (w: WorkRow): AdOp[] => {
    const url = w.linkUrl;
    return [
      ...(url ? [{ key: "link", label: "فتح الرابط", icon: <ArrowUpRight />, onClick: () => window.open(url, "_blank", "noopener,noreferrer") }] : []),
      { key: "del", label: "حذف", icon: <Trash />, onClick: () => setKill(w), danger: true },
    ];
  };
  const editHref = (w: WorkRow) => `/dashboard/website/works/${w.id}/edit`;
  const acts = (w: WorkRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "تحرير", icon: <PencilSimple />, href: editHref(w) }} ops={ops(w)} />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: التصنيفُ رقاقةٌ في العرضين (كان عنوانًا فرعيًّا في الكرت، وبعد العنوان في الجدول)،
   * والرابطُ سطرٌ في الكرت وعمودٌ في الجدول (كان عمودًا فيه، فيخرج من سطوره). والكعبُ ترتيبُ العمل (كان «الترتيب N»
   * في قاع الكرت، وعمودًا في الجدول) على صورته غلافًا.
   */
  const chips = (w: WorkRow) => (w.category ? <AdBadge>{w.category}</AdBadge> : undefined);
  const info = (w: WorkRow, inCard: boolean): AdMeta[] =>
    inCard ? [w.linkUrl ? { icon: <LinkSimple />, text: host(w.linkUrl) } : { icon: <LinkSimple />, text: INTERNAL, tone: "muted" }] : [];
  const stubOf = (w: WorkRow) => ({ big: fmtNum(indexOf(w) + 1), small: "الترتيب" });
  const cells = (w: WorkRow): AdCell[] => [
    w.linkUrl ? { label: "الرابط", text: true, value: host(w.linkUrl) } : { label: "الرابط", text: true, value: INTERNAL, tone: "muted" },
  ];

  const create = <AdButton variant="fill" icon={<Plus />} href="/dashboard/website/works/new">عمل جديد</AdButton>;

  return (
    <>
      <CollectionRoom<WorkRow>
        navPath={WORKS_ROOM.navPath}
        title={WORKS_ROOM.title}
        action={{ label: "عمل جديد", icon: <Plus />, href: "/dashboard/website/works/new" }}
        noun={["عملٌ واحد", "عملان", "أعمال", "عملًا"]}
        items={works}
        positions={[]}
        searchPlaceholder="ابحث بعنوان العمل أو تصنيفه…"
        matchSearch={(w, q) => matchesSearch(q, w.title, w.category)}
        viewKey={WORKS_ROOM.viewKey}
        initialView={view}
        idOf={(w) => w.id}
        // الترتيبُ سحبًا وإفلاتًا (محمد ٢٠٢٦-١١-٠١) بدل «تحريك لأعلى/لأسفل» في «المزيد» خطوةً خطوة
        reorder={{ title: (w) => w.title, save: reorderWorks }}
        table={{
          head: "العمل",
          stub: { key: "order", label: "الترتيب", icon: <ListNumbers /> },
          columns: [{ key: "link", label: "الرابط", icon: <LinkSimple />, text: true }],
        }}
        emptyAll={{ title: "لا أعمال بعد", desc: "أضِف أوّل عمل، يظهر مباشرةً في معرض «أعمال وإبداعات» على الصفحة الرئيسية." }}
        createAction={create}
        renderCard={(w) => (
          <AdCard
            key={w.id}
            cover={w.imageUrl}
            stub={stubOf(w)}
            chips={chips(w)}
            title={w.title}
            href={editHref(w)}
            meta={info(w, true)}
            foot={acts(w)}
          />
        )}
        renderRow={(w) => (
          <AdRow
            key={w.id}
            title={w.title}
            href={editHref(w)}
            badge={chips(w)}
            sub={info(w, false)}
            stub={{ ...stubOf(w), cover: w.imageUrl }}
            cells={cells(w)}
            acts={acts(w, true)}
          />
        )}
      />
      <AdConfirm
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف العمل؟"
        text={kill ? `سيُحذف «${kill.title}» من المعرض نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteWork(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
