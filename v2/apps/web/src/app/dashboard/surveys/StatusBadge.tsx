import { Badge } from "@adeeb/design-system";
import { STATUS_META } from "./vocab";
import type { SurveyRow } from "./data";

/**
 * شارة حالة الاستبيان — مصدر واحد للجدول والكرت.
 * **العَلَمان أوّلًا:** المحذوف/المؤرشف يُقالان بذاتهما (بنغمة الكرت نفسها) لا بحالتهما المجمّدة —
 * وإلّا ظهرت نبضةٌ حيّة «نشط» على كرتٍ مُزال، أو رصاصيٌّ «منتهٍ» على كرتٍ أحمر محذوف.
 * ثمّ «مجدول»/«انتهت مدّته» المحسوبتان فوق الحالة المخزّنة (نشط + نافذة زمنيّة).
 */
export function StatusBadge({ survey }: { survey: SurveyRow }) {
  if (survey.deleted) return <Badge tone="danger" variant="soft">محذوف</Badge>;
  if (survey.archived) return <Badge tone="neutral" variant="soft">مؤرشف</Badge>;
  if (survey.scheduled) return <Badge tone="info" variant="soft">مجدول</Badge>;
  if (survey.expired) return <Badge tone="neutral" variant="soft">انتهت مدّته</Badge>;
  const meta = STATUS_META[survey.status];
  return <Badge tone={meta.tone} variant="soft" dot live={survey.status === "active"}>{meta.label}</Badge>;
}
