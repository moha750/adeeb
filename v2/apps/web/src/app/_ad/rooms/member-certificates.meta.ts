import type { RoomMeta } from "./meta";

/**
 * غرفةُ شهادات الخبرة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١). لم يكن للغرفة القديمة مفتاحُ عرض (جدولٌ وحده)، فالمفتاحُ
 * جديدٌ على نمط إخوتها. والأعمدةُ: الرقمُ المرجعيّ، والفترة (والمُصدِرُ سطرٌ تحت المسمّى) — والكعبُ تاريخُ الإصدار.
 */
export const MEMBER_CERTIFICATES_ROOM: RoomMeta = {
  title: "شهادات الخبرة", navPath: "/dashboard/members/certificates", viewKey: "certificates-view", cols: 2, textCols: 2, stub: true, defaultView: "table", what: "شهادات الخبرة",
};
