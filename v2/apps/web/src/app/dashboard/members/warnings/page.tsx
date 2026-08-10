import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getWarnings } from "./data";
import { WarningsView } from "./WarningsView";
import { Breadcrumb } from "../../_shell/Breadcrumb";

/**
 * **الإنذارات** — سجلّ إدارة الموارد البشريّة، يطّلع عليه رئيس النادي والرئيس التنفيذي.
 *
 * قفلُ الباب `view_warnings` (في `lib/capabilities.ts`)، والفعلُ داخله قدرةٌ أخرى
 * (`manage_warnings`) — بابٌ واحد، والفرقُ بين مُصدِرٍ ومطّلعٍ **داخل** الغرفة لا عندها.
 * وترشيحُ الصفوف في القاعدة (`warnings_for_reader`) لا هنا: مفتاح الخدمة يتجاوز RLS.
 */
export const metadata = { title: "الإنذارات، بوّابة أديب" };

export default async function WarningsPage() {
  const denied = await denyUnless("/dashboard/members/warnings");
  if (denied) return denied;

  const data = await getWarnings();

  if (data.error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb />
            <h1>الإنذارات</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب سجلّ الإنذارات">{data.error}</Alert>
      </>
    );
  }

  return <WarningsView data={data} />;
}
