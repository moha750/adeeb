"use client";

/**
 * **الترتيبُ بالسحب في القائمة نفسِها** (محمد ٢٠٢٦-١١-٠١: «تبويباتٌ مثلُ الأعمال والأسئلة الشائعة قائمةٌ على فكرة الترتيب… سهولةُ
 * تغيير أماكنها»، ثمّ: «الأغلبُ يضع تغييرَ الترتيب في الجدول نفسِه، لا في زرٍّ يغيّر الشكل»). جُرّب أوّلًا «وضعُ ترتيبٍ» منفصلٌ
 * بزرّ، فبحث عنه عشر دقائق — والشائعُ في الأنظمة القويّة (Shopify في الترتيب اليدويّ، وAirtable وNotion وLinear) السحبُ في
 * القائمة نفسِها ما دامت بترتيبها، ويتوقّف أثناء البحث والتصفية.
 *
 * فالغرفةُ التي ترتيبُها يدويٌّ تعطي القالبَ `reorder`، فيصير **كعبُ كلّ سجلٍّ مقبضَه** — في الكرت والسطر — وهو رقمُ موضعه أصلًا،
 * فسحبُه تغييرُ موضعه. والحفظُ عند الإفلات، وإن فشل عاد السجلُّ إلى مكانه برسالة.
 *
 * **المحرّكُ مستوردٌ لا مخترَع:** `@dnd-kit` الذي يرتّب صفحاتِ المنشور في محرّر المكتبة، بإعداداته (لا سحبَ قبل حركة 5 بكسل،
 * ولوحةُ المفاتيح: المسافةُ تمسك، والأسهمُ تحرّك، والمسافةُ تُفلت، وEscape يُلغي). وإعلاناتُ قارئ الشاشة بالعربيّة.
 * وحركةُ المسحوب تُكتب على عنصره مباشرةً (لا خاصّيّةَ `style` في الرسم): قيمةٌ تتبدّل في كلّ إطار، لا تصميم.
 */
import { createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type Announcements, type DragEndEvent, type ScreenReaderInstructions, type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CaretDown, CaretLeft, CaretRight, CaretUp, DotsSixVertical } from "@/app/_components/glyphs";
import { fmtNum } from "./format";

export type ReorderSpec<T> = {
  /** اسمُ السجلّ في إعلانات قارئ الشاشة واسمِ مقبضه («أُفلت «…» في الموضع 2») */
  title: (item: T) => string;
  /** يحفظ الترتيبَ كاملًا (المعرّفاتُ بترتيبها الجديد) — دالّةُ الخادم */
  save: (ids: string[]) => Promise<{ ok: boolean; message: string }>;
};

const INSTRUCTIONS: ScreenReaderInstructions = {
  draggable: "لتغيير موضعه: اضغط المسافة لإمساكه، ثمّ الأسهم لتحريكه، ثمّ المسافة لإفلاته، أو Escape للإلغاء.",
};

/** ساحةُ السحب: السجلّاتُ الظاهرة بمعرّفاتها، والإفلاتُ يُبلغ الغرفةَ بالمسحوب ومكانه. ومواضعُ الإعلان مواضعُ القائمة كلِّها (`placeOf`) */
export function SortArea({ ids, total, nameOf, placeOf, onMove, children }: {
  ids: string[];
  total: number;
  nameOf: (id: string) => string;
  placeOf: (id: string) => number;
  onMove: (from: string, to: string) => void;
  children: ReactNode;
}) {
  // معرّفٌ ثابتٌ بين الخادم والمتصفّح: عدّادُ `@dnd-kit` الداخليّ يختلف بينهما فيُفسد الإرواء (`aria-describedby`)
  const id = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const t = (x: UniqueIdentifier) => nameOf(String(x));
  const at = (x: UniqueIdentifier) => fmtNum(placeOf(String(x)));
  const announcements: Announcements = {
    onDragStart: ({ active }) => `أُمسك «${t(active.id)}»، في الموضع ${at(active.id)} من ${fmtNum(total)}.`,
    onDragOver: ({ active, over }) => (over ? `«${t(active.id)}» إلى الموضع ${at(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `أُفلت «${t(active.id)}» في الموضع ${at(over.id)}.` : `أُفلت «${t(active.id)}».`),
    onDragCancel: ({ active }) => `أُلغي نقلُ «${t(active.id)}».`,
  };
  // **الرقمُ يتبع اليدَ أثناء السحب** (محمد ٢٠٢٦-١١-٠١: «لمّا أسحب الكرت ما يتغيّر رقمه، فما أعرف هو الآن في أيّ ترتيب»):
  // كان الرقمُ لا يتبدّل إلّا بعد الإفلات. فالسجلّاتُ تُرقَّم بالترتيب المتوقَّع ما دامت اليدُ فوق موضع — رقمُ المسحوب موضعُه الآتي،
  // والمُزاحون أرقامُهم الجديدة — والمواضعُ خاناتُ الظاهر من القائمة كلِّها (صفحةٌ من خمسين لا تمسّ غيرها)
  const [drag, setDrag] = useState<{ a: string; o: string } | null>(null);
  const live = useMemo(() => {
    if (!drag || drag.a === drag.o) return null;
    const i = ids.indexOf(drag.a), j = ids.indexOf(drag.o);
    if (i < 0 || j < 0) return null;
    const slots = ids.map(placeOf);
    return new Map(arrayMove(ids, i, j).map((x, k) => [x, slots[k]]));
  }, [drag, ids, placeOf]);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDrag(null);
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };
  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setDrag({ a: String(active.id), o: String(active.id) })}
      onDragOver={({ active, over }) => { if (over) setDrag({ a: String(active.id), o: String(over.id) }); }}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDrag(null)}
      accessibility={{ announcements, screenReaderInstructions: INSTRUCTIONS }}
    >
      <LiveCtx.Provider value={live}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>{children}</SortableContext>
      </LiveCtx.Provider>
    </DndContext>
  );
}
const LiveCtx = createContext<Map<string, number> | null>(null);

type Step = { prev: boolean; next: boolean; onStep: (dir: -1 | 1) => void };
type Sort = ReturnType<typeof useSortable> & Step & {
  id: string; label: string; n: number;
  /** رقمُه أثناء السحب غيرُ رقمه المحفوظ: سيتغيّر موضعُه إن أُفلت الآن */
  moving: boolean;
  on: boolean; why?: string;
};
const SortCtx = createContext<Sort | null>(null);

/**
 * سجلٌّ في ساحة السحب: يعرف منه الكرتُ والسطرُ أنّ كعبَهما مقبض، ورقمَ موضعه الحيّ (`n`) — فبعد الإفلات يتبدّل الرقمُ في
 * مكانه قبل أن يعود الخادم. و`on` يُطفئ المقبضَ (بحثٌ، أو تصفية، أو فرزٌ من رأس الجدول) ويُبقي الرقم. ولا يُمسكه الحفظُ الجاري:
 * النقلاتُ المتتابعة تُحفظ بترتيبها (`collection.tsx`)، فمن ضغط «تأخير» أربعَ مرّاتٍ متتالية نزل أربعة مواضع.
 */
export function SortItem({ id, label, n, on, why, prev, next, onStep, children }: Step & {
  id: string; label: string; n: number; on: boolean;
  /** لماذا توقّف السحب — تلميحُ المقبض الخافت */
  why?: string;
  children: ReactNode;
}) {
  const s = useSortable({ id, disabled: !on, attributes: { roleDescription: "مقبضُ ترتيب" } });
  const live = useContext(LiveCtx)?.get(id);
  return <SortCtx.Provider value={{ ...s, id, label, n: live ?? n, moving: live !== undefined && live !== n, on, why, prev, next, onStep }}>{children}</SortCtx.Provider>;
}
export const useSortItem = () => useContext(SortCtx);

/** عقدةُ السجلّ المسحوب: إزاحتُه تُكتب عليها في كلّ إطار */
export function useSortNode(sort: Sort | null) {
  const node = useRef<HTMLDivElement | null>(null);
  const transform = sort?.transform ?? null;
  const transition = sort?.transition ?? null;
  const setNodeRef = sort?.setNodeRef;
  useLayoutEffect(() => {
    const n = node.current;
    if (!n || !setNodeRef) return;
    n.style.transform = CSS.Translate.toString(transform) ?? "";
    n.style.transition = transition ?? "";
  }, [transform, transition, setNodeRef]);
  return useCallback((el: HTMLDivElement | null) => { node.current = el; setNodeRef?.(el); }, [setNodeRef]);
}

/**
 * **المحرّك: سهمان حول مقبض السحب** (اقتراحُ محمد ٢٠٢٦-١١-٠١، وهو نمطُ محرّر ووردبريس في نقل الكتل: ▲ ⠿ ▼). المقبضُ (⠿)
 * رمزُ السحب المعروف قطعةً قائمةً بحبر الصفحة؛ والسهمان طريقٌ لمن لا يعرف السحب أو لا يستطيعه (الجوّال)، ويشرحان المقبضَ بلا
 * كلمة: ما بينهما يحرّك السجلّ. وكلٌّ يتّجه حيث يجري الترتيبُ في عرضه: **في الجدول عموديّان** (القائمةُ من أعلى إلى أسفل)، **وفي
 * الكرت أفقيّان** (الشبكةُ تجري كالسطر من اليمين، فالتقديمُ نحو اليمين) — فلا يكذب «أعلى» في شبكةٍ جارُ السجلّ فيها بجانبه.
 *
 * (رُفض قبله: الكعبُ مقبضًا ورمزُه داخله — ذاب في زخرفته؛ وسطرُ تعليماتٍ فوق القائمة — «لم يزد التوضيحَ إلّا قبحًا».)
 * وحين يتوقّف السحبُ (بحث) يخفت المحرّكُ كلُّه وتلميحُه يقول لماذا (`why`).
 */
export function SortGrip({ sort, cell }: { sort: Sort | null; cell?: boolean }) {
  if (!sort) return null;
  const on = sort.on;
  const grip = on ? (
    <button type="button" className="ad-grip" title="اسحب لتغيير الترتيب" {...sort.attributes} {...sort.listeners}
      aria-label={`«${sort.label}»، الموضع ${fmtNum(sort.n)}. اسحب لتغيير موضعه.`}>
      <DotsSixVertical aria-hidden />
    </button>
  ) : (
    <span className="ad-grip" aria-hidden><DotsSixVertical /></span>
  );
  const step = (dir: -1 | 1, can: boolean, icon: ReactNode, tip: string) => (
    <button
      type="button"
      className="ad-step"
      title={tip}
      aria-label={`${tip} «${sort.label}» إلى الموضع ${fmtNum(sort.n + dir)}`}
      disabled={!on || !can}
      onClick={() => sort.onStep(dir)}
    >
      {icon}
    </button>
  );
  const mover = (
    <div className="ad-mover" data-axis={cell ? "y" : "x"} data-off={on ? undefined : ""} title={on ? undefined : sort.why}>
      {step(-1, sort.prev, cell ? <CaretUp aria-hidden /> : <CaretRight aria-hidden />, "تقديم")}
      {grip}
      {step(1, sort.next, cell ? <CaretDown aria-hidden /> : <CaretLeft aria-hidden />, "تأخير")}
    </div>
  );
  return cell ? <div className="ad-td-grip" role="cell">{mover}</div> : mover;
}
