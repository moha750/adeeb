"use client";

// سطر الحالة المُخاطِب — يحلّ محلّ «تاريخ ← تاريخ» في كرت الاستبيان: أيقونةٌ + جملةٌ تخاطب حالَ
// الاستبيان وعدّادٌ حيّ («يفتح بعد ٣ أيّام» · «يُغلق بعد ٥ أيّام» · «متاحٌ دائمًا» · «انتهى في …»).
// يُكمّل الشارة لا يكرّرها (الشارة = الحالة، وهذا = الفعل والوقت). التاريخ الدقيق في التلميح.
import { useEffect, useState } from "react";
import {
  FileDashed, FlagCheckered, Hourglass, Infinity as InfinityIcon, LockSimple, PauseCircle, Timer,
} from "@phosphor-icons/react";
import { Trash } from "@/app/_components/glyphs";
import { arCountdown } from "@/lib/duration";
import { fmtDateAndTime, fmtDayMonth } from "@/lib/dates";
import type { SurveyRow } from "./data";

/** ساعةٌ عميليّة تبدأ بعد التركيب (0 على الخادم/أوّل رندر فلا عدّاد حتى يتّسق التمييه)، ثمّ تنبض كلّ دقيقة. */
function useClientNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t0 = setTimeout(() => setNow(Date.now()), 0);
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => { clearTimeout(t0); clearInterval(tick); };
  }, []);
  return now;
}

// المدّةُ وجمعُها العربيّ رُفعا إلى `lib/duration` — يقاسمهما كرتُ الانتخاب، فلا نسختان.
const countdown = arCountdown;

// نغمةُ الأيقونة بالحال (دلاليّة): محذوفٌ أحمر · مفتوحٌ أخضر · موقوفٌ أصفر · مجدولٌ/مسودّة فولاذيّ · منتهٍ رماديّ.
type Tone = "steel" | "success" | "warning" | "neutral" | "danger";
type View = { icon: React.ReactNode; text: string; title?: string; tone: Tone };

/** الجملة والأيقونة بحسب الحال — النشط له عدّادٌ حيّ، وسواه جملةٌ ساكنة. لا يعتمد على الوقت إلّا للعدّاد. */
function viewOf(s: SurveyRow, now: number): View {
  const startAt = s.startDate ? new Date(s.startDate).getTime() : null;
  const endAt = s.endDate ? new Date(s.endDate).getTime() : null;

  // العَلَمان أوّلًا (كالبادج) — لا يُعرَض عدّادٌ حيٌّ على مُزال، والنغمة تطابق نغمة الكرت
  if (s.deleted) return { icon: <Trash />, text: "محذوف", tone: "danger" };
  if (s.status === "draft") return { icon: <FileDashed />, text: "لم يُنشر بعد", tone: "steel" };
  if (s.status === "paused") return { icon: <PauseCircle />, text: "موقوفٌ مؤقّتًا", tone: "warning" };
  if (s.status === "closed") {
    return s.endDate
      ? { icon: <LockSimple />, text: `انتهى في ${fmtDayMonth(s.endDate)}`, title: fmtDateAndTime(s.endDate), tone: "neutral" }
      : { icon: <LockSimple />, text: "مغلق", tone: "neutral" };
  }
  // نشط — العدّاد يظهر بعد التركيب (now>0)، وقبله جملةٌ ذات معنًى فلا وميض فارغ
  if (s.scheduled && startAt != null) {
    const c = now > 0 ? countdown(startAt, now) : "";
    return { icon: <Hourglass />, text: c ? `يفتح ${c}` : "مجدولٌ للفتح", title: fmtDateAndTime(s.startDate), tone: "steel" };
  }
  if (s.expired && endAt != null) {
    const c = now > 0 ? countdown(endAt, now) : "";
    return { icon: <FlagCheckered />, text: c ? `انتهت مدّته ${c}` : "انتهت مدّته", title: fmtDateAndTime(s.endDate), tone: "neutral" };
  }
  if (endAt != null) {
    const c = now > 0 ? countdown(endAt, now) : "";
    return { icon: <Timer />, text: c ? `يُغلق ${c}` : "مفتوحٌ للمشاركة", title: fmtDateAndTime(s.endDate), tone: "success" };
  }
  return { icon: <InfinityIcon />, text: "متاحٌ دائمًا", tone: "success" };
}

/**
 * سطر الحالة — أيقونةٌ في **رقاقة Aurora منغَّمة بالحالة** (`.tico`، ق٣/٤) + جملةٌ + عدّادٌ حيّ.
 * الرقاقة هي المُعتمَدة (تُبرز الأيقونة فلا تذوب عند حجم السطر).
 */
export function SurveyStatusLine({ survey, className }: { survey: SurveyRow; className?: string }) {
  const now = useClientNow();
  const v = viewOf(survey, now);
  return (
    <span className={`scard-meta flex items-center gap-1.5 ${className ?? ""}`} title={v.title}>
      <span className={`tico tico-${v.tone}`}>{v.icon}</span>
      <span className="truncate">{v.text}</span>
    </span>
  );
}
