import {
  Buildings, IdentificationBadge, UsersThree, SealCheck, Tag,
  CalendarBlank, Bank, LockSimple,
} from "@phosphor-icons/react";
import { FunnelSimple } from "@/app/_components/glyphs";

/**
 * **رمزُ كلّ بُعدٍ من أبعاد التصفية — مصدرٌ واحد.**
 *
 * هيئةُ المرشِّح المعتمَدة تحمل رمزًا في صدرها يُعرَف به البُعدُ قبل أن يُقرأ اسمُه
 * (قرار المالك ٢٠٢٦-٠٨-١٤). والرمزُ يُشتقّ من **مفتاح** المرشِّح لا يُمرَّر من كلّ شاشة:
 * فالمفتاحُ واحدٌ في كلّ اللوحة (`status` ستَّ مرّات، `dept` مرّتين…)، ولو تُرك لكلّ
 * شاشةٍ لاختلف رمزُ «الحالة» بين شاشتين وهو معنًى واحد.
 *
 * والمفاتيحُ أدناه هي المستعملةُ فعلًا (عُدَّت من الشاشات)، وما لم يُعرَف فله قِمعٌ
 * محايدٌ — فلا تنكسر الهيئةُ بمرشِّحٍ جديدٍ لم يُسجَّل هنا بعدُ.
 */
const ICONS: Record<string, React.ReactNode> = {
  status: <SealCheck />,   // الحالة
  dept: <Buildings />,           // القسم
  role: <IdentificationBadge />, // الدور · المنصب
  committee: <UsersThree />,     // اللجنة
  council: <Bank />,             // المجلس
  organizer: <Buildings />,      // الجهة المنظِّمة
  type: <Tag />,                 // النوع
  kind: <Tag />,                 // النوع
  category: <Tag />,             // التصنيف · القسم
  access: <LockSimple />,        // الوصول
  date: <CalendarBlank />,
};

export function filterIcon(key: string): React.ReactNode {
  return ICONS[key] ?? <FunnelSimple />;
}
