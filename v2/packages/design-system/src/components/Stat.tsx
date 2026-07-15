import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type StatTone = "brand" | "success" | "warning" | "danger";

export interface StatProps {
  /** أيقونة هويّة في مربّع بتدرّج النغمة — **إلزاميّة** (كنظام الحقل: لا كرت بلا أيقونة). */
  icon: ReactNode;
  /** الرقم/القيمة — بخطّ Eras اللاتينيّ عبر .stat-val. */
  value: ReactNode;
  /** تسمية الكرت أسفل الرقم. */
  label: string;
  /** النغمة: تدرّج الأيقونة + سطح Aurora + الحدّ + الظلّ. */
  tone?: StatTone;
  /** عنصر يسار الأيقونة في الصفّ العلويّ — مؤشّر اتّجاه غالبًا (`<Badge>`). */
  trend?: ReactNode;
  className?: string;
}

/**
 * كرت إحصاء (KPI) — سطح Aurora · أيقونة بتدرّج النغمة · رقم Eras · مؤشّر اتّجاه اختياريّ.
 * ضعه داخل `.stat-grid`: ثلاثة كحدّ أقصى في الصفّ، واليتيم يمتدّ على الصفّ كاملًا تلقائيًّا.
 *
 * مصدر واحد لكلّ كروت الإحصاء: نظرة عامّة · الأعضاء · التحليلات · الهيكلة · تعيين المناصب.
 * (حلّ محلّ `.org-stat` المؤقّت الذي كان في globals.css بحدّ 1px صريح يخالف القاعدة ٤.)
 */
export function Stat({ icon, value, label, tone = "brand", trend, className }: StatProps) {
  return (
    <div className={cn("stat", `stat-${tone}`, className)}>
      <div className="stat-top">
        <span className="stat-ic" aria-hidden="true">{icon}</span>
        {trend}
      </div>
      <div className="stat-val">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
