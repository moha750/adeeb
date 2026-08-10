import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getTasks } from "./data";
import { TasksView } from "./TasksView";

/**
 * **المهامّ** — دفترُ ما يُكلَّف به الأعضاء.
 *
 * قفلُ الباب `view_own_membership` (في `lib/capabilities.ts`): كلُّ من له منصبٌ قائم يدخل
 * فيرى ما كُلِّف به. **وسلطةُ الإسناد والتأشير ليست قفلًا** — تقولها القاعدة بـ
 * `can_manage_tasks_of` (القدرة `manage_tasks` + موقعُه من الوحدة)، فالشاشةُ تُخفي ما لا
 * يُستطاع، والقاعدةُ تردّه إن حاوله.
 */
export const metadata = { title: "المهامّ، بوّابة أديب" };

export default async function TasksPage() {
  const denied = await denyUnless("/dashboard/tasks");
  if (denied) return denied;

  const data = await getTasks();
  return <TasksView data={data} />;
}
