import type { RoomMeta } from "./meta";

/** غرفةُ الأسئلة الشائعة — `viewKey` مفتاحُ `usePersistentView` القديم نفسُه، فيبقى اختيارُ العضو بين الكروت والجدول. */
export const FAQ_ROOM: RoomMeta = { title: "الأسئلة الشائعة", navPath: "/dashboard/website/faq", viewKey: "faq-view", cols: 0, stub: true, flat: true, listOnly: true, what: "الأسئلة" };
