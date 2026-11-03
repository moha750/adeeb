import type { RoomMeta } from "./meta";

/**
 * غرفةُ الانتخابات على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). `viewKey` مفتاحُ `usePersistentView` القديم نفسُه
 * (`elections-view`)، والأصلُ كروتٌ كما كان. والأعمدةُ: المرشّحون والأصوات (رقمان) — والكعبُ تاريخُ الإنشاء.
 */
export const ELECTIONS_ROOM: RoomMeta = {
  title: "الانتخابات", navPath: "/dashboard/elections", viewKey: "elections-view", cols: 2, stub: true, what: "الانتخابات",
};
