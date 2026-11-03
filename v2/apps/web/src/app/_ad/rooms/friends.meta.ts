import type { RoomMeta } from "./meta";

/**
 * هويّةُ غرفة أصدقاء أدِيب — يقرؤها الغرفةُ وحالتا تحميلها وخطئها (`dashboard/friends/`).
 * ومفتاحُ العرض مفتاحُ `usePersistentView` القديم نفسُه (`friends-view`)، فيُنقل اختيارُ العضو بين الكروت والجدول.
 * وبلا مواضع (لم تكن للغرفة القديمة تبويبات)، وعمودُ الجدول الواحد رقمُ كرت الشخص «في أدِيب منذ»، والكعبُ وجهُ الصديق.
 */
export const FRIENDS_ROOM: RoomMeta = {
  title: "أصدقاء أدِيب", navPath: "/dashboard/friends", viewKey: "friends-view", cols: 1, stub: true, what: "الأصدقاء",
};
