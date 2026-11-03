import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getTasks } from "./data";
import { TasksRoom } from "@/app/_ad/rooms/TasksRoom";
import { AdRoomError } from "@/app/_ad/states";
import { TASKS_ROOM } from "@/app/_ad/rooms/tasks.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **المهامّ** — دفترُ ما يُكلَّف به الأعضاء.
 *
 * قفلُ الباب `view_own_membership` (في `lib/capabilities.ts`): كلُّ من له منصبٌ قائم يدخل
 * فيرى ما كُلِّف به. **وسلطةُ الإسناد والتأشير ليست قفلًا** — تقولها القاعدة بـ
 * `can_manage_tasks_of` (القدرة `manage_tasks` + موقعُه من الوحدة)، فالشاشةُ تُخفي ما لا
 * يُستطاع، والقاعدةُ تردّه إن حاوله.
 *
 * على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). ولا مساراتٍ أبناءَ للمجلّد، فحالتا التحميل والخطأ بجانب الصفحة.
 * وخطأُ القراءة (`data.error`) كان تنبيهًا فوق غرفةٍ فارغة (`getTasks` يردّه مع بياناتٍ فارغة)، فصار حالةَ خطأ الغرفة.
 */
export const metadata = roomMetadata(TASKS_ROOM);

export default async function TasksPage() {
  const denied = await denyUnless("/dashboard/tasks");
  if (denied) return denied;

  const data = await getTasks();
  if (data.error) return <AdRoomError {...TASKS_ROOM} message={data.error} />;

  return <TasksRoom data={data} serverNow={await requestNow()} view={await roomView(TASKS_ROOM.viewKey, TASKS_ROOM.defaultView)} />;
}
