/** لحظةُ الطلب على الخادم — تُمرَّر إلى الغرفة فلا يُستدعى `Date.now` في الرسم (نقاءُ React). */
export async function requestNow(): Promise<number> {
  return Date.now();
}
