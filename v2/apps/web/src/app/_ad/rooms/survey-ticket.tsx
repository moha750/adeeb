"use client";

/**
 * **تذكرةُ الاستبيان من مصدرٍ واحد** (٢٠٢٦-١١-٠٧): كعبُها وشاراتُها وسطورُها — يقرؤها كرتُها وسطرُها في غرفة الاستبيانات (`SurveysRoom`)
 * ورأسُ صفحة نتائجه (`SurveyResultsRoom`، قاعدةُ صفحة السجلّ: رأسُها تذكرتُه). نُقلت من `SurveysRoom.tsx` كما هي حرفًا
 * (سابقةُ `opportunity-ticket.tsx`)، وأُضيفت الدوالُّ الثلاث التي كانت أغلفةً داخل الغرفة.
 */
import { Clock, CalendarBlank, GlobeHemisphereEast, Handshake, LockSimple, UserCircle } from "@phosphor-icons/react";
import type { SurveyRow } from "@/app/dashboard/surveys/data";
import type { ACCESS_LABEL } from "@/app/dashboard/surveys/vocab";
import { AdBadge, type AdMeta, type AdMetaTone, type AdStub } from "../primitives";
import { fmtDayFull, fmtNum, relTime } from "../format";
import { arCount, arCounted, type ArForms } from "@/lib/arabicCount";

/**
 * المعدودُ تحت رقم الكعب: «1 مُشاركة»، «2 مُشاركتان»، «5 مُشاركات»، «12 مُشاركةً» — لا «1 المشاركات».
 * والميمُ مضمومةٌ (محمد ٢٠٢٦-١٠-٣٠) حيث تقف الكلمةُ وحدها بلا سياق: تحت الرقم، وعنوانِ عمود السطر.
 */
/**
 * **مَن يجيب** (محمد ٢٠٢٦-١٠-٣١: «عامّ» أو «للأعضاء» منفردةً غيرُ واضحة — و«عام» بلا شدّةٍ تُقرأ «سنة»): الرقاقةُ تقول
 * الجوابَ كاملًا برمزه، «للجميع» بالكرة و«للأعضاء فقط» بالقفل — وزنُهما واحد («لـ…»)، والمعنى معنى خيارَي النموذج.
 */
export const WHO_ANSWERS: Record<keyof typeof ACCESS_LABEL, { label: string; icon: React.ReactNode }> = {
  public: { label: "للجميع", icon: <GlobeHemisphereEast /> },
  members_only: { label: "للأعضاء فقط", icon: <LockSimple /> },
};
/**
 * **رقاقةُ الشراكة** (محمد ٢٠٢٦-١٠-٣١) برمز فعل «شركاء الاستبيان» نفسِه: عند الشريك ما ليس له وإذنُه فيه («مُشارَك معك
 * للقراءة/للتحرير» — لا تُخطئ جنسًا)، وعند صاحبه فعلُه هو («شاركته مع شريكين» — محمد ٢٠٢٦-١٠-٣١: الصاحبُ فاعلُ المشاركة؛
 * و«شاركته» بلا حركاتٍ تصلح للمخاطَب والمخاطَبة). وحسابُ النادي بلا رقاقة: الأزرارُ تكفيه.
 */
const PARTNERS: ArForms = ["شريكٍ واحد", "شريكين", "شركاء", "شريكًا"];
const partnerChip = (s: SurveyRow) =>
  s.role === "read" ? "مُشارَك معك للقراءة"
  : s.role === "edit" ? "مُشارَك معك للتحرير"
  : s.role === "owner" && (s.shareCount ?? 0) > 0 ? `شاركته مع ${arCount(s.shareCount ?? 0, PARTNERS)}`
  : null;
export const RESPONSES: ArForms = ["مُشاركة", "مُشاركتان", "مُشاركات", "مُشاركةً"];

/** الحالُ حيث تخالف موضعَها وحدها: في «نشطة» المتوقّفُ والمجدولُ والمنقضي. رقاقةٌ على الكرت، وشارةٌ في السطر. */
function deviation(s: SurveyRow) {
  if (s.deleted || s.archived) return null;
  const d =
    s.status === "paused" ? { tone: "warn" as const, label: "متوقّف مؤقّتًا" }
    : s.status === "active" && s.scheduled ? { tone: "info" as const, label: "مجدول" }
    : s.status === "active" && s.expired ? { tone: "neutral" as const, label: "انتهت مدّته" }
    : null;
  if (!d) return null;
  return <AdBadge tone={d.tone}>{d.label}</AdBadge>;
}

/** لونُ سطر الحال: مفتوحٌ أخضر، وما يحتاج انتباهًا (موقوف، مجدول، يُغلق خلال ثلاثة أيّام) كهرمانيّ، والمنتهي خافت. */
const SOON = 3 * 864e5;
function statusTone(s: SurveyRow, now: number): AdMetaTone {
  if (s.deleted) return "bad";
  if (s.status === "draft" || s.status === "closed" || s.expired) return "muted";
  if (s.status === "paused" || s.scheduled) return "warn";
  if (s.endDate && +new Date(s.endDate) - now < SOON) return "warn";
  return "ok";
}

function statusText(s: SurveyRow, now: number): string {
  if (s.deleted) return "محذوف";
  if (s.status === "draft") return "لم يُنشر بعد";
  if (s.status === "paused") return "موقوفٌ مؤقّتًا";
  if (s.status === "closed") return s.endDate ? `انتهى ${relTime(s.endDate, now)}` : "مغلق";
  if (s.scheduled) return s.startDate ? `يفتح ${relTime(s.startDate, now)}` : "مجدولٌ للفتح";
  if (s.expired) return s.endDate ? `انتهت مدّته ${relTime(s.endDate, now)}` : "انتهت مدّته";
  if (s.endDate) return `يُغلق ${relTime(s.endDate, now)}`;
  return "مفتوحٌ للمشاركة دائمًا";
}

/** الكعبُ: المشاركاتُ بعددها ومعدودِها — في الكرت، وكعبًا مصغّرًا أوّلَ السطر، ورأسَ صفحة النتائج. */
export const surveyStub = (s: SurveyRow): AdStub => ({ big: fmtNum(s.responses), small: arCounted(s.responses, RESPONSES) });
/** **الرقاقاتُ والسطورُ مصدرُها واحد** (محمد ٢٠٢٦-١١-٠١): مَن يجيب، والشراكة، والحالُ حيث تخالف موضعَها — رقاقاتٌ في العرضين. */
export const surveyChips = (s: SurveyRow) => (
  <>
    <AdBadge icon={WHO_ANSWERS[s.access].icon}>{WHO_ANSWERS[s.access].label}</AdBadge>
    {partnerChip(s) && <AdBadge icon={<Handshake />}>{partnerChip(s)}</AdBadge>}
    {deviation(s)}
  </>
);
/**
 * والسطورُ بترتيبها (محمد ٢٠٢٦-١٠-٣١): الحالُ، ثمّ «أُنشئ 19 أكتوبر 2026»، ثمّ «بإعداد فلان» — كالفعاليّة: الموعدُ ثمّ «بتنظيم».
 * و«بإعداد» على قاعدة «بتحرير/بتنظيم»: لا تُخطئ جنسَ المُعِدّ. وفي السطر «أُنشئ» عمودٌ فيخرج منها.
 */
export const surveyInfo = (s: SurveyRow, inCard: boolean, now: number): AdMeta[] => [
  { icon: <Clock />, text: statusText(s, now), tone: statusTone(s, now) },
  ...(inCard && s.createdRaw ? [{ icon: <CalendarBlank />, text: `أُنشئ ${fmtDayFull(s.createdRaw)}` }] : []),
  { icon: <UserCircle />, text: s.createdBy ? `بإعداد ${s.createdBy}` : "المُعِدّ غير معروف" },
];
