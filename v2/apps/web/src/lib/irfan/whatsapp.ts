import { SITE_ORIGIN } from "@/lib/qrLinks";

/**
 * **طريقُ «عِرفان» إلى واتساب** (٢٠٢٦-١٠-١٧). بعد الحفظ تُفتح محادثةُ القائد برسالةٍ جاهزة يرسلها
 * العضوُ بيده: نصُّه، وتحته رابطُ البطاقة فيعرض واتساب صورتَها (`/irfan/<رمز>`).
 * نقيٌّ بلا استيراد خادميّ، فيستعمله العميلُ والخادم.
 */

/** الرقمُ بصيغة واتساب الدوليّة: «05XXXXXXXX» ← «9665XXXXXXXX». وما لا يُفهم يُرَدّ `null`. */
export function waNumber(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (/^05\d{8}$/.test(d)) return `966${d.slice(1)}`;
  if (/^5\d{8}$/.test(d)) return `966${d}`;
  if (/^9665\d{8}$/.test(d)) return d;
  if (/^009665\d{8}$/.test(d)) return d.slice(2);
  return null;
}

/** رابطُ البطاقة العامّ — ما يُلصق في المحادثة فيُعرض بصورته. */
export const irfanShareUrl = (token: string): string => `${SITE_ORIGIN}/irfan/${token}`;

/** مسارُ صورة المعاينة في دلو `images` — يصكّه الخادم، وتعلنه الصفحةُ العامّة. */
export const irfanPreviewPath = (token: string): string => `irfan/${token}.jpg`;

/** نصُّ المحادثة: الرسالةُ كما كتبها، ثمّ رابطُ بطاقتها. */
export const irfanWhatsAppText = (body: string, token: string): string =>
  `${body.trim()}\n\nبطاقةُ عِرفان: ${irfanShareUrl(token)}`;

/** رابطُ المحادثة نفسِها (`wa.me`)، أو `null` إن لم يُفهم الرقم. */
export function irfanWhatsAppLink(phone: string | null | undefined, body: string, token: string): string | null {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(irfanWhatsAppText(body, token))}` : null;
}
