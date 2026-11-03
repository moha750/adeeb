import type { RoomMeta } from "./meta";

/**
 * غرفةُ أعياد الميلاد على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). لم يكن للغرفة القديمة مفتاحُ عرض (جدولٌ وحده)، فالمفتاحُ جديدٌ
 * على نمط إخوتها، والعرضُ الأوّل جدول. وعمودُ الجدول الواحد: «يُتمّ» (والعدُّ التنازليّ والمولدُ سطران تحت الاسم) — والكعبُ
 * عيدُ الميلاد القادم.
 */
export const BIRTHDAYS_ROOM: RoomMeta = {
  title: "أعياد الميلاد", navPath: "/dashboard/members/birthdays", viewKey: "birthdays-view", cols: 1, stub: true, listOnly: true, what: "المواليد",
};
