import type { RoomMeta } from "./meta";

/**
 * سجلُّ البريد على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢): كروتٌ أو جدولٌ بكعب اليوم، كرسائل التواصل — الرسالةُ سجلٌّ يُفتح لا
 * واقعةٌ تُقرأ في سطرها. ولم يكن للقديمة مفتاحُ عرض (كروتٌ وحدها)، فالمفتاحُ على قاعدة إخوتها والعرضُ الأوّل كروت.
 */
export const EMAIL_LOG_ROOM: RoomMeta = {
  title: "سجلّ البريد", navPath: "/dashboard/system/email", viewKey: "email-log-view", cols: 0, stub: true, what: "رسائل البريد",
};
