import { Alert } from "@adeeb/design-system";
import { PageHeader } from "../_components/PageHeader";

/**
 * تنبيه «لا صلاحية» لصفحات الفعاليّات — يُعرض لمن لا يملك قدرة `manage_activities`
 * (ولو كان من الإدارة العليا: الرتبة لا تعني الوصول، القدرة وحدها تعنيه).
 */
export function EventsDenied() {
  return (
    <>
      <PageHeader title="الفعاليّات" />
      <Alert tone="warning" title="لا تملك صلاحية إدارة الفعاليّات">
        هذه الصفحة لمن مُنحت له قدرة «إدارة الفعاليّات». إن رأيت أنّها ينبغي أن تكون لك، فراجع مسؤول الصلاحيات.
      </Alert>
    </>
  );
}
