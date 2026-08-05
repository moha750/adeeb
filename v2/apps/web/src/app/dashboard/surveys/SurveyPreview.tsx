"use client";

import { useEffect } from "react";
import { Button } from "@adeeb/design-system";
import { Eye } from "@/app/_components/glyphs";
import { X } from "@/app/_components/glyphs";
import { SurveyRespond, type PublicSurvey, type PublicQuestion } from "@/app/surveys/[id]/SurveyRespond";

/**
 * طبقةُ معاينةٍ ملء الشاشة تُعيد استعمال **صفحة الاستبيان الحقيقيّة** (`SurveyRespond`) في وضع `preview`
 * — لا راسمَ معاينةٍ مستقلًّا يوم يُضاف نوع سؤالٍ لأحدهما دون الآخر. تُغذّى من حالة البنّاء الحيّة بلا حفظ.
 * الأسطح والحدّ والنصّ من رموز الهوية عبر أدوات Tailwind (bg-bg · bg-surface · border-line · text-content-muted).
 */
export function SurveyPreview({ survey, questions, onClose }: { survey: PublicSurvey; questions: PublicQuestion[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg" role="dialog" aria-modal="true" aria-label="معاينة الاستبيان">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-content-muted">
          <Eye aria-hidden /> معاينة — لن تُرسَل الإجابات
        </span>
        <Button variant="ghost" size="sm" onClick={onClose}><X aria-hidden /> إغلاق المعاينة</Button>
      </div>
      <SurveyRespond preview survey={survey} questions={questions} />
    </div>
  );
}
