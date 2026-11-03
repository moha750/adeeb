import type { RoomMeta } from "./meta";

/**
 * غرفةُ شريط الإعلانات — البابُ الأوّل في «اللوحة الإعلانية»، فمسارُها بندُ الخريطة نفسُه (الجذرُ يحوّل إليها). `viewKey` مفتاحُ
 * `usePersistentView` القديم نفسُه. مرتّبةٌ يدويًّا فقائمةٌ وحدها، ولا أعمدةَ غيرُ الكعب (الحالُ شارة).
 */
export const TICKER_ROOM: RoomMeta = { title: "شريط الإعلانات", navPath: "/dashboard/website/announcements", viewKey: "announcements-view", cols: 0, stub: true, listOnly: true, what: "الإعلانات" };
