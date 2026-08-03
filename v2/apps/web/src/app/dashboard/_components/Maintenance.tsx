import { Alert } from "@adeeb/design-system";
import { Breadcrumb } from "../_shell/Breadcrumb";

/**
 * حالة «التبويب تحت الصيانة» — تُعرَض **مكان** محتوى التبويب فتحجبه (لا شيء خلفها)، وبلا إغلاق.
 * مصدرٌ واحد يخدم كلّ تبويب مُعطَّل مؤقّتًا: عنوانُه (`title`) وحده — والمسار يقوله
 * {@link Breadcrumb} من الخريطة (كان يُمرَّر سلسلةً مكتوبة، فيكذب حين تتبدّل الخريطة).
 * مبنيّةٌ من مكوّن المكتبة {@link Alert} وحده — بلا تنسيق شارد (القاعدة ١). و`Alert` بلا `onClose`
 * لا يعرض زرّ إغلاق، فالإشعار غير قابل للإغلاق كما طُلب.
 */
export function Maintenance({ title }: { title: string }) {
  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>{title}</h1>
        </div>
      </div>
      <Alert tone="warning" title="التبويب تحت الصيانة">
        نعمل على تجهيز هذا التبويب، وسيعود قريبًا بإذن الله.
      </Alert>
    </>
  );
}
