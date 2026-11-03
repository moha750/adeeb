import type { RoomMeta } from "./meta";

/**
 * «باركودات مفردة» — البابُ الأوّل في مولّد الباركود (`dashboard/tools/qr/links/`). والمسارُ مسارُ البند في خريطة التنقّل
 * (`/dashboard/tools/qr`، والجذرُ يحوّل إلى `links/`): منه رمزُ الغرفة في فراغها وفتاتُها، وبه يُعرف بلاغُ الخطأ.
 * والمفتاحُ مفتاحُ القديمة (`qr-links-view`)، وتقرؤه غرفةُ الحملة أيضًا كما كانت. والعمودُ الواحد: المسحات؛ والكعبُ تاريخُ الإنشاء.
 */
export const QR_LINKS_ROOM: RoomMeta = {
  title: "باركودات مفردة", navPath: "/dashboard/tools/qr", viewKey: "qr-links-view", cols: 1, stub: true, what: "باركوداتك",
};
