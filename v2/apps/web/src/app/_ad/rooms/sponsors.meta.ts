import type { RoomMeta } from "./meta";

/** غرفةُ الرعاة والشركاء — `viewKey` مفتاحُ `usePersistentView` القديم نفسُه، فيبقى اختيارُ العضو بين الكروت والجدول. */
export const SPONSORS_ROOM: RoomMeta = { title: "الرعاة والشركاء", navPath: "/dashboard/website/sponsors", viewKey: "sponsors-view", cols: 1, textCols: 1, stub: true, flat: true, listOnly: true, what: "الرعاة" };
