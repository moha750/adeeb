import type { RoomMeta } from "./meta";

/**
 * غرفةُ «متابعة الرؤية» (٢٠٢٦-١١-٠٣) — قائمةٌ وحدها (`listOnly`): الأهدافُ تحت مساراتها، ورأسُ كلّ مسارٍ طبقتُه من الهلال
 * وما تحقّق منها (قاعدةُ «السجلّات تحت أصحابها» تشترط القائمة).
 */
export const VISION_ROOM: RoomMeta = {
  title: "متابعة الرؤية", navPath: "/dashboard/vision", viewKey: "vision-view", cols: 0, stub: true, defaultView: "table", listOnly: true, what: "الأهداف",
};
