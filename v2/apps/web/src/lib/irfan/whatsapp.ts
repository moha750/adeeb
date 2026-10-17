import { SITE_ORIGIN } from "@/lib/qrLinks";

/**
 * **طريقُ «عِرفان» إلى واتساب** (٢٠٢٦-١٠-١٧). بعد الحفظ تُفتح محادثةُ القائد برسالةٍ جاهزة يرسلها
 * العضوُ بيده: سطرٌ يدعوه إلى بطاقته، ثمّ رابطُها فيعرض واتساب صورتَها (`/irfan/<رمز>`).
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

/** ما يُعرف به المستلمُ في نصّ المحادثة: جنسُه (للخطاب) واسمُ الموسم. */
export type IrfanTo = { gender: string | null | undefined; season: string | null | undefined };

/**
 * **نصُّ المحادثة طُعمٌ لا الرسالة** (المالك ٢٠٢٦-١٠-١٧: «المفروض أن يكون محتوى الرسالة بمثابة الهوك»):
 * لو كُتبت الرسالةُ في المحادثة لقرأها القائدُ ولم يفتح البطاقة. فالنصُّ يدعوه إليها بخطابه هو، ويذكر
 * المناسبة (شرطُ المالك)، ثمّ الرابط. والرسالةُ نفسُها في البطاقة وحدها.
 *
 * **وصيغتان تتناوبان** (اختارهما المالك من ثمانٍ، وأقرّ التناوب): القائدُ يصله عِرفانٌ من أعضاءٍ كثيرين،
 * فلو جاءته الرسائلُ بنصٍّ واحدٍ حرفًا بحرف لقرأها قالبًا جماعيًّا. والصيغةُ تُختار برمز الرسالة نفسِه،
 * فتثبت لها: من أعاد فتح المحادثة من «أرسلتُ» وجد النصَّ ذاتَه.
 *
 * والأولى تقول «{المناسبة} يومُك»، فتصحّ لمناسبةٍ هي يومٌ (اليوم العالمي للمدير)؛ ومتى جاء موسمٌ ليس
 * يومًا (نهاية الفصل) راجِع هذا السطر.
 */
export function irfanWhatsAppText(token: string, to: IrfanTo): string {
  const f = to.gender === "female";
  const season = to.season?.trim();
  const url = irfanShareUrl(token);
  const first = season && parseInt(token.charAt(0), 16) % 2 === 0;
  return first
    ? `${season} ${f ? "يومُكِ" : "يومُك"}، وهذه بطاقةٌ كتبتُها ${f ? "لكِ" : "لك"} 💌\n${f ? "افتحيها" : "افتحها"} هنا: ${url}`
    : `${f ? "لأنّكِ تستحقّين" : "لأنّك تستحقّ"} أكثر من «شُكرًا»، كتبتُ ${f ? "لكِ" : "لك"}${season ? ` في ${season}` : ""} 💌\n${f ? "اقرئي" : "اقرأ"} ما كتبتُ هنا: ${url}`;
}

/** رابطُ المحادثة نفسِها (`wa.me`)، أو `null` إن لم يُفهم الرقم. */
export function irfanWhatsAppLink(phone: string | null | undefined, token: string, to: IrfanTo): string | null {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(irfanWhatsAppText(token, to))}` : null;
}
