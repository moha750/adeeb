import type { RoomMeta } from "./meta";

/**
 * غرفةُ الإنذارات على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). لم يكن للغرفة القديمة مفتاحُ عرض (جدولٌ وحده)، فالمفتاحُ جديدٌ
 * على نمط إخوتها، والعرضُ الأوّل جدول. وعمودُ الجدول الواحد: التصنيف (والمنصبُ والسببُ والمُصدِرُ سطورٌ تحت الاسم) — والكعبُ
 * تاريخُ الإصدار.
 */
export const WARNINGS_ROOM: RoomMeta = {
  title: "الإنذارات", navPath: "/dashboard/members/warnings", viewKey: "warnings-view", cols: 0, stub: true, defaultView: "table", listOnly: true, what: "الإنذارات",
};
