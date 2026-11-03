"use client";

/**
 * غرفةُ شريط الإعلانات على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `website/announcements/AnnouncementsView.tsx`
 * القديم: كلماتُ الشريط الجاري في صدر الهبوط، تُكتب وتُحرَّر في نافذتها (`AnnouncementModal`، لا صفحة)، وتُطفأ وتُشعَل،
 * وتُحذف بتأكيد، و**ترتيبُها ترتيبُ المرور هناك** بمحرّك القالب (`reorder`، كان «تحريك لأعلى/لأسفل») — فهي قائمةٌ وحدها بلا كروت.
 *
 * وهي البابُ الأوّل في «اللوحة الإعلانية»، وجارُها «الأخبار المعروضة» (`HeroNewsRoom`، مسارٌ آخر): كانا لسانين مرتبطين فوق
 * القائمة (`AnnouncementsTabs`)، فصار كلٌّ منهما الفعلَ الثانيَ على لوح أخيه (`extra`) — صفحتان لا موضعان، فلكلٍّ رابطُه ورجوعُه.
 */
import type { RoomView } from "../view";
import { TICKER_ROOM } from "./ticker.meta";
import { HERO_NEWS_ROOM } from "./hero-news.meta";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListNumbers, Newspaper } from "@phosphor-icons/react";
import { Eye, EyeSlash, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { matchesSearch } from "@adeeb/design-system";
import type { AnnouncementRow } from "@/app/dashboard/website/announcements/data";
import {
  createAnnouncement, deleteAnnouncement, reorderAnnouncements, toggleAnnouncement, updateAnnouncement,
} from "@/app/dashboard/website/announcements/actions";
import { AnnouncementModal, type Editing } from "@/app/dashboard/website/announcements/AnnouncementModal";
import { AdActs, AdBadge, AdButton, AdCard, AdConfirm, AdRow, type AdOp } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { fmtNum } from "../format";

/**
 * **مواضعُ الإعلانات بحالها**: كان فوق القائمة القديمة كاردا إحصاء («إعلانات في الشريط»، «إعلانات مُطفأة») — فصارا موضعين
 * بأعدادهما، والكلُّ أوّلُها (والقديمةُ كانت تعرض الكلّ). والجديدُ يولد في الشريط، فالدعوةُ إلى الإنشاء في فراغ «في الشريط».
 */
const POSITIONS: Position<AnnouncementRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا إعلانات بعد." },
  { key: "live", label: "في الشريط", match: (a) => a.isActive, empty: "لا إعلان في الشريط الآن: كلُّها مُطفأة.", canCreate: true },
  { key: "off", label: "مُطفأة", match: (a) => !a.isActive, empty: "لا إعلانات مُطفأة." },
];

const NEWS_HREF = "/dashboard/website/announcements/news";

export function TickerRoom({ announcements, view }: { announcements: AnnouncementRow[]; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kill, setKill] = useState<AnnouncementRow | null>(null);

  /** موضعُ الإعلان في القائمة كلِّها (لا فيما بقي بعد البحث أو في الموضع) — رقمُ القديم (`i + 1`). */
  const place = useMemo(() => new Map(announcements.map((a, i) => [a.id, i])), [announcements]);
  const indexOf = (a: AnnouncementRow) => place.get(a.id) ?? 0;

  /* **قيمُ المحرّر ههنا لا في النافذة** (عُرفُ القديمة و`SupervisionModal`): النافذةُ تبقى مركَّبةً ويُفتح `open` وحده،
     والفتحُ هو الذي يزرع القيمَ الأولى. */
  const [editing, setEditing] = useState<Editing | null>(null);
  const [text, setText] = useState("");
  const [isActive, setIsActive] = useState(true);

  const openNew = () => {
    setText("");
    setIsActive(true);
    setEditing({ kind: "new" });
  };
  const openEdit = (a: AnnouncementRow) => {
    setText(a.text);
    setIsActive(a.isActive);
    setEditing({ kind: "edit", row: a });
  };

  const submit = () => {
    if (!editing) return;
    start(async () => {
      const input = { text, isActive };
      const r = editing.kind === "edit" ? await updateAnnouncement(editing.row.id, input) : await createAnnouncement(input);
      if (r.ok) {
        toast.success(r.message);
        setEditing(null);
        router.refresh();
      } else toast.error(r.message);
    });
  };

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });

  /** قائمةُ الصفّ القديمة بترتيبها: الإطفاءُ أو الإشعال، ثمّ الحذفُ آخرَها (والتحريكُ صار محرّكَ القالب، و«تحرير» الأساسيّ). */
  const ops = (a: AnnouncementRow): AdOp[] => [
    {
      key: "toggle",
      label: a.isActive ? "إطفاء" : "إشعال",
      icon: a.isActive ? <EyeSlash /> : <Eye />,
      disabled: pending,
      onClick: () => run(() => toggleAnnouncement(a.id, !a.isActive)),
    },
    { key: "del", label: "حذف", icon: <Trash />, onClick: () => setKill(a), danger: true },
  ];
  /** الأساسيُّ التحرير في نافذته — وجهةُ النقر على الكرت والصفّ في القديمة (وكان في الكرت «تعديل»، وفي الجدول «تحرير»). */
  const acts = (a: AnnouncementRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "تحرير", icon: <PencilSimple />, onClick: () => openEdit(a) }} ops={ops(a)} />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: الحالُ شارةٌ في العرضين بلونها القديم (كانت لونَ الكرت ومزلاجَ ذيله، وعمودَ «الحالة» في الجدول)،
   * ثمّ نصُّ الإعلان عنوانًا، والكعبُ ترتيبُ مروره (كان رصيفَ الكرت «ترتيب N»، وعمودَ «#» في الجدول).
   */
  const chips = (a: AnnouncementRow) =>
    a.isActive
      ? <AdBadge tone="ok" icon={<Eye />}>في الشريط</AdBadge>
      : <AdBadge icon={<EyeSlash />}>مُطفأ</AdBadge>;
  const stubOf = (a: AnnouncementRow) => ({ big: fmtNum(indexOf(a) + 1), small: "الترتيب" });

  const create = <AdButton variant="fill" icon={<Plus />} onClick={openNew}>إعلان جديد</AdButton>;

  return (
    <>
      <CollectionRoom<AnnouncementRow>
        navPath={TICKER_ROOM.navPath}
        title={TICKER_ROOM.title}
        action={{ label: "إعلان جديد", icon: <Plus />, onClick: openNew }}
        extra={{ label: HERO_NEWS_ROOM.title, icon: <Newspaper />, href: NEWS_HREF }}
        noun={["إعلانٌ واحد", "إعلانان", "إعلانات", "إعلانًا"]}
        items={announcements}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث في نصّ الإعلان…"
        matchSearch={(a, q) => matchesSearch(q, a.text)}
        viewKey={TICKER_ROOM.viewKey}
        initialView={view}
        idOf={(a) => a.id}
        reorder={{ title: (a) => a.text, save: reorderAnnouncements }}
        table={{
          // لا ترتيبَ من رأس الجدول: ترتيبُ الشريط يدويٌّ (`sort`)، والفرزُ يُخفي ترتيبَه الحقيقيّ
          head: "الإعلان",
          stub: { key: "order", label: "الترتيب", icon: <ListNumbers /> },
          columns: [],
        }}
        emptyAll={{ title: "لا إعلانات بعد", desc: "أضِف أوّل إعلان، يمرّ في شريط الصفحة الرئيسية. ولو خلت اللوحةُ اختفى الشريط." }}
        createAction={create}
        renderCard={(a) => (
          <AdCard
            key={a.id}
            seed={a.id}
            stub={stubOf(a)}
            chips={chips(a)}
            title={a.text}
            onOpen={() => openEdit(a)}
            foot={acts(a)}
          />
        )}
        renderRow={(a) => (
          <AdRow
            key={a.id}
            title={a.text}
            onOpen={() => openEdit(a)}
            stub={{ ...stubOf(a), seed: a.id }}
            badge={chips(a)}
            cells={[]}
            acts={acts(a, true)}
          />
        )}
      />
      <AnnouncementModal
        editing={editing}
        text={text}
        onText={setText}
        isActive={isActive}
        onActive={setIsActive}
        busy={pending}
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />
      <AdConfirm
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الإعلان؟"
        text={kill ? `سيُحذف «${kill.text}» نهائيًّا. ولو أردت إخراجه من الشريط وحدَه فأطفِئه.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteAnnouncement(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
