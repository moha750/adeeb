"use client";

/**
 * غرفةُ الفرص التطوّعيّة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `volunteering/VolunteeringView.tsx` القديم
 * وكرتِه (`OpportunityCard.tsx`، «خطُّ المترو»): الرفوفُ الثلاثة بحال الفرصة (سارية، مسوّدات، منتهية) تفتح على «سارية»، وقائمةُ
 * «تحتاج إجراءً منك» فوقها، والخطوةُ التالية زرُّ الكرت الأوّل (نشرٌ، مراجعةٌ، تأكيدُ حضورٍ أو إنجاز، إصدارُ شهادات، إغلاقُ تقديم)،
 * ثمّ سجلُّ الفرصة والتعديلُ ونسخُ رابطها القصير وإغلاقُ التقديم والإنهاءُ بتأكيدٍ للمرنة، وخبرُ الفرصة التي غادرت رفَّها،
 * و«قروب المتطوّعين» من رأس الغرفة. **والحكمُ على الفرصة من مصدره الواحد** (`timeOf`، `nextStep`، `shelfOf`، `monoState`
 * في `OpportunityCard.tsx`): الغرفةُ ترسم ما يقوله ولا تعيد حسابه.
 */
import type { RoomView } from "../view";
import { VOLUNTEERING_ROOM } from "./volunteering.meta";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, CalendarCheck, Certificate, ClipboardText, FlagCheckered, LinkSimple, LockSimple, Megaphone, Tray, UserCheck, UsersThree } from "@phosphor-icons/react";
import { PencilSimple, Plus } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { OppListRow } from "@/app/dashboard/volunteering/data";
import { endOpportunity, setOpportunityStatus } from "@/app/dashboard/volunteering/actions";
import { SHELF_LABEL, needsYou, nextStep, shelfOf, timeOf, type Shelf } from "@/app/dashboard/volunteering/OpportunityCard";
import { VOLUNTEERS_GROUP_URL } from "@/lib/volunteersGroup";
import { copyText } from "@/lib/clipboard";
import type { ArForms } from "@/lib/arabicCount";
import { AdActs, AdButton, AdCard, AdConfirm, AdRow, type AdAction, type AdOp } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { oppChips, oppFigures, oppInfo, oppStub } from "./opportunity-ticket";

const AR_OPPORTUNITY: ArForms = ["فرصةٌ واحدة", "فرصتان", "فرص", "فرصةً"];

/**
 * **ترتيبُ الرفوف ترتيبُ الكشف القديم**: الساريةُ والمسوّداتُ بموعدها الأقربُ أوّلًا، والمنتهيةُ أحدثُها أوّلًا (`OpportunityBoard`).
 * والقالبُ يعرض كلَّ موضعٍ بترتيب البيانات، فتُرتَّب مرّةً: الرفُّ ثمّ الموعد. ورتبةُ الرفوف (سارية، منتهية، مسوّدات) لموضع
 * «تحتاج إجراءً» وحده — يجمع الرفوفَ كلَّها، فيأتي الحضورُ والشهاداتُ قبل النشر كما كانت قائمتُه (`TODO_ORDER`) تقريبًا.
 */
const RANK: Record<Shelf, number> = { live: 0, done: 1, draft: 2 };

const record = (o: OppListRow) => `/dashboard/volunteering/${o.id}`;

/** `today`: اليومُ بساعة الرياض «YYYY-MM-DD» يحسبه الخادم (`page.tsx`) كما في القديمة؛ و`serverNow` يمرّره كلُّ مسارٍ على القالب. */
export function VolunteeringRoom({ rows, today, view }: { rows: OppListRow[]; today: string; serverNow: number; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  // إنهاءُ فرصةٍ مرنة يُسأل عنه أوّلًا: يُنهي التقديمَ ولا يُتراجَع عنه
  const [ending, setEnding] = useState<OppListRow | null>(null);
  // فرصةٌ قيل انتقالُها في رسالة فعلها نفسِه، فلا يُعاد خبرُها حين يكتشفه الكشف
  const announced = useRef<string | null>(null);

  const shelves = useMemo(() => new Map(rows.map((o) => [o.id, shelfOf(o, today)])), [rows, today]);
  const items = useMemo(
    () => [...rows].sort((a, b) => {
      const sa = shelves.get(a.id)!, sb = shelves.get(b.id)!;
      if (sa !== sb) return RANK[sa] - RANK[sb];
      const d = (a.startsOn ?? "").localeCompare(b.startsOn ?? "");
      return sa === "done" ? -d : d;
    }),
    [rows, shelves],
  );

  /**
   * **الكرتُ لا يختفي صامتًا** (`onMoved` في الكشف القديم): فرصةٌ غادرت رفَّها بعد تحديث الصفوف بغير زرٍّ قال وجهتَه
   * (إنهاءُ المرنة، تعديلٌ غيّر موعدها) يُقال أين صارت. ولا يُنادى أوّلَ الرسم.
   */
  const seen = useRef<Map<string, Shelf> | null>(null);
  useEffect(() => {
    const prev = seen.current;
    seen.current = shelves;
    if (!prev || prev === shelves) return;
    for (const o of rows) {
      const from = prev.get(o.id);
      const to = shelves.get(o.id);
      if (!from || !to || from === to) continue;
      if (announced.current === o.id) { announced.current = null; continue; }
      toast.info(`انتقلت «${o.title}» إلى «${SHELF_LABEL[to]}».`);
    }
  }, [shelves, rows, toast]);

  const flip = (o: OppListRow, status: "open" | "closed") =>
    start(async () => {
      const r = await setOpportunityStatus(o.id, status);
      if (!r.ok) { toast.error(r.message); return; }
      // الحالُ بعد الفعل تُعرف قبل التحديث: لا يتغيّر بالفعل إلّا حالةُ القاعدة، فرسالةٌ واحدةٌ تقول الأمرين
      const to = shelfOf({ ...o, status }, today);
      const moved = to !== shelfOf(o, today);
      announced.current = moved ? o.id : null;
      toast.success(moved ? `${r.message} تجدها الآن في «${SHELF_LABEL[to]}».` : r.message);
      router.refresh();
    });

  const end = () => {
    if (!ending) return;
    const o = ending;
    start(async () => {
      const r = await endOpportunity(o.id);
      setEnding(null);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      router.refresh();
    });
  };

  const copyLink = async (o: OppListRow) => {
    const url = `${window.location.origin}/v/${o.id}`;
    try {
      await copyText(url);
      toast.success("نُسخ رابطُ الفرصة. الصقه في قروب المتطوّعين.");
    } catch {
      toast.error(url);
    }
  };

  /**
   * **الأساسيُّ الخطوةُ التالية** (زرُّ الكرت الأوّل في القديمة، `buttonsOf`): ما عليك في الفرصة الآن، أو بابُ سجلّها حين لا شيء.
   * والمراجعةُ وتأكيدُ الحضور وإصدارُ الشهادات تُفعل في سجلّ الفرصة، فهي روابطُه.
   */
  const primaryOf = (o: OppListRow): AdAction => {
    switch (nextStep(o, today).act) {
      case "publish": return { label: "نشرُ الفرصة", icon: <Megaphone />, onClick: () => flip(o, "open") };
      case "close": return { label: "إغلاقُ التقديم", icon: <LockSimple />, onClick: () => flip(o, "closed") };
      case "decide": return { label: "راجع الطلبات", icon: <Tray />, href: record(o) };
      case "attend": return { label: o.flexible ? "أكّد الإنجاز" : "أكّد الحضور", icon: <CalendarCheck />, href: record(o) };
      case "certify": return { label: "أصدر الشهادات", icon: <Certificate />, href: record(o) };
      default: return { label: "سجلّ الفرصة", icon: <ClipboardText />, href: record(o) };
    }
  };
  /**
   * بقيّةُ أزرار الكرت وقائمتِه القديمة معًا، بترتيبها: سجلُّ الفرصة (ما لم يكن هو الأساسيّ)، والتعديلُ في كلّ حال، ونسخُ الرابط
   * للمفتوحة، ثمّ إغلاقُ التقديم للمفتوحة (أحمرَ في القائمة القديمة، بلا تأكيد) والإنهاءُ للمرنة المنشورة ما لم تنقضِ (بتأكيد).
   */
  const opsOf = (o: OppListRow): AdOp[] => {
    const act = nextStep(o, today).act;
    const { ended } = timeOf(o, today);
    return [
      ...(act !== "share" && act !== "record" ? [{ key: "record", label: "سجلّ الفرصة", icon: <ClipboardText />, href: record(o) }] : []),
      { key: "edit", label: "تعديل", icon: <PencilSimple />, href: `${record(o)}/edit` },
      ...(o.status === "open" ? [{ key: "link", label: "نسخُ الرابط", icon: <LinkSimple />, onClick: () => void copyLink(o) }] : []),
      ...(o.status === "open" && act !== "close"
        ? [{ key: "close", label: "إغلاقُ التقديم", icon: <LockSimple />, onClick: () => flip(o, "closed"), danger: true, disabled: pending }]
        : []),
      ...(o.flexible && o.status !== "draft" && !ended
        ? [{ key: "end", label: "إنهاءُ الفرصة", icon: <FlagCheckered />, onClick: () => setEnding(o), danger: true, disabled: pending }]
        : []),
    ];
  };
  const acts = (o: OppListRow, inRow?: boolean) => <AdActs inRow={inRow} primary={primaryOf(o)} ops={opsOf(o)} />;

  /** الرقاقاتُ والسطورُ والكعبُ والأرقامُ من مصدرها الواحد (`opportunity-ticket.tsx`) — هي نفسُها رأسُ سجلّ الفرصة (`OpportunityRecordRoom`) */
  const chips = (o: OppListRow) => oppChips(o, today);
  const info = oppInfo;
  const stubOf = oppStub;
  const figuresOf = (o: OppListRow) => oppFigures(o, today);

  /**
   * **المواضع: رفوفُ الكشف الثلاثة بحالها، وقبلها «تحتاج إجراءً»** — كانت قائمةً وحدَها فوق الرفوف (`OpportunityTodo`) والفرصةُ
   * باقيةٌ في رفّها أيضًا، فصارت موضعًا يجمعها بعدده. والكشفُ يفتح على «سارية» دائمًا كما كان.
   */
  const positions = useMemo<Position<OppListRow>[]>(() => [
    { key: "due", label: "تحتاج إجراءً", match: (o) => needsYou(o, today), empty: "لا فرصةَ تحتاج إجراءً منك." },
    { key: "live", label: "سارية", match: (o) => shelfOf(o, today) === "live", empty: "لا فرصَ سارية." },
    { key: "draft", label: "مسوّدات", match: (o) => shelfOf(o, today) === "draft", empty: "لا مسوّدات." },
    { key: "done", label: "منتهية", match: (o) => shelfOf(o, today) === "done", empty: "لا فرصَ منتهية بعد." },
  ], [today]);

  return (
    <>
      <CollectionRoom<OppListRow>
        navPath={VOLUNTEERING_ROOM.navPath}
        title={VOLUNTEERING_ROOM.title}
        action={{ label: "فرصة جديدة", icon: <Plus />, href: "/dashboard/volunteering/new" }}
        // كان في قائمة رأس الغرفة القديمة (⋮)؛ واللوحُ يحمل فعلًا ثانيًا هادئًا بجانب الإنشاء
        extra={{ label: "قروب المتطوّعين", icon: <UsersThree />, onClick: () => window.open(VOLUNTEERS_GROUP_URL, "_blank", "noopener") }}
        noun={AR_OPPORTUNITY}
        items={items}
        positions={positions}
        defaultPosition="live"
        searchPlaceholder="ابحث باسم الفرصة أو جهتها أو مكانها…"
        matchSearch={(o, q) => matchesSearch(q, `${o.title} ${o.committee ?? ""} ${o.location ?? ""}`)}
        viewKey={VOLUNTEERING_ROOM.viewKey}
        initialView={view}
        idOf={(o) => o.id}
        table={{
          // الترتيبُ بالفرصة وموعدها من رأسيهما كجداول الغرف كلّها (لم يكن للغرفة القديمة جدول)
          head: "الفرصة",
          headSortBy: (o) => o.title,
          stub: {
            key: "when", label: "الموعد", icon: <CalendarBlank />,
            sortBy: (o) => { const d = o.startsOn ?? o.endsOn; return d ? +new Date(`${d}T12:00:00+03:00`) : 0; },
          },
          columns: [
            { key: "apps", label: "الطلبات", icon: <Tray /> },
            // الثلاثةُ بأشرطتها أعرضُ من الرقم (`wide`): فالجدولُ يصير سطورًا قبل أن يُعصر عنوانُ الفرصة (كان 104 بكسل على 1280)
            { key: "accepted", label: "القبول", icon: <UserCheck />, wide: true },
            { key: "attended", label: "الحضور", icon: <CalendarCheck />, wide: true },
            { key: "certs", label: "الشهادات", icon: <Certificate />, wide: true },
          ],
        }}
        emptyAll={{ title: "لا فرصَ بعد", desc: "افتح فرصةً تطوّعيّة، وانشر رابطَها في قروب المتطوّعين." }}
        createAction={<AdButton variant="fill" icon={<Plus />} href="/dashboard/volunteering/new">فرصة جديدة</AdButton>}
        renderCard={(o) => (
          <AdCard
            key={o.id}
            seed={o.id}
            stub={stubOf(o)}
            chips={chips(o)}
            title={o.title}
            meta={info(o)}
            figures={figuresOf(o)}
            foot={acts(o)}
          />
        )}
        renderRow={(o) => (
          <AdRow
            key={o.id}
            title={o.title}
            stub={{ ...stubOf(o), seed: o.id }}
            badge={chips(o)}
            sub={info(o)}
            cells={figuresOf(o).map((f) => ({ label: f.label, value: f.value, of: f.of }))}
            acts={acts(o, true)}
          />
        )}
      />
      <AdConfirm
        open={ending !== null}
        onClose={() => setEnding(null)}
        tone="warning"
        icon={<FlagCheckered />}
        title="إنهاءُ الفرصة؟"
        text={`ينتهي التقديم على «${ending?.title ?? ""}»، ويصير عليك تسجيلُ إنجاز المقبولين وإصدارُ شهاداتهم. ولا يُتراجَع عن الإنهاء.`}
        confirmLabel="إنهاءُ الفرصة"
        loading={pending}
        onConfirm={end}
      />
    </>
  );
}
