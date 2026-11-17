import type { RoomMeta } from "./meta";

/**
 * هويّةُ غرفة طلبات الخروج — يقرؤها الغرفةُ وحالتا تحميلها وخطئها (`dashboard/members/exits/`).
 * ولم يكن للغرفة القديمة مفتاحُ عرض (كروتٌ وحدها)، فالمفتاحُ على قاعدة إخوتها. والكعبُ يومُ الطلب كأختيه (التواصل والإنذارات)، ولا أعمدة.
 */
export const EXITS_ROOM: RoomMeta = { title: "طلبات الخروج", navPath: "/dashboard/members/exits", viewKey: "exits-view", cols: 0, stub: true, what: "الطلبات" };
