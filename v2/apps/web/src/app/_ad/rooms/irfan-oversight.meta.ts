import type { RoomMeta } from "./meta";

/**
 * غرفةُ إشراف عِرفان على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). لم يكن للغرفة القديمة مفتاحُ عرض (كروتٌ وحدها باختيار المالك
 * في المختبر ٢٠٢٦-١٠-١٧)، فالمفتاحُ جديدٌ على نمط إخوتها، والعرضُ الأوّل كروت. وعمودا الجدول: العنوان والتصميم — والكعبُ
 * يومُ الرسالة على صورة معاينتها.
 */
export const IRFAN_OVERSIGHT_ROOM: RoomMeta = {
  title: "إشراف عِرفان", navPath: "/dashboard/irfan/oversight", viewKey: "irfan-oversight-view", cols: 2, textCols: 2, stub: true, what: "رسائل عِرفان",
};
