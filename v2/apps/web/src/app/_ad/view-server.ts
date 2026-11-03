import "server-only";
import { cookies } from "next/headers";
import { asView, viewCookie, type RoomView } from "./view";

/**
 * العرضُ الذي اختاره العضو لهذه الغرفة، يقرؤه الخادمُ قبل الرسم (الصفحة و`loading.tsx`). والأصلُ كروت، إلّا غرفةً كانت جدولًا
 * وحده (`RoomMeta.defaultView`: الرسائل، والمكتبة) — فتبدأ بما اعتاده العضو، والكروتُ على بُعد زرّ.
 */
export async function roomView(key: string, fallback: RoomView = "cards"): Promise<RoomView> {
  return asView((await cookies()).get(viewCookie(key))?.value) ?? fallback;
}
