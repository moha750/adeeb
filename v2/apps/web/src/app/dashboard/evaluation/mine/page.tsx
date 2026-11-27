import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyComments, getMyResults, getMyStands } from "../data";
import { MineView } from "./MineView";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "نتيجتي، بوّابة أدِيب" };

/**
 * **نتيجتي** — للمقيَّم وحده (أحكامٌ عامّة: «يتسلّم كلُّ مقيَّمٍ نتيجتَه وحده»)، ولا يظهر في التنقّل إلّا حين
 * تصدق إشارةُ `hasResults`. النتائجُ والبنودُ وإجاباتُ السؤال المفتوح تُقرأ كلُّها بالجلسة (`auth.uid()`)، بلا أسماء.
 * وشكلُها «ز» وحده (اعتمده محمد ٢٠٢٦-١١-٢٧).
 */
export default async function EvaluationMinePage() {
  const denied = await denyUnless("/dashboard/evaluation/mine");
  if (denied) return denied;
  const me = await getCurrentAdmin();
  if (!me) return null;
  const { data, error } = await getMyResults();
  const said = Object.fromEntries(await Promise.all(data.map(async (r) => [r.target_id, (await getMyComments(r.target_id)).data] as const)));
  const stands = await getMyStands(data.map((r) => r.target_id));
  return <MineView results={data} comments={said} gender={me.gender} error={error} stands={stands} />;
}
