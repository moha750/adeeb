import "server-only";
import { headers } from "next/headers";
import { SITE_ORIGIN } from "@/lib/qrLinks";

/**
 * **أصلُ الطلب كما وصل** — يُبنى منه رابطُ الانضمام الذي يُحفَر في الباركود.
 *
 * ولماذا من الترويسة لا من `NEXT_PUBLIC_SITE_URL`: الرمزُ يُمسَح **بهاتفٍ على الشبكة
 * نفسِها** أثناء التجربة المحلّيّة (`next.config.ts` يفتح `allowedDevOrigins` لذلك
 * صراحةً)، وأصلٌ محفورٌ يرسل الماسحَ إلى الإنتاج فلا يجد غرفتَه.
 *
 * ولماذا في الخادم لا في المتصفّح: قراءةُ `window.location` تلزمها حالةٌ تُضبَط في
 * أثر، فيُرسَم الرمزُ فارغًا ثمّ يظهر — ووميضٌ في شاشةٍ معروضةٍ على حائط. والترويسةُ
 * تعطيه قبل أوّل بايت.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.trim() || h.get("host")?.trim();
  if (!host) return SITE_ORIGIN;
  // خلف وكيل Vercel تصل `x-forwarded-proto`؛ ومحلّيًّا لا وكيلَ ولا تشفير.
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  return `${proto}://${host}`;
}
