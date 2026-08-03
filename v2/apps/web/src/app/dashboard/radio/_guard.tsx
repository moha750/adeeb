import { Alert } from "@adeeb/design-system";
import { Breadcrumb } from "../_shell/Breadcrumb";

/**
 * تنبيه «لا صلاحية» لصفحات الإذاعة — يُعرض لمن لا يملك قدرة `manage_radio`
 * (ولو كان من الإدارة العليا: الرتبة لا تعني الوصول، القدرة وحدها تعنيه).
 */
export function RadioDenied() {
  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>إذاعة أدِيب</h1>
        </div>
      </div>
      <Alert tone="warning" title="لا تملك صلاحية إدارة الإذاعة">
        هذه الصفحة لمن مُنحت له قدرة «إدارة الإذاعة». إن رأيت أنّها ينبغي أن تكون لك، فراجع مسؤول الصلاحيات.
      </Alert>
    </>
  );
}
