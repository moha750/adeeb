"use client";

/**
 * معرفةُ ديبو على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `deebo/knowledge/KnowledgeView.tsx` القديم:
 * وقائعُ يقولها ديبو أو موقوفة، والتحريرُ في صفحته (`[id]/edit`)، والإيقافُ والإعادة، والترتيبُ (كان «تحريك لأعلى/لأسفل»)،
 * والحذفُ بتأكيد، وحدُّ الغرفة مكتوبٌ فوق القائمة. وهي أختُ «الأسئلة الشائعة» شكلًا لا موضوعًا: تلك أجوبةٌ يقرؤها الزائر،
 * وهذه وقائعُ لا تُعرَض لأحد — تُحشى في نصّ توجيه ديبو فيجيب منها، فلا «معاينة» هنا.
 *
 * **والترتيبُ بمحرّك القالب** (`reorder`): مقبضُ السحب بين سهمين أوّلَ السطر وفي رأس الكرت، كأخواتها الأسئلة الشائعة والأعمال
 * والرعاة — والحفظُ بـ`reorderFacts` (الترتيبُ كاملًا). و`moveFact` القديمة باقيةٌ في `actions.ts` لـ`KnowledgeView` وحدها.
 */
import type { RoomView } from "../view";
import { DEEBO_KNOWLEDGE_ROOM } from "./deebo-knowledge.meta";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { matchesSearch } from "@adeeb/design-system";
import { ChatCenteredText, ListNumbers } from "@phosphor-icons/react";
import { Eye, EyeSlash, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { FactRow } from "@/app/dashboard/deebo/knowledge/data";
import { deleteFact, reorderFacts, toggleFact } from "@/app/dashboard/deebo/knowledge/actions";
import { AdActs, AdBadge, AdButton, AdCard, AdConfirm, AdNote, AdRow, type AdMeta, type AdOp } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { fmtNum } from "../format";
import type { ArForms } from "@/lib/arabicCount";

const AR_FACT: ArForms = ["واقعةٌ واحدة", "واقعتان", "وقائع", "واقعةً"];

/**
 * **مواضعُ الوقائع بحالها**: كان فوق القائمة القديمة كاردا إحصاء («وقائع يقولها»، «وقائع موقوفة») — فصارا موضعين بأعدادهما،
 * والكلُّ أوّلُها. والجديدةُ تُكتب قائمةً يقولها ديبو (`KnowledgeForm`)، فالدعوةُ إلى الإنشاء في فراغ «يقولها».
 */
const POSITIONS: Position<FactRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا وقائع بعد." },
  { key: "live", label: "يقولها", match: (f) => f.isActive, empty: "لا واقعة يقولها ديبو الآن: كلُّها موقوفة.", canCreate: true },
  { key: "paused", label: "موقوفة", match: (f) => !f.isActive, empty: "لا وقائع موقوفة." },
];

const NEW_HREF = "/dashboard/deebo/knowledge/new";

export function DeeboKnowledgeRoom({ facts, view }: { facts: FactRow[]; serverNow: number; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kill, setKill] = useState<FactRow | null>(null);

  /** موضعُ الواقعة في القائمة كلِّها (لا فيما بقي بعد البحث أو في الموضع) — رقمُ القديم (`i + 1`)، وحدّا التحريك منه. */
  const place = useMemo(() => new Map(facts.map((f, i) => [f.id, i])), [facts]);
  const indexOf = (f: FactRow) => place.get(f.id) ?? 0;

  const editHref = (f: FactRow) => `/dashboard/deebo/knowledge/${f.id}/edit`;

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });

  /** قائمةُ الصفّ القديمة بترتيبها: الإيقافُ أو الإعادة، ثمّ الحذفُ آخرَها (والتحريكُ صار محرّكَ القالب). */
  const ops = (f: FactRow): AdOp[] => {
    return [
      {
        key: "toggle",
        label: f.isActive ? "إيقاف" : "إعادة",
        icon: f.isActive ? <EyeSlash /> : <Eye />,
        disabled: pending,
        onClick: () => run(() => toggleFact(f.id, !f.isActive)),
      },
      { key: "del", label: "حذف", icon: <Trash />, onClick: () => setKill(f), danger: true },
    ];
  };
  /** الأساسيُّ التحرير — وجهةُ النقر على الكرت والصفّ في القديمة. */
  const acts = (f: FactRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "تحرير", icon: <PencilSimple />, href: editHref(f) }} ops={ops(f)} />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: الحالُ شارةٌ في العرضين (كانت ذيلَ الكرت وعمودَ «الحالة» في الجدول)، ثمّ العنوان، ثمّ نصُّ
   * الواقعة سطرَ معلومة (كان جسمَ الكرت، وتحت العنوان في عمود الجدول)، والكعبُ ترتيبُها (كان «الترتيب N» في ذيل الكرت وعمودَ «#»).
   */
  const chips = (f: FactRow) =>
    f.isActive
      ? <AdBadge tone="ok" icon={<Eye />}>يقولها</AdBadge>
      : <AdBadge icon={<EyeSlash />}>موقوفة</AdBadge>;
  const info = (f: FactRow): AdMeta[] => [{ icon: <ChatCenteredText />, text: f.body }];
  const stubOf = (f: FactRow) => ({ big: fmtNum(indexOf(f) + 1), small: "الترتيب" });

  const create = <AdButton variant="fill" icon={<Plus />} href={NEW_HREF}>واقعة جديدة</AdButton>;

  return (
    <>
      <CollectionRoom<FactRow>
        navPath={DEEBO_KNOWLEDGE_ROOM.navPath}
        title={DEEBO_KNOWLEDGE_ROOM.title}
        action={{ label: "واقعة جديدة", icon: <Plus />, href: NEW_HREF }}
        noun={AR_FACT}
        items={facts}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث في عنوان الواقعة أو نصّها…"
        matchSearch={(f, q) => matchesSearch(q, f.title, f.body)}
        viewKey={DEEBO_KNOWLEDGE_ROOM.viewKey}
        initialView={view}
        idOf={(f) => f.id}
        reorder={{ title: (f) => f.title, save: reorderFacts }}
        // حدُّ الغرفة مكتوبٌ فيها لا في وثيقةٍ بعيدة: كاتبُ الواقعة يقرؤه وهو يكتب
        notice={
          <AdNote tone="info">
            {/* (محمد ٢٠٢٦-١١-٠٢: «الثابتُ وحده يُكتب هنا — لم أفهمها») فصارت تقول القاعدةَ وسببَها بكلامٍ مباشر */}
            <b>اكتب هنا ما لا يتغيّر مع الوقت.</b>{" "}
            ديبو يقرأ هذه الوقائع كما هي في كلّ محادثة، فلا تكتب ما يتغيّر، كعدد الأعضاء أو اسم القائد الحاليّ أو موعد فعاليّةٍ
            قادمة: سيبقى ديبو يقوله بعد أن يتغيّر.
          </AdNote>
        }
        table={{
          // لا ترتيبَ من رأس الجدول: ترتيبُ الوقائع يدويٌّ (`sort`)، والفرزُ يُخفي ترتيبَها الحقيقيّ
          head: "الواقعة",
          stub: { key: "order", label: "الترتيب", icon: <ListNumbers /> },
          columns: [],
        }}
        emptyAll={{ title: "لا وقائع بعد", desc: "أضِف أوّل واقعة، يقولها ديبو في محادثته من اللحظة." }}
        createAction={create}
        renderCard={(f) => (
          <AdCard
            key={f.id}
            seed={f.id}
            stub={stubOf(f)}
            chips={chips(f)}
            title={f.title}
            href={editHref(f)}
            meta={info(f)}
            foot={acts(f)}
          />
        )}
        renderRow={(f) => (
          <AdRow
            key={f.id}
            title={f.title}
            href={editHref(f)}
            stub={{ ...stubOf(f), seed: f.id }}
            badge={chips(f)}
            sub={info(f)}
            cells={[]}
            acts={acts(f, true)}
          />
        )}
      />
      <AdConfirm
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الواقعة؟"
        text={kill ? `سيُحذف «${kill.title}» نهائيًّا. ولو أردت إخراجها من كلامه وحدَه فأوقِفها.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteFact(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
