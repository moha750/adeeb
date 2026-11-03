import type { RoomMeta } from "./meta";

/**
 * غرفةُ الإحصاءات («ملخص المسيرة») — `viewKey` مفتاحُ `usePersistentView` القديم نفسُه. وهي مرتّبةٌ يدويًّا فقائمةٌ وحدها
 * (`listOnly`)، وعمودُها الواحدُ الرقم.
 */
export const ACHIEVEMENTS_ROOM: RoomMeta = { title: "ملخص المسيرة", navPath: "/dashboard/website/achievements", viewKey: "achievements-view", cols: 1, stub: true, flat: true, listOnly: true, what: "الإحصاءات" };
