import type { RoomMeta } from "./meta";

/** «من أشرف عليهم» على غرفة الأعضاء — لجانُ المشرف مواضعُها، و«السابقون» من غادرها أثناء إشرافه (٢٠٢٦-١١-٠٣). */
export const SUPERVISED_ROOM: RoomMeta = {
  title: "من أشرف عليهم", navPath: "/dashboard/members/supervised", viewKey: "supervised-view", cols: 1, stub: true, what: "الأعضاء",
};
