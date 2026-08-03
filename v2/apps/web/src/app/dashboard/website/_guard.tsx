import { Alert } from "@adeeb/design-system";
import { Breadcrumb } from "../_shell/Breadcrumb";

/**
 * تنبيه «لا صلاحية» لصفحات محتوى الموقع — يُعرض لمن لا يملك قدرة **هذا المجلّد وحده**
 * (ولو ملك بقيّة مجلّدات المحتوى، ولو كان من الإدارة العليا: الرتبة لا تعني الوصول).
 * `section` اسم القسم في العنوان والرسالة (الأعمال، الإحصاءات، الرعاة، الأسئلة الشائعة) —
 * أمّا المسار فمن الخريطة: الشاشةُ تُعرَض على المجلّد وعلى `new` و`edit` تحته، ولو مُرِّر
 * الاسمُ ورقةً لتكرّر مقطعًا واحدًا مرّتين في العميقَين.
 */
export function WebsiteDenied({ section }: { section: string }) {
  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>{section}</h1>
        </div>
      </div>
      <Alert tone="warning" title={`لا تملك صلاحية إدارة «${section}»`}>
        هذه الصفحة لمن مُنحت له قدرة إدارة «{section}» وحدها. إن رأيت أنّها ينبغي أن تكون لك، فراجع مسؤول الصلاحيات.
      </Alert>
    </>
  );
}
