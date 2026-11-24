import type { ReactNode } from "react";
import { FlagCheckered, FloppyDisk, NotePencil, PaperPlaneTilt, Play, RocketLaunch, SealCheck, Stamp, UserCircle, UsersThree } from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowUUpLeft, Checks, PencilSimple } from "@/app/_components/glyphs";
import type { VisionLogAction, VisionLogRow } from "@/app/dashboard/vision/data";
import { trackIcon } from "@/app/vision/_parts/trackIcon";
import type { ArForms } from "@/lib/arabicCount";
import type { AdLogEvent } from "../log";
import type { AdMeta, AdTone } from "../primitives";

/**
 * **سجلُّ الرؤية على السجلّ المشترك** (`AdLog`) — واحدٌ لغرفة «متابعة الرؤية» ولمحرّر الرؤية في «الرؤى»: الواقعةُ جملةٌ مبنيّةٌ للمجهول
 * (فلا يختلف فعلُها بجنس فاعلها)، والفاعلُ «بيد فلان» بأيقونته، والمسارُ والسببُ أو الدليلُ أو الملاحظةُ كلٌّ بأيقونته، والساعةُ في طرف السطر.
 * ويروي دورةَ الرؤية كلَّها: عملَ الفريق في الأهداف، ثمّ من أرسلها ومن وافق ومن أطلقها وأغلقها.
 */
export const AR_LOG: ArForms = ["فعلٌ واحد", "فعلان", "أفعال", "فعلًا"];

const LOG_ICON: Record<VisionLogAction, ReactNode> = {
  status: <Play />, reported: <Checks />, withdrawn: <ArrowCounterClockwise />, confirmed: <SealCheck />,
  returned: <ArrowUUpLeft />, unconfirmed: <ArrowCounterClockwise />, edited: <PencilSimple />, team: <UsersThree />,
  saved: <FloppyDisk />, submitted: <PaperPlaneTilt />, recalled: <ArrowCounterClockwise />, approved: <Stamp />,
  unapproved: <ArrowCounterClockwise />, sent_back: <ArrowUUpLeft />, launched: <RocketLaunch />, closed: <FlagCheckered />,
};
/**
 * نغمةُ الواقعة **على مثال سجلّ الانتخاب** (`KIND_TONE`): الرفعُ والبدءُ والإرسالُ والإطلاقُ كالتقدّم والفتح إخباريّة، والتأكيدُ والموافقةُ
 * كالاعتماد خضراء، وإلغاءُ التحقّق كالسحب أحمر (يُطفئ قطعةً يراها الناس)، وتعديلُ النصّ كالتعديل كهرمانيّ، وتعديلُ الفريق إخباريّ؛ **والإرجاعُ
 * والإعادةُ كهرمانيّتان لا حمراوان** (محمد ٢٠٢٦-١١-٢٢): ليسا رفضًا نهائيًّا بل «أكمِل وأعِد» — والأحمرُ يُقرأ عقوبةً تُثني عن الرفع؛
 * وما يتراجع به صاحبُه (سحبُ الرفع أو المسوّدة أو الموافقة، العودةُ إلى «لم يبدأ») والحفظُ والإغلاقُ محايدة.
 */
const LOG_TONE: Partial<Record<VisionLogAction, AdTone>> = {
  reported: "info", confirmed: "ok", returned: "warn", unconfirmed: "bad", edited: "warn", team: "info",
  submitted: "info", approved: "ok", sent_back: "warn", launched: "info",
};
const toneOf = (l: VisionLogRow): AdTone | undefined => (l.action === "status" && l.to !== "pending" ? "info" : LOG_TONE[l.action]);

const SEAT: Record<string, [string, string]> = {
  club_president: ["رئيس أدِيب", "رئيسة أدِيب"],
  executive_council_president: ["الرئيس التنفيذي", "الرئيسة التنفيذية"],
};

function logTitle(l: VisionLogRow): string {
  const t = `«${l.goalTitle ?? "هدف"}»`;
  const seat = SEAT[l.seat ?? ""]?.[l.actorFemale ? 1 : 0] ?? "أحد الرئيسين";
  switch (l.action) {
    case "status": return l.to === "pending" ? `عاد ${t} إلى «لم يبدأ»` : `بدأ العمل على ${t}`;
    case "reported": return `أُنجز ${t} ورُفع للتأكيد`;
    case "withdrawn": return `سُحب «أُنجز» عن ${t}`;
    case "confirmed": return `تحقّق ${t}`;
    case "returned": return `أُرجع ${t} إلى «قيد العمل»`;
    case "unconfirmed": return `أُلغي تحقّق ${t}`;
    case "edited": return `عُدّل ${t}`;
    case "team": return "عُدّل فريق الرؤية";
    case "saved": return "حُفظت المسوّدة";
    case "submitted": return "أُرسلت المسوّدة للرئيسين";
    case "recalled": return "سُحبت المسوّدة للتعديل";
    case "approved": return `سُجّلت موافقة ${seat}`;
    case "unapproved": return `سُحبت موافقة ${seat}`;
    case "sent_back": return "أُعيدت المسوّدة بملاحظة";
    case "launched": return "أُطلقت الرؤية";
    case "closed": return "أُغلقت الرؤية";
  }
}

const NOTE_LABEL: Partial<Record<VisionLogAction, string>> = { returned: "السبب", reported: "الدليل", sent_back: "الملاحظة" };

export function visionLogEvent(l: VisionLogRow, tracks: { position: number; name: string; icon: string }[]): AdLogEvent {
  const t = l.trackPosition != null ? tracks.find((x) => x.position === l.trackPosition) : undefined;
  const meta: AdMeta[] = [
    { icon: <UserCircle />, text: `بيد ${l.actor}` },
    ...(t ? [{ icon: trackIcon(t.icon), text: `مسار ${t.name}` }] : []),
    ...(l.note ? [{ icon: <NotePencil />, text: `${NOTE_LABEL[l.action] ?? "الملاحظة"}: ${l.note}` }] : []),
  ];
  const change = l.tally
    ? `تحقّق ${l.tally.done} من ${l.tally.total}`
    : l.changes.length ? (l.action === "edited" ? `تغيّر ${l.changes.join("، ")}` : l.changes.join("، ")) : undefined;
  return { icon: LOG_ICON[l.action], tone: toneOf(l), title: logTitle(l), change, changeIcon: change ? (l.tally ? <SealCheck /> : <PencilSimple />) : undefined, meta };
}

/** تعديلاتٌ متتاليةٌ على الهدف نفسِه، أو حفظاتٌ متتاليةٌ للمسوّدة، بيد الشخص نفسِه: سطرٌ واحدٌ بعدده */
export const visionLogSame = (a: VisionLogRow, b: VisionLogRow) =>
  a.action === b.action && a.actor === b.actor && (a.action === "saved" || (a.action === "edited" && a.goalTitle === b.goalTitle));
