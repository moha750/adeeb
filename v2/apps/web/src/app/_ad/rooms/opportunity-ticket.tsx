"use client";

/**
 * **تذكرةُ الفرصة التطوّعيّة من مصدرٍ واحد** (٢٠٢٦-١١-٠٧): شاراتُها وسطورُها وكعبُها وأرقامُها — يقرؤها كرتُها وسطرُها في غرفة الفرص
 * (`VolunteeringRoom`) ورأسُ سجلّها (`OpportunityRecordRoom`، قالب «التذكرة المفتوحة») فلا تفترق التذكرةُ في القائمة عنها مفتوحة.
 * نُقلت من `VolunteeringRoom.tsx` كما هي حرفًا.
 */
import type { ReactNode } from "react";
import {
  Buildings, CalendarBlank, CalendarCheck, Certificate, GenderIntersex, Infinity as Endless, LockSimple, MapPin, Tray, UserCheck,
} from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import type { OppListRow } from "@/app/dashboard/volunteering/data";
import { monoState, needsYou, nextStep, timeOf } from "@/app/dashboard/volunteering/OpportunityCard";
import { dateOnlyParts, fmtTimeRange } from "@/lib/dates";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdBadge, type AdFigure, type AdMeta, type AdStub, type AdTone } from "../primitives";
import { dayParts, fmtNum } from "../format";

const AR_PERIOD: ArForms = ["فترةٌ واحدة", "فترتان", "فترات", "فترةً"];
type Act = ReturnType<typeof nextStep>["act"];

/** شارةُ الحال بنغمتها القديمة (`monoState`): مسوّدةٌ كهرمانيّة، ومتاحةٌ خضراء، وانتهى التقديمُ بلون الهويّة، ومنتهيةٌ محايدة. */
export const OPP_TONE: Record<ReturnType<typeof monoState>["badge"], AdTone> = { warning: "warn", success: "ok", info: "info", neutral: "neutral" };

/** رمزُ ما ينتظرك في الفرصة — رموزُ قائمة «تحتاج إجراءً منك» القديمة (`TODO_ICON`): ما يُفعل لا حالُ الفرصة. */
export const STEP_ICON: Partial<Record<Act, ReactNode>> = {
  decide: <Tray />, attend: <CalendarCheck />, certify: <Certificate />, close: <LockSimple />, publish: <PencilSimple />,
};

/**
 * **سطرُ الموعد كما كُتب في نافذة الفرصة** (`scheduleParts` في الكرت القديم): الأيّامُ ثمّ الساعات، والمرنةُ تقول إنّها مرنة.
 * والسنةُ في التاريخ دائمًا (قاعدةُ القالب، محمد ٢٠٢٦-١٠-٣١): مرّةً في آخر المدى، ولكلٍّ من طرفيه إن اختلفت سنتاهما.
 */
export function scheduleOf(o: OppListRow): string | null {
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


/**
 * **الرقاقاتُ والسطورُ مصدرُها واحدٌ وترتيبُها واحد**: شارةُ الحال (`monoState`) في العرضين، ومعها ما ينتظرك في الفرصة بجملة
 * خطوتها التالية — كانت المحطّةُ التي عليك تنبض بها في المترو (والمسوّدةُ تقولها شارتُها). ثمّ خاناتُ الفرصة الأربع بترتيبها
 * القديم (`factsOf`): الجهةُ المحتاجة، والمكان، والموعد، والجنس.
 */
export function oppChips(o: OppListRow, today: string) {
  const st = monoState(o, today);
  const step = nextStep(o, today);
  return (
    <>
      <AdBadge tone={OPP_TONE[st.badge]}>{st.label}</AdBadge>
      {needsYou(o, today) && o.status !== "draft" && <AdBadge tone="warn" icon={STEP_ICON[step.act]}>{step.text}</AdBadge>}
    </>
  );
}
export function oppInfo(o: OppListRow): AdMeta[] {
  const who = o.targetGender === "male" ? "للرجال" : o.targetGender === "female" ? "للنساء" : "للجميع";
  return [
    { icon: <Buildings />, text: o.committee ? `لصالح ${o.committee}` : "بلا لجنة" },
    { icon: <MapPin />, text: o.location ?? "المكان لم يُحدَّد" },
    { icon: <CalendarBlank />, text: scheduleOf(o) ?? "الموعد لم يُحدَّد" },
    { icon: <GenderIntersex />, text: who },
  ];
}
/** الكعبُ: يومُ البداية وشهرُه وسنتُه؛ والمرنةُ لانهايةٌ لا تقويم (ورقةُ الكرت القديم، أمرُ المالك ٢٠٢٦-١٠-٠٣)، وما لم يُحدَّد موعدُه قماشٌ وحده. */
export function oppStub(o: OppListRow): AdStub | undefined {
  if (o.flexible) return { big: "", icon: <Endless />, small: "مرنة" };
  if (!o.startsOn) return undefined;
  const d = dayParts(`${o.startsOn}T12:00:00`);
  return { big: d.day, small: d.month };
}

/**
 * **أرقامُ الكرت محطّاتُ المترو الأربع** (`stagesOf`): الطلباتُ عددًا، والقبولُ من المقاعد، والحضورُ (أو الإنجازُ للمرنة) من
 * المقبولين، والشهاداتُ ممّن حضر. والشريطُ للمحطّة التي هي جزءٌ من كلّ، والكلمةُ مكانَ النسبة حين لم يأتِ وقتُها أو سقطت
 * — كلماتُ المحطّة القديمة نفسُها (`attendWords`).
 */
export function oppFigures(o: OppListRow, today: string): AdFigure[] {
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
}
