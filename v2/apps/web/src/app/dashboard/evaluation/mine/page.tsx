import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyComments, getMyResults } from "../data";
import { MineView } from "./MineView";

/**
 * **نتيجتي** — للمقيَّم وحده (أحكامٌ عامّة: «يتسلّم كلُّ مقيَّمٍ نتيجتَه وحده»)، ولا يظهر في التنقّل إلّا حين
 * تصدق إشارةُ `hasResults`. النتائجُ وإجاباتُ السؤال المفتوح تُقرأ بالجلسة (`auth.uid()`)، بلا أسماء.
 */
export default async function EvaluationMinePage() {
  const denied = await denyUnless("/dashboard/evaluation/mine");
  if (denied) return denied;
  const me = await getCurrentAdmin();
  if (!me) return null;
  const { data, error } = await getMyResults();
  const said = await Promise.all(data.map(async (r) => [r.target_id, (await getMyComments(r.target_id)).data] as const));
  return <MineView results={data} comments={Object.fromEntries(said)} gender={me.gender} error={error} />;
}
