import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface ModalSectionHeadingProps {
  /** أيقونة هويّة في مربّع Aurora — **إلزاميّة** (لا عنوان قسم بلا أيقونة، كنظام الحقل المعتمَد). */
  icon: ReactNode;
  /** عنوان القسم. */
  title: string;
  /** نغمة القسم — الخطر للأقسام الهدّامة (إنهاء العضويّة). */
  tone?: "default" | "danger";
  className?: string;
}

/**
 * عنوان قسم داخل نافذة — فاصل خفيف: أيقونة هويّة بخلفية Aurora + عنوان كحليّ + خطّ يتلاشى.
 * يفصل مجموعات الخلايا في عرض الملفّ ومجموعات الحقول في نماذج النوافذ — مصدر واحد للموضعين.
 * داخل شبكة نموذج (`.mdl-grid`) مرّره `className="mdl-full"` ليمتدّ على الصفّ كاملًا.
 *
 * ليس `SectionHeading` — ذاك عنوان أقسام صفحات التسويق (خطّ العرض الدرامي + باترن العلامة).
 */
export function ModalSectionHeading({ icon, title, tone = "default", className }: ModalSectionHeadingProps) {
  return (
    <div className={cn("msh", tone === "danger" && "msh--danger", className)}>
      <span className="msh-ic" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
    </div>
  );
}
