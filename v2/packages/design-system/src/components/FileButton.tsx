import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface FileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** أيقونةُ القرص المتدرّج (مشبك/ملفّ). */
  icon: ReactNode;
  /** العنوان: اسمُ الملفّ أو «إرفاق ملفّ». */
  label: ReactNode;
  /** سطرٌ صغيرٌ تحته (اختياريّ): «اضغط للتنزيل» · «PDF أو صورة · اختياريّ». */
  hint?: ReactNode;
  /** أيقونةُ الفعل في الطرف (تنزيل/إضافة). */
  trailing?: ReactNode;
  /** يملأ عرض حاويته. */
  block?: boolean;
}

/**
 * زرُّ المرفق — **هويّةٌ خاصّةٌ بالمرفقات لا شبحٌ بحدّ**: قرصٌ مصمَتٌ بتدرّج الهوية يحمل الأيقونة،
 * وجسمٌ بحدٍّ **متقطّع** بتينت العلامة، وعنوانٌ (يُقصَّر إن طال) وتلميحٌ، وأيقونةُ فعلٍ في الطرف.
 * يُستعمل لعرض ملفٍّ (تنزيلًا) أو لإرفاق ملفّ. الأنماط `.afile-*` في components.css.
 */
export function FileButton({ icon, label, hint, trailing, block, className, ...props }: FileButtonProps) {
  return (
    <button type="button" className={cn("afile", block && "afile-block", className)} {...props}>
      <span className="afile-ic" aria-hidden>{icon}</span>
      <span className="afile-body">
        <span className="afile-label">{label}</span>
        {hint ? <span className="afile-hint">{hint}</span> : null}
      </span>
      {trailing ? <span className="afile-go" aria-hidden>{trailing}</span> : null}
    </button>
  );
}
