import type { RoomMeta } from "./meta";

/**
 * هويّةُ غرفة شهادات المتطوّعين — يقرؤها الغرفةُ وحالتا تحميلها وخطئها (`dashboard/volunteering/certificates/`).
 * لم يكن للقديمة مفتاحُ عرض (كروتٌ وحدها)، فالمفتاحُ على قاعدة إخوتها. وموضعُها الأوّلُ طابورٌ مجمَّعٌ تحت فرصه (قائمةٌ وحدها)،
 * فهيكلُ التحميل جدولٌ بكعب الوجه بلا أعمدة.
 */
export const VOLUNTEER_CERTIFICATES_ROOM: RoomMeta = {
  title: "شهادات المتطوّعين", navPath: "/dashboard/volunteering/certificates", viewKey: "volunteer-certificates-view",
  cols: 0, stub: true, listOnly: true, what: "الشهادات",
};
