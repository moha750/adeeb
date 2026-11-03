"use client";

/**
 * غرفةُ الأسئلة الشائعة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١) — السلوكُ سلوكُ `website/faq/FaqView.tsx` القديم:
 * قائمةٌ واحدةٌ بلا مواضع ولا مرشّحات، و**ترتيبُه بسحب كعب السجلّ في القائمة نفسِها** (محمد
 * ٢٠٢٦-١١-٠١، كان «تحريكًا لأعلى/لأسفل» خطوةً خطوة في القائمة)، والحذفُ بتأكيد. ولا ترتيبَ من رأس الجدول: ترتيبُ الأسئلة يدويٌّ
 * (`order`)، والفرزُ يُخفي ترتيبَه الحقيقيّ.
 */
import type { RoomView } from "../view";
import { FAQ_ROOM } from "./faq.meta";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChatCenteredText, ListNumbers } from "@phosphor-icons/react";
import { PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { matchesSearch } from "@adeeb/design-system";
import type { FaqRow } from "@/app/dashboard/website/faq/data";
import { deleteFaq, reorderFaqs } from "@/app/dashboard/website/faq/actions";
import { AdActs, AdButton, AdCard, AdConfirm, AdRow, type AdMeta, type AdOp } from "../primitives";
import { CollectionRoom } from "../collection";
import { fmtNum } from "../format";

export function FaqRoom({ faqs, view }: { faqs: FaqRow[]; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kill, setKill] = useState<FaqRow | null>(null);

  /** موضعُ السؤال في القائمة كلِّها (لا فيما بقي بعد البحث) — والرقمُ رقمُ القديم (`i + 1`). */
  const place = useMemo(() => new Map(faqs.map((f, i) => [f.id, i])), [faqs]);
  const indexOf = (f: FaqRow) => place.get(f.id) ?? 0;

  /** قائمةُ الصفّ: الحذفُ (والتحريكُ صار سحبَ الكعب؛ و«تحرير» الأساسيّ). */
  const ops = (f: FaqRow): AdOp[] => {
    return [
      { key: "del", label: "حذف", icon: <Trash />, onClick: () => setKill(f), danger: true },
    ];
  };
  const editHref = (f: FaqRow) => `/dashboard/website/faq/${f.id}/edit`;
  const acts = (f: FaqRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "تحرير", icon: <PencilSimple />, href: editHref(f) }} ops={ops(f)} />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: الإجابةُ سطرُ المعلومة في العرضين (كانت جسمَ الكرت، وتحت السؤال في عمود الجدول)،
   * والترتيبُ رقمُ الكرت وعمودُ الجدول (كان «الترتيب N» في قاع الكرت، وعمودَ «#» في الجدول). ولا رقاقات: لا نوعَ للسؤال ولا حال.
   */
  const info = (f: FaqRow): AdMeta[] => [{ icon: <ChatCenteredText />, text: f.answer }];
  /** الكعبُ ترتيبُ السؤال كما في الرعاة والأعمال (كان «#» عمودًا، و«الترتيب N» في الكرت) — والجدولُ بلا أعمدةٍ غيره */
  const stubOf = (f: FaqRow) => ({ big: fmtNum(indexOf(f) + 1), small: "الترتيب" });

  const create = <AdButton variant="fill" icon={<Plus />} href="/dashboard/website/faq/new">سؤال جديد</AdButton>;

  return (
    <>
      <CollectionRoom<FaqRow>
        navPath={FAQ_ROOM.navPath}
        title={FAQ_ROOM.title}
        action={{ label: "سؤال جديد", icon: <Plus />, href: "/dashboard/website/faq/new" }}
        noun={["سؤالٌ واحد", "سؤالان", "أسئلة", "سؤالًا"]}
        items={faqs}
        positions={[]}
        searchPlaceholder="ابحث في السؤال أو الإجابة…"
        matchSearch={(f, q) => matchesSearch(q, f.question, f.answer)}
        viewKey={FAQ_ROOM.viewKey}
        initialView={view}
        idOf={(f) => f.id}
        // الترتيبُ بسحب الكعب في القائمة نفسِها (محمد ٢٠٢٦-١١-٠١) بدل «تحريك لأعلى/لأسفل» في «المزيد» خطوةً خطوة
        reorder={{ title: (f) => f.question, save: reorderFaqs }}
        table={{
          head: "السؤال",
          stub: { key: "order", label: "الترتيب", icon: <ListNumbers /> },
          columns: [],
        }}
        emptyAll={{ title: "لا أسئلة بعد", desc: "أضِف أوّل سؤال، يظهر مباشرةً في قسم «الأسئلة الشائعة» بالصفحة الرئيسية." }}
        createAction={create}
        renderCard={(f) => (
          <AdCard
            key={f.id}
            seed={f.id}
            stub={stubOf(f)}
            title={f.question}
            href={editHref(f)}
            meta={info(f)}
            foot={acts(f)}
          />
        )}
        renderRow={(f) => (
          <AdRow
            key={f.id}
            title={f.question}
            href={editHref(f)}
            stub={{ ...stubOf(f), seed: f.id }}
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
        title="حذف السؤال؟"
        text={kill ? `سيُحذف «${kill.question}» نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteFaq(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
