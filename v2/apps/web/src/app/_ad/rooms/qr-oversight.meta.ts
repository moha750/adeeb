import type { RoomMeta } from "./meta";

/**
 * إشرافُ الباركود على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). لم يكن للغرفة القديمة مفتاحُ عرض (جدولٌ وحده)، فالمفتاحُ جديدٌ على
 * نمط إخوتها وتبدأ جدولًا. والأعمدةُ: صاحبُه ووجهتُه (نصّيّان) والمسحات — والكعبُ تاريخُ الإنشاء.
 */
export const QR_OVERSIGHT_ROOM: RoomMeta = {
  title: "إشراف الباركود", navPath: "/dashboard/tools/qr/oversight", viewKey: "qr-oversight-view", cols: 3, textCols: 2, stub: true, defaultView: "table", what: "الباركودات",
};
