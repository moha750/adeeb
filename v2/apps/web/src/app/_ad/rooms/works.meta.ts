import type { RoomMeta } from "./meta";

/** غرفةُ معرض الأعمال — `viewKey` مفتاحُ `usePersistentView` القديم نفسُه، فيبقى اختيارُ العضو بين الكروت والجدول. */
export const WORKS_ROOM: RoomMeta = { title: "معرض الأعمال", navPath: "/dashboard/website/works", viewKey: "works-view", cols: 1, textCols: 1, stub: true, flat: true, listOnly: true, what: "الأعمال" };
