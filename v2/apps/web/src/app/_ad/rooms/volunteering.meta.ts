import type { RoomMeta } from "./meta";

/**
 * هويّةُ غرفة الفرص التطوّعيّة — يقرؤها الغرفةُ وحالتا تحميلها وخطئها (`dashboard/volunteering/(room)/`).
 * ولم يكن للغرفة القديمة مفتاحُ عرضٍ (`usePersistentView`): كانت كروتًا وحدها، فالمفتاحُ على قاعدة إخوتها (`<الغرفة>-view`).
 * وأعمدةُ الجدول محطّاتُ الفرصة الأربع (الطلبات، القبول، الحضور، الشهادات)، والكعبُ موعدُها.
 */
export const VOLUNTEERING_ROOM: RoomMeta = {
  title: "الفرص التطوّعيّة", navPath: "/dashboard/volunteering", viewKey: "volunteering-view", cols: 4, textCols: 3, stub: true, what: "الفرص التطوّعيّة",
};
