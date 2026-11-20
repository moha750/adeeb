import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMySheets } from "../data";
import { RateView } from "./RateView";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "قيّم القيادات، بوّابة أدِيب" };

/**
 * **قيّم القيادات** — لكلّ عضو (`view_own_membership`)، ولا يظهر في التنقّل إلّا حين تصدق إشارةُ `canRate`
 * (`scope.evaluation`): له أوراقٌ قائمةٌ في دورةٍ مفتوحة. والأوراقُ تُقرأ بالجلسة (`evaluation_my_sheets`
 * تقرأ `auth.uid()` وحده)، والإرسالُ كذلك، فالصفحةُ عرضٌ وبابُ فعل.
 */
export default async function EvaluationRatePage() {
  const denied = await denyUnless("/dashboard/evaluation/rate");
  if (denied) return denied;
  const me = await getCurrentAdmin();
  if (!me) return null;
  const { data, error } = await getMySheets();
  return <RateView sheets={data} error={error} userId={me.id} />;
}
