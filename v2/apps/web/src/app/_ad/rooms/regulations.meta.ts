import type { RoomMeta } from "./meta";

/**
 * غرفةُ تحرير الأنظمة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). لم يكن للغرفة القديمة مفتاحُ عرض (كروتٌ وحدها)، فالمفتاحُ جديدٌ
 * على نمط إخوتها والعرضُ الأوّل كروت. ولا مواضعَ (`flat`): الوثائقُ السبع قائمةٌ واحدة. ولا أعمدةَ في الجدول غيرُ الكعب
 * (رقمُ الإصدار): حالُ الإصدار سطرٌ تحت اسم الوثيقة، والمسودّةُ شارة.
 */
export const REGULATIONS_ROOM: RoomMeta = {
  title: "أنظمة أدِيب", navPath: "/dashboard/regulations", viewKey: "regulations-view", cols: 0, stub: true, flat: true, what: "الأنظمة",
};
