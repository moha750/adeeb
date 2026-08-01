import { Alert } from "@adeeb/design-system";

/**
 * تنبيه «لا صلاحية» لصفحات محتوى الموقع — يُعرض لمن لا يملك قدرة **هذا المجلّد وحده**
 * (ولو ملك بقيّة مجلّدات المحتوى، ولو كان من الإدارة العليا: الرتبة لا تعني الوصول).
 * `section` اسم القسم في فتات الخبز والعنوان (الأعمال، الإحصاءات، الرعاة، الأسئلة الشائعة).
 */
export function WebsiteDenied({ section }: { section: string }) {
  return (
    <>
      <div className="ash-phead">
        <div>
          <div className="ash-crumb">أديب › المحتوى › الصفحة الرئيسية › <b>{section}</b></div>
          <h1>{section}</h1>
        </div>
      </div>
      <Alert tone="warning" title={`لا تملك صلاحية إدارة «${section}»`}>
        هذه الصفحة لمن مُنحت له قدرة إدارة «{section}» وحدها. إن رأيت أنّها ينبغي أن تكون لك، فراجع مسؤول الصلاحيات.
      </Alert>
    </>
  );
}
