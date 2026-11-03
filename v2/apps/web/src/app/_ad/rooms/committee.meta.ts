import type { RoomMeta } from "./meta";

/** «لجنتي» على غرفة الأعضاء — لجنةٌ واحدةٌ بلا مبدّل، وقيادتُها سطرٌ فوق كروت أعضائها (٢٠٢٦-١١-٠٣). العنوانُ الحيُّ اسمُ اللجنة. */
export const COMMITTEE_ROOM: RoomMeta = {
  title: "لجنتي", navPath: "/dashboard/committee", viewKey: "committee-view", cols: 1, stub: true, flat: true, what: "الأعضاء",
};
