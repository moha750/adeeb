"use client";

import { useState } from "react";
import { Copy } from "@phosphor-icons/react";
import { ArrowSquareOut } from "@/app/_components/glyphs";
import { useToast } from "./ToastProvider";

/**
 * خليّة العرض (القاعدة ٨) — تسميةٌ بأيقونتها ثمّ القيمة، والرُّكن يُعلن طبيعتها:
 * ساكنةٌ تُنسخ → «نسخ» · قيمةٌ رابطٌ أصلًا → «فتح خارجيّ» · وما لا يُفعَل به (تاريخ · اسم) → `noCopy`
 * فرُكنه خالٍ (زرٌّ لا يضغطه أحد ضجيجٌ لا خدمة). والخالية تقول «غير متوفّر».
 *
 * **مصدرٌ واحد** يخدم عرضَ الملفّ (تبويب الأعضاء) وجسمَ كرت الاستبيان معًا — رُقّي إلى هنا من
 * `MembersView` كي لا يصير «مكوّنان بجواب واحد» (ق٨). أنماطه `.pva-*` بالمكتبة، لا تنسيقَ شاردًا.
 *
 * القيمة اللاتينيّة (`lat`) تُعزَل في <bdi dir="ltr"> — والعزل ضرورة لا زينة: `@` محرفٌ **محايد**،
 * فإن تصدّر النصّ في فقرة عربيّة أخذ اتّجاهها وانتقل يمينًا، فيُقرأ `mohammad_1@`. والعزل وحده لا
 * المحاذاة: <bdi> يلفّ القيمة inline فتبقى الخليّة RTL محاذيةً يمينًا كما هي.
 */
export function Cell({ label, value, icon, lat, full, href, noCopy }: { label: string; value: string | null; icon: React.ReactNode; lat?: boolean; full?: boolean; href?: string; noCopy?: boolean }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  const empty = value == null || value === "";
  const copy = async () => {
    if (empty || !value) return;
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1400);
      toast.success(`نُسِخ: ${label}`);
    } catch { toast.error("تعذّر النسخ"); }
  };
  return (
    <div className={"pva-cell" + (full ? " full" : "")}>
      <div className="pva-lbl"><span className="pva-lic">{icon}</span>{label}</div>
      {empty ? (
        <div className="pva-val na">غير متوفّر</div>
      ) : href ? (
        <a className={"pva-val" + (lat ? " lat" : "")} href={href} target="_blank" rel="noreferrer">{lat ? <bdi dir="ltr">{value}</bdi> : value}</a>
      ) : (
        <div className={"pva-val" + (lat ? " lat" : "")}>{lat ? <bdi dir="ltr">{value}</bdi> : value}</div>
      )}
      {empty || noCopy ? null : href ? (
        // القيمة رابطٌ، فرُكن الخليّة يقول ذلك: أيقونة «فتح خارجيّ» تُعلن أنّ الضغط يُحوّل للمنصّة.
        // وهي رابطٌ لا زينة — هدفٌ ثانٍ أوسع للنقر، وتسميتها تصف الوجهة فلا تكرّر «رابط» على قارئ الشاشة.
        <a className="pva-open" href={href} target="_blank" rel="noreferrer" aria-label={`فتح ${label}`} title={`فتح ${label}`}>
          <ArrowSquareOut aria-hidden />
        </a>
      ) : (
        <button type="button" className={"pva-copy" + (done ? " done" : "")} onClick={copy} aria-label={`نسخ ${label}`} title="نسخ">
          <span className="ic-copy"><Copy aria-hidden /></span>
          <span className="ic-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12l5 5L20 6" /></svg></span>
        </button>
      )}
    </div>
  );
}
