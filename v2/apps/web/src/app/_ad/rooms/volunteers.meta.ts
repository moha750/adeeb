import type { RoomMeta } from "./meta";

/**
 * هويّةُ غرفة سجلّ المتطوّعين — يقرؤها الغرفةُ وحالتا تحميلها وخطئها (`dashboard/volunteering/volunteers/`).
 * ولم يكن للغرفة القديمة مفتاحُ عرضٍ (`usePersistentView`): كانت كروتًا وحدها، فالمفتاحُ على قاعدة إخوتها (`<الغرفة>-view`).
 * وأعمدةُ الجدول أرقامُ كرت الشخص الثلاثة (بدايةُ التطوّع، والمشاركات، والشهادات)، والكعبُ وجهُ المتطوّع.
 */
export const VOLUNTEERS_ROOM: RoomMeta = {
  title: "سجلّ المتطوّعين", navPath: "/dashboard/volunteering/volunteers", viewKey: "volunteers-view", cols: 3, stub: true, what: "المتطوّعين",
};
