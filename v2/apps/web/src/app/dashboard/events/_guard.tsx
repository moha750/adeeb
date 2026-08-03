import { Alert } from "@adeeb/design-system";
import { Breadcrumb } from "../_shell/Breadcrumb";

/**
 * تنبيه «لا صلاحية» لصفحات الفعاليّات — يُعرض لمن لا يملك قدرة `manage_activities`
 * (ولو كان من الإدارة العليا: الرتبة لا تعني الوصول، القدرة وحدها تعنيه).
 */
export function EventsDenied() {
  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>الفعاليّات</h1>
        </div>
      </div>
      <Alert tone="warning" title="لا تملك صلاحية إدارة الفعاليّات">
        هذه الصفحة لمن مُنحت له قدرة «إدارة الفعاليّات». إن رأيت أنّها ينبغي أن تكون لك، فراجع مسؤول الصلاحيات.
      </Alert>
    </>
  );
}
