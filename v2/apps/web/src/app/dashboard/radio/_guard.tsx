import { Alert } from "@adeeb/design-system";
import { PageHeader } from "../_components/PageHeader";

/**
 * تنبيه «لا صلاحية» لصفحات الإذاعة — يُعرض لمن لا يملك قدرة `manage_radio`
 * (ولو كان من الإدارة العليا: الرتبة لا تعني الوصول، القدرة وحدها تعنيه).
 */
export function RadioDenied() {
  return (
    <>
      <PageHeader title="إذاعة أدِيب" />
      <Alert tone="warning" title="لا تملك صلاحية إدارة الإذاعة">
        هذه الصفحة لمن مُنحت له قدرة «إدارة الإذاعة». إن رأيت أنّها ينبغي أن تكون لك، فراجع مسؤول الصلاحيات.
      </Alert>
    </>
  );
}
