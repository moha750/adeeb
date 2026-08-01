import { Alert } from "@adeeb/design-system";

/**
 * حالة «التبويب تحت الصيانة» — تُعرَض **مكان** محتوى التبويب فتحجبه (لا شيء خلفها)، وبلا إغلاق.
 * مصدرٌ واحد يخدم كلّ تبويب مُعطَّل مؤقّتًا: يمرّر مساره (`crumb`) وعنوانه (`title`).
 * مبنيّةٌ من مكوّن المكتبة {@link Alert} وحده — بلا تنسيق شارد (القاعدة ١). و`Alert` بلا `onClose`
 * لا يعرض زرّ إغلاق، فالإشعار غير قابل للإغلاق كما طُلب.
 */
export function Maintenance({ crumb, title }: { crumb: React.ReactNode; title: string }) {
  return (
    <>
      <div className="ash-phead">
        <div>
          <div className="ash-crumb">{crumb}</div>
          <h1>{title}</h1>
        </div>
      </div>
      <Alert tone="warning" title="التبويب تحت الصيانة">
        نعمل على تجهيز هذا التبويب، وسيعود قريبًا بإذن الله.
      </Alert>
    </>
  );
}
