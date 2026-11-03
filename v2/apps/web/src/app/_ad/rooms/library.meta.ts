import type { RoomMeta } from "./meta";

/** مكتبةُ «إرثٌ يُروى» على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١). لم يكن للغرفة القديمة مفتاحُ عرض (جدولٌ وحده)، فالمفتاحُ جديدٌ على نمط إخوتها. */
export const LIBRARY_ROOM: RoomMeta = { title: "مكتبة «إرثٌ يُروى»", navPath: "/dashboard/library", viewKey: "library-view", cols: 1, stub: true, defaultView: "table", what: "المنشورات" };
