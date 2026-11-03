import type { RoomMeta } from "./meta";

/**
 * «حملات الباركود» — جارُ «باركودات مفردة» (`dashboard/tools/qr/campaigns/(room)/`). لم تكن للغرفة القديمة تبويبات ولا
 * مرشّحات، فلا مواضع (`flat`). والمفتاحُ مفتاحُ القديمة (`qr-campaigns-view`). والعمودان: باركوداتُها ومسحاتُها؛
 * والكعبُ تاريخُ إنشائها.
 */
export const QR_CAMPAIGNS_ROOM: RoomMeta = {
  title: "حملات الباركود", navPath: "/dashboard/tools/qr/campaigns", viewKey: "qr-campaigns-view", cols: 2, stub: true, flat: true, what: "حملاتك",
};
