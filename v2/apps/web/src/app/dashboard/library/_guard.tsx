import { Alert } from "@adeeb/design-system";

/**
 * تنبيه «لا صلاحية» لصفحات المكتبة — يُعرض لمن لا يملك قدرة `manage_library`
 * (ولو كان من الإدارة العليا: الرتبة لا تعني الوصول، القدرة وحدها تعنيه).
 */
export function LibraryDenied() {
  return (
    <>
      <div className="ash-phead">
        <div>
          <div className="ash-crumb">أديب › المحتوى › <b>المكتبة</b></div>
          <h1>المكتبة</h1>
        </div>
      </div>
      <Alert tone="warning" title="لا تملك صلاحية إدارة المكتبة">
        هذه الصفحة لمن مُنحت له قدرة «إدارة المكتبة». إن رأيت أنّها ينبغي أن تكون لك، فراجع مسؤول الصلاحيات.
      </Alert>
    </>
  );
}
