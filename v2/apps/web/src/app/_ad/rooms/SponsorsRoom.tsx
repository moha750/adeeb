"use client";

/**
 * غرفةُ الرعاة والشركاء على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١) — السلوكُ سلوكُ `website/sponsors/SponsorsView.tsx` القديم:
 * قائمةٌ واحدةٌ بلا مواضع ولا مرشّحات، و**ترتيبُه بسحب كعب السجلّ في القائمة نفسِها** (محمد
 * ٢٠٢٦-١١-٠١، كان «تحريكًا لأعلى/لأسفل» خطوةً خطوة في القائمة)، والحذفُ بتأكيد، ورابطُه يُفتح في لسانٍ جديد. ولا ترتيبَ من رأس الجدول: ترتيبُ
 * الرعاة يدويٌّ (`order`)، والفرزُ يُخفي ترتيبَه الحقيقيّ.
 */
import type { RoomView } from "../view";
import { SPONSORS_ROOM } from "./sponsors.meta";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LinkSimple, ListNumbers, TextAlignRight } from "@phosphor-icons/react";
import { ArrowUpRight, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { matchesSearch } from "@adeeb/design-system";
import type { SponsorRow } from "@/app/dashboard/website/sponsors/data";
import { deleteSponsor, reorderSponsors } from "@/app/dashboard/website/sponsors/actions";
import { AdActs, AdBadge, AdButton, AdCard, AdConfirm, AdRow, type AdCell, type AdMeta, type AdOp } from "../primitives";
import { CollectionRoom } from "../collection";
import { fmtNum } from "../format";

/** نطاقُ الرابط للعرض المختصر (بلا بروتوكول ولا www)، أو الرابطُ كما هو إن تعذّر — كما في القديم. */
function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function SponsorsRoom({ sponsors, view }: { sponsors: SponsorRow[]; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kill, setKill] = useState<SponsorRow | null>(null);

  /** موضعُ الراعي في القائمة كلِّها (لا فيما بقي بعد البحث) — والرقمُ رقمُ القديم (`i + 1`). */
  const place = useMemo(() => new Map(sponsors.map((s, i) => [s.id, i])), [sponsors]);
  const indexOf = (s: SponsorRow) => place.get(s.id) ?? 0;

  /**
   * فتحُ الرابط أوّلًا (كان ظاهرًا في قاع الكرت وعمودِ الجدول، ويُفتح في لسانٍ جديد)، ثمّ الحذفُ آخرُها
   * (والتحريكُ صار سحبَ الكعب؛ و«تحرير» الأساسيّ).
   */
  const ops = (s: SponsorRow): AdOp[] => {
    const url = s.linkUrl;
    return [
      ...(url ? [{ key: "link", label: "فتح الرابط", icon: <ArrowUpRight />, onClick: () => window.open(url, "_blank", "noopener,noreferrer") }] : []),
      { key: "del", label: "حذف", icon: <Trash />, onClick: () => setKill(s), danger: true },
    ];
  };
  const editHref = (s: SponsorRow) => `/dashboard/website/sponsors/${s.id}/edit`;
  const acts = (s: SponsorRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "تحرير", icon: <PencilSimple />, href: editHref(s) }} ops={ops(s)} />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: الوسمُ رقاقةٌ في العرضين، والوصفُ سطرٌ في العرضين، والرابطُ سطرٌ في الكرت وعمودٌ في
   * الجدول (كان عمودًا فيه، فيخرج من سطوره). والكعبُ ترتيبُ الراعي (كان «الترتيب N» في قاع الكرت، وعمودًا في الجدول)
   * على شعاره غلافًا.
   */
  const chips = (s: SponsorRow) => (s.badge ? <AdBadge>{s.badge}</AdBadge> : undefined);
  const info = (s: SponsorRow, inCard: boolean): AdMeta[] => [
    ...(s.description ? [{ icon: <TextAlignRight />, text: s.description }] : []),
    ...(inCard && s.linkUrl ? [{ icon: <LinkSimple />, text: host(s.linkUrl) }] : []),
  ];
  /**
   * **الكعبُ ترتيبُ الراعي على قماشه، بلا شعار — مؤقّتًا** (محمد ٢٠٢٦-١١-٠١): جُرّبت أربعُ طرقٍ للشعار ولم تُعجبه، وأصلُ المشكلة أنّ
   * الشعارات بلا مقاسٍ واحد. فثُبّت المعيارُ في نموذج الراعي (مربّعٌ بخلفيّة شفّافة، 512 بكسل على الأقلّ)، ويُصمَّم ظهورُه في القائمة
   * حين يُضاف أوّلُ راعٍ حقيقيّ. والاسمُ يعرّف الراعي، والشعارُ كاملًا في صفحة التحرير. كان «الترتيب N» في قاع الكرت، وعمودًا في الجدول.
   */
  const stubOf = (s: SponsorRow) => ({ big: fmtNum(indexOf(s) + 1), small: "الترتيب" });
  const cells = (s: SponsorRow): AdCell[] => [
    s.linkUrl ? { label: "الرابط", text: true, value: host(s.linkUrl) } : { label: "الرابط", text: true, value: "—", tone: "muted" },
  ];

  const create = <AdButton variant="fill" icon={<Plus />} href="/dashboard/website/sponsors/new">راعٍ جديد</AdButton>;

  return (
    <>
      <CollectionRoom<SponsorRow>
        navPath={SPONSORS_ROOM.navPath}
        title={SPONSORS_ROOM.title}
        action={{ label: "راعٍ جديد", icon: <Plus />, href: "/dashboard/website/sponsors/new" }}
        noun={["راعٍ واحد", "راعيان", "رعاة", "راعيًا"]}
        items={sponsors}
        positions={[]}
        searchPlaceholder="ابحث باسم الراعي أو وسمه…"
        matchSearch={(s, q) => matchesSearch(q, s.name, s.badge, s.description)}
        viewKey={SPONSORS_ROOM.viewKey}
        initialView={view}
        idOf={(s) => s.id}
        // الترتيبُ سحبًا وإفلاتًا (محمد ٢٠٢٦-١١-٠١) بدل «تحريك لأعلى/لأسفل» في «المزيد» خطوةً خطوة
        reorder={{ title: (s) => s.name, save: reorderSponsors }}
        table={{
          head: "الراعي",
          stub: { key: "order", label: "الترتيب", icon: <ListNumbers /> },
          columns: [{ key: "link", label: "الرابط", icon: <LinkSimple />, text: true }],
        }}
        emptyAll={{ title: "لا رعاة بعد", desc: "أضِف أوّل راعٍ، بشعاره ووسمه ورابطه. (القسم العلنيّ للرعاة يُبنى لاحقًا.)" }}
        createAction={create}
        renderCard={(s) => (
          <AdCard
            key={s.id}
            seed={s.id}
            stub={stubOf(s)}
            chips={chips(s)}
            title={s.name}
            href={editHref(s)}
            meta={info(s, true)}
            foot={acts(s)}
          />
        )}
        renderRow={(s) => (
          <AdRow
            key={s.id}
            title={s.name}
            href={editHref(s)}
            badge={chips(s)}
            sub={info(s, false)}
            stub={{ ...stubOf(s), seed: s.id }}
            cells={cells(s)}
            acts={acts(s, true)}
          />
        )}
      />
      <AdConfirm
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الراعي؟"
        text={kill ? `سيُحذف «${kill.name}» نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteSponsor(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
