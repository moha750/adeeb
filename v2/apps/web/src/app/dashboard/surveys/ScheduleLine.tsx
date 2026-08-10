"use client";

// سطر التوقيت — يكشف نافذة الاستبيان (يبدأ/ينتهي/انتهى، تاريخٌ مطلق + تلميحٌ نسبيّ) حين توجد،
// ويرتدّ إلى تاريخ الإنشاء حين لا. **سطرٌ واحدٌ دائمًا** (يُقصّ بأناقة والتفصيل في التلميح) — فلا
// يتفاوت ارتفاع الكروت/الصفوف. مصدرٌ واحد يخدم ذيلَ الكرت وعمودَ التوقيت في الجدول.
import { useEffect, useState } from "react";
import { CalendarBlank } from "@phosphor-icons/react";
import { fmtDayMonth as shortDate, fmtDateAndTime as fullDate } from "./format";
import type { SurveyRow } from "./data";

// أرقامٌ لاتينيّة (كبقيّة تواريخ اللوحة)، والصياغة العربيّة تضبط المثنّى/الجمع تلقائيًّا
const RTF = new Intl.RelativeTimeFormat("ar-u-nu-latn", { numeric: "auto" });

/** تلميحٌ نسبيّ بأدقّ وحدةٍ مناسبة (دقائق/ساعات/أيّام). */
const relative = (target: number, now: number): string => {
  const diff = target - now;
  if (Math.abs(diff) < 3_600_000) return RTF.format(Math.round(diff / 60_000), "minute");
  if (Math.abs(diff) < 86_400_000) return RTF.format(Math.round(diff / 3_600_000), "hour");
  return RTF.format(Math.round(diff / 86_400_000), "day");
};

/** ساعةٌ عميليّة تبدأ بعد التركيب (0 على الخادم/أوّل رندر فلا تلميحَ نسبيّ حتى يتّسق التمييه)، ثمّ تنبض كلّ دقيقة. */
function useClientNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t0 = setTimeout(() => setNow(Date.now()), 0);
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => { clearTimeout(t0); clearInterval(tick); };
  }, []);
  return now;
}

type Seg = { verb: string; iso: string; at: number };
const seg = (verb: string, iso: string): Seg => ({ verb, iso, at: new Date(iso).getTime() });

/**
 * نافذة التوقيت: **الحدث الأهمّ لطور الاستبيان الآن** (primary) — فالعمود يجيب سؤالًا واحدًا
 * «متى الحدث المهمّ؟» بلا ازدحام. والحدث الثانويّ (نهايةُ المجدول، بدايةُ الحيّ) يبقى في التلميح.
 * لا تعتمد على الوقت الحيّ (تُشتقّ من scheduled/expired الجاهزة)، فالبنية ثابتة.
 */
function windowOf(s: SurveyRow): { primary: Seg; extra: Seg[] } | null {
  if (s.status === "active") {
    if (s.scheduled && s.startDate) return { primary: seg("يبدأ", s.startDate), extra: s.endDate ? [seg("ينتهي", s.endDate)] : [] };
    if (s.expired && s.endDate) return { primary: seg("انتهى", s.endDate), extra: s.startDate ? [seg("بدأ", s.startDate)] : [] };
    if (s.endDate) return { primary: seg("ينتهي", s.endDate), extra: s.startDate ? [seg("بدأ", s.startDate)] : [] };
    return null; // حيّ بلا نهاية → لا نافذة (يرتدّ للإنشاء)
  }
  if (s.status === "closed" && s.endDate) return { primary: seg("انتهى", s.endDate), extra: s.startDate ? [seg("بدأ", s.startDate)] : [] };
  return null;
}

export function ScheduleLine({ survey, className }: { survey: SurveyRow; className?: string }) {
  const now = useClientNow();
  const win = windowOf(survey);

  // بلا نافذة زمنيّة → السطرُ نفسه يحمل تاريخ الإنشاء: لا سطرٌ زائد، وارتفاعٌ ثابتٌ عبر الكروت والصفوف.
  // بأيقونة التقويم نفسها لاتّساق السطر مع حالة النافذة.
  if (!win) {
    return (
      <span className={`flex min-w-0 items-center gap-1.5 text-content-muted ${className ?? ""}`}>
        <CalendarBlank aria-hidden className="shrink-0" />
        <span className="truncate">أُنشئ {survey.created}</span>
      </span>
    );
  }

  const rel = (x: Seg) => (now > 0 ? ` (${relative(x.at, now)})` : "");
  const primary = `${win.primary.verb} ${shortDate(win.primary.iso)}${rel(win.primary)}`;
  // التلميح: الأساسيّ ثمّ الثانويّ بالتاريخ الكامل — الطرفان معًا لمن أراد التفصيل
  const title = [win.primary, ...win.extra].map((x) => `${x.verb} ${fullDate(x.iso)}${rel(x)}`).join("، ");

  return (
    <span className={`flex min-w-0 items-center gap-1.5 text-content-muted ${className ?? ""}`} title={title}>
      <CalendarBlank aria-hidden className="shrink-0" />
      <span className="truncate">{primary}</span>
    </span>
  );
}
