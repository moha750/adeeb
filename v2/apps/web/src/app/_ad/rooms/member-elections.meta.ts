import type { RoomMeta } from "./meta";

/**
 * هويّاتُ أبواب الانتخاب الثلاثة للعضو (`dashboard/elections/{run,vote,my}/`) — يقرؤها كلُّ بابٍ وحالتا تحميله وخطئه.
 * لم يكن لها مفاتيحُ عرض (كروتٌ وحدها)، فالمفاتيحُ على قاعدة إخوتها. والكعبُ يومُ الموعد (نهايةُ الباب، أو يومُ التقديم)، ولا أعمدة.
 * والترشُّحُ والتصويتُ بلا مواضع (`flat`)، وسجلُّ الترشّح موضعان: القائمُ والمؤرشف.
 */
export const RUN_ROOM: RoomMeta = { title: "الترشُّح", navPath: "/dashboard/elections/run", viewKey: "run-view", cols: 0, stub: true, flat: true, what: "الانتخابات" };
export const VOTE_ROOM: RoomMeta = { title: "صوّت الآن", navPath: "/dashboard/elections/vote", viewKey: "vote-view", cols: 0, stub: true, flat: true, what: "الانتخابات" };
export const MY_CANDIDACIES_ROOM: RoomMeta = { title: "سِجلّ ترشُّحي", navPath: "/dashboard/elections/my", viewKey: "my-candidacies-view", cols: 0, stub: true, what: "الترشّحات" };
