import type { RoomMeta } from "./meta";

/**
 * غرفةُ برامج الإذاعة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). `viewKey` مفتاحُ `usePersistentView` القديم نفسُه (`radio-view`)،
 * فيبقى اختيارُ العضو بين الكروت والجدول، والأصلُ كروتٌ كما كان. وعمودُ الجدول الواحد: الحلقاتُ المنشورة بشريطها من الحلقات
 * (والمقدّمُ والمعرّفُ سطران تحت الاسم) — والكعبُ عددُ الحلقات على شعار البرنامج.
 */
export const RADIO_ROOM: RoomMeta = {
  title: "إذاعة أدِيب", navPath: "/dashboard/radio", viewKey: "radio-view", cols: 1, textCols: 1, stub: true, what: "البرامج",
};
