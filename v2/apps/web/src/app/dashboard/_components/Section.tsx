import { ModalSectionHeading } from "@adeeb/design-system";

/**
 * قسمٌ في عرض الملفّ (ق٨): فاصلٌ خفيف (أيقونة هوية + عنوان) ثمّ شبكة خلاياه.
 * و`end` = نغمة الخطر — القسم الذي يقول إنهاء العضويّة.
 *
 * **مصدرٌ واحد** يخدم نافذة الملفّ (تبويب الأعضاء) وصفحة «عضويتي» معًا — رُقّي إلى هنا من
 * `MembersView` كما رُقّيت `Cell` قبله، كي لا يصير للسؤال الواحد جوابان. أنماطه `.pva-sec`
 * بالمكتبة، والعنوان مكوّن `ModalSectionHeading` الذي يملك نغمته بنفسه.
 */
export function Section({ icon, title, end, children }: { icon: React.ReactNode; title: string; end?: boolean; children: React.ReactNode }) {
  return (
    <section className={"pva-sec" + (end ? " pva-sec--end" : "")}>
      <ModalSectionHeading icon={icon} title={title} tone={end ? "danger" : "default"} />
      <div className="pva-grid">{children}</div>
    </section>
  );
}
