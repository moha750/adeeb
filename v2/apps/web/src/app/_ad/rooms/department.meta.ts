import type { RoomMeta } from "./meta";

/** «قسمي» على غرفة الأعضاء — لجانُ القسم مواضعُها، عرضًا محضًا (٢٠٢٦-١١-٠٣). العنوانُ الحيُّ اسمُ القسم. */
export const DEPARTMENT_ROOM: RoomMeta = {
  title: "قسمي", navPath: "/dashboard/department", viewKey: "department-view", cols: 1, stub: true, what: "الأعضاء",
};
