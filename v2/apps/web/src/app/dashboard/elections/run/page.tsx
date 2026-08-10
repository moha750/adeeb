import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getRunElections } from "../member-data";
import { RunView } from "./RunView";

/**
 * باب «الترشُّح» — لمن يحمل `run_for_election` (روله يؤهّله للترشّح)، ولا يظهر في التنقّل
 * إلّا حين تصدق إشارةُ `canRun` (ثمّة انتخابٌ مفتوحٌ لم يقدّم له بعد). الأهليّةُ الدقيقة
 * والقبول يفرضهما `submit_candidacy` في القاعدة، فهذه الصفحة عرضٌ وبابُ فعل.
 */
export default async function RunPage() {
  const denied = await denyUnless("/dashboard/elections/run");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const { items, error } = await getRunElections(me.id);
  return <RunView items={items} error={error} />;
}
