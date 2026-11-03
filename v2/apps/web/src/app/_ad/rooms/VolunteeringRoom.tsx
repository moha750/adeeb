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
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { matchesSearch } from "@adeeb/design-system";
import {
  Buildings, CalendarBlank, CalendarCheck, Certificate, ClipboardText, FlagCheckered, GenderIntersex, Infinity as Endless, LinkSimple, LockSimple,
  MapPin, Megaphone, Tray, UserCheck, UsersThree,
} from "@phosphor-icons/react";
import { PencilSimple, Plus } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { OppListRow } from "@/app/dashboard/volunteering/data";
import { endOpportunity, setOpportunityStatus } from "@/app/dashboard/volunteering/actions";
import { SHELF_LABEL, monoState, needsYou, nextStep, shelfOf, timeOf, type Shelf } from "@/app/dashboard/volunteering/OpportunityCard";
import { VOLUNTEERS_GROUP_URL } from "@/lib/volunteersGroup";
import { copyText } from "@/lib/clipboard";
import { dateOnlyParts, fmtTimeRange } from "@/lib/dates";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdActs, AdBadge, AdButton, AdCard, AdConfirm, AdRow, type AdAction, type AdFigure, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { dayParts, fmtNum } from "../format";

const AR_OPPORTUNITY: ArForms = ["فرصةٌ واحدة", "فرصتان", "فرص", "فرصةً"];
const AR_PERIOD: ArForms = ["فترةٌ واحدة", "فترتان", "فترات", "فترةً"];

type Act = ReturnType<typeof nextStep>["act"];

/** شارةُ الحال بنغمتها القديمة (`monoState`): مسوّدةٌ كهرمانيّة، ومتاحةٌ خضراء، وانتهى التقديمُ بلون الهويّة، ومنتهيةٌ محايدة. */
const TONE: Record<ReturnType<typeof monoState>["badge"], AdTone> = { warning: "warn", success: "ok", info: "info", neutral: "neutral" };

/** رمزُ ما ينتظرك في الفرصة — رموزُ قائمة «تحتاج إجراءً منك» القديمة (`TODO_ICON`): ما يُفعل لا حالُ الفرصة. */
const STEP_ICON: Partial<Record<Act, ReactNode>> = {
  decide: <Tray />, attend: <CalendarCheck />, certify: <Certificate />, close: <LockSimple />, publish: <PencilSimple />,
};

/**
 * **ترتيبُ الرفوف ترتيبُ الكشف القديم**: الساريةُ والمسوّداتُ بموعدها الأقربُ أوّلًا، والمنتهيةُ أحدثُها أوّلًا (`OpportunityBoard`).
 * والقالبُ يعرض كلَّ موضعٍ بترتيب البيانات، فتُرتَّب مرّةً: الرفُّ ثمّ الموعد. ورتبةُ الرفوف (سارية، منتهية، مسوّدات) لموضع
 * «تحتاج إجراءً» وحده — يجمع الرفوفَ كلَّها، فيأتي الحضورُ والشهاداتُ قبل النشر كما كانت قائمتُه (`TODO_ORDER`) تقريبًا.
 */
const RANK: Record<Shelf, number> = { live: 0, done: 1, draft: 2 };

/**
 * **سطرُ الموعد كما كُتب في نافذة الفرصة** (`scheduleParts` في الكرت القديم): الأيّامُ ثمّ الساعات، والمرنةُ تقول إنّها مرنة.
 * والسنةُ في التاريخ دائمًا (قاعدةُ القالب، محمد ٢٠٢٦-١٠-٣١): مرّةً في آخر المدى، ولكلٍّ من طرفيه إن اختلفت سنتاهما.
 */
function scheduleOf(o: OppListRow): string | null {
  if (o.flexible) {
    const d = dateOnlyParts(o.endsOn);
    return ["مرنة، بلا يومٍ ولا ساعة", o.endedAt ? "أُنهيت" : d ? `حتى ${d.weekday} ${d.day} ${d.month} ${d.year}` : "تُنهى حين يكتمل العمل"].join("، ");
  }
  const s = dateOnlyParts(o.startsOn);
  if (!s) return null;
  const e = o.endsOn && o.endsOn > o.startsOn! ? dateOnlyParts(o.endsOn) : null;
  const days = !e ? `${s.weekday} ${s.day} ${s.month} ${s.year}`
    : e.year !== s.year ? `من ${s.day} ${s.month} ${s.year} إلى ${e.day} ${e.month} ${e.year}`
    : e.month === s.month ? `من ${s.day} إلى ${e.day} ${s.month} ${s.year}`
    : `من ${s.day} ${s.month} إلى ${e.day} ${e.month} ${e.year}`;
  // «يوميًّا» للمدى المحفوظ ساعتين في فرصةٍ تمتدّ أيّامًا؛ والمدّةُ النصّيّةُ القديمة تقول نفسَها
  const hours = o.periods.length ? periodsHours(o) : o.timeLabel && e && o.dailyFrom ? `${o.timeLabel} يوميًّا` : o.timeLabel;
  return [days, hours].filter((x): x is string => !!x).join("، ");
}

/** الفترةُ الواحدةُ بساعتيها، والفترتان فأكثر بعددها ومدى اليوم إن كانت كلُّها في يومٍ واحد (`periodsHours` القديم). */
function periodsHours(o: OppListRow): string {
  const ps = o.periods;
  if (ps.length === 1) return fmtTimeRange(ps[0].from, ps[0].to);
  const count = arCount(ps.length, AR_PERIOD);
  const oneDay = ps.every((p) => p.day === ps[0].day) && ps.every((p) => p.to > p.from);
  if (!oneDay) return count;
  const from = ps.map((p) => p.from).sort()[0];
  const to = ps.map((p) => p.to).sort().at(-1)!;
  return `${count}، ${fmtTimeRange(from, to)}`;
}

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

  /**
   * **الرقاقاتُ والسطورُ مصدرُها واحدٌ وترتيبُها واحد**: شارةُ الحال (`monoState`) في العرضين، ومعها ما ينتظرك في الفرصة بجملة
   * خطوتها التالية — كانت المحطّةُ التي عليك تنبض بها في المترو (والمسوّدةُ تقولها شارتُها). ثمّ خاناتُ الفرصة الأربع بترتيبها
   * القديم (`factsOf`): الجهةُ المحتاجة، والمكان، والموعد، والجنس.
   */
  const chips = (o: OppListRow) => {
    const st = monoState(o, today);
    const step = nextStep(o, today);
    return (
      <>
        <AdBadge tone={TONE[st.badge]}>{st.label}</AdBadge>
        {needsYou(o, today) && o.status !== "draft" && <AdBadge tone="warn" icon={STEP_ICON[step.act]}>{step.text}</AdBadge>}
      </>
    );
  };
  const info = (o: OppListRow): AdMeta[] => {
    const who = o.targetGender === "male" ? "للرجال" : o.targetGender === "female" ? "للنساء" : "للجميع";
    return [
      { icon: <Buildings />, text: o.committee ? `لصالح ${o.committee}` : "بلا لجنة" },
      { icon: <MapPin />, text: o.location ?? "المكان لم يُحدَّد" },
      { icon: <CalendarBlank />, text: scheduleOf(o) ?? "الموعد لم يُحدَّد" },
      { icon: <GenderIntersex />, text: who },
    ];
  };
  /** الكعبُ: يومُ البداية وشهرُه وسنتُه؛ والمرنةُ لانهايةٌ لا تقويم (ورقةُ الكرت القديم، أمرُ المالك ٢٠٢٦-١٠-٠٣)، وما لم يُحدَّد موعدُه قماشٌ وحده. */
  const stubOf = (o: OppListRow) => {
    if (o.flexible) return { big: "", icon: <Endless />, small: "مرنة" };
    if (!o.startsOn) return undefined;
    const d = dayParts(`${o.startsOn}T12:00:00`);
    return { big: d.day, small: d.month };
  };

  /**
   * **أرقامُ الكرت محطّاتُ المترو الأربع** (`stagesOf`): الطلباتُ عددًا، والقبولُ من المقاعد، والحضورُ (أو الإنجازُ للمرنة) من
   * المقبولين، والشهاداتُ ممّن حضر. والشريطُ للمحطّة التي هي جزءٌ من كلّ، والكلمةُ مكانَ النسبة حين لم يأتِ وقتُها أو سقطت
   * — كلماتُ المحطّة القديمة نفسُها (`attendWords`).
   */
  const figuresOf = (o: OppListRow): AdFigure[] => {
    const { ended, running } = timeOf(o, today);
    const began = ended || running;
    const applied = o.pending + o.accepted + o.rejected + o.expired;
    const recorded = o.attended + o.absent;
    const flex = o.flexible;
    return [
      { icon: <Tray />, label: "الطلبات", value: fmtNum(applied) },
      {
        // العددُ المفتوح بكلمة المحطّة القديمة («العددُ مفتوح») لا بمحرف «∞» من خطٍّ غريب
        icon: <UserCheck />, label: "القبول", value: o.seats == null ? fmtNum(o.accepted) : `${fmtNum(o.accepted)} / ${fmtNum(o.seats)}`,
        of: o.seats ? { now: o.accepted, max: o.seats, full: "مكتمل" } : { now: o.accepted, max: 0, note: "العددُ مفتوح" },
      },
      {
        icon: <CalendarCheck />, label: flex ? "الإنجاز" : "الحضور", value: `${fmtNum(o.attended)} / ${fmtNum(o.accepted)}`,
        of: { now: o.attended, max: o.accepted, note: !began ? (flex ? "بعد انتهائها" : "يومَ الفرصة") : o.accepted === 0 ? "لا مقبولين" : undefined },
      },
      {
        icon: <Certificate />, label: "الشهادات", value: `${fmtNum(o.certified)} / ${fmtNum(o.attendees)}`,
        of: {
          now: o.certified, max: o.attendees,
          note: o.attended > 0 ? undefined : began && recorded >= o.accepted ? (flex ? "لا منجزين" : "لا حاضرين") : flex ? "بعد الإنجاز" : "بعد الحضور",
        },
      },
    ];
  };

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
