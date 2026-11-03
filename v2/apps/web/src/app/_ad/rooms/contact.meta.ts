import type { RoomMeta } from "./meta";

/**
 * هويّةُ غرفة رسائل التواصل — يقرؤها الغرفةُ وحالتا تحميلها وخطئها (`dashboard/contact/`).
 * ولم يكن للغرفة القديمة مفتاحُ عرضٍ (`usePersistentView`): كانت جدولًا وحده، فالمفتاحُ على قاعدة إخوتها (`<الغرفة>-view`).
 * وعمودُ الجدول الواحد: البريد؛ والكعبُ تاريخُ الرسالة.
 */
export const CONTACT_ROOM: RoomMeta = { title: "رسائل التواصل", navPath: "/dashboard/contact", viewKey: "contact-view", cols: 1, textCols: 1, stub: true, defaultView: "table", what: "الرسائل" };
