import { defaultQrSpec } from "@/app/dashboard/tools/qr/defaults";
import type { QrLinkRow } from "@/app/dashboard/tools/qr/data";
import { qrShortUrl } from "@/lib/qrLinks";

/**
 * **صفُّ باركودٍ مصنوعٌ للمعارض: مصدرٌ واحدٌ لخمسِ شاشات.**
 *
 * غرفةُ الباركود خلف تسجيل الدخول، فمعارضُها تُطعِم المكوّناتِ الحقيقيّةَ صفوفًا
 * مصنوعة. وكانت تُكتب بيدِها في خمسة معارض (‏`qr-list` و`qr-stats` و`qr-settings`
 * و`qr-deep` و`qr-campaigns`)، فلمّا نال الصفُّ خانتَي «الحملة» سقط البناءُ فيها
 * (٢٠٢٦-٠٩-٢٤). فصار الصنعُ ههنا: تُضاف الخانةُ في `data.ts` مرّةً، وتُعطى قيمتَها
 * المصنوعةَ ههنا مرّةً، فتصل المعارضَ كلَّها.
 *
 * **والنوعُ مستورَدٌ بـ`import type`** من وحدةٍ خادميّة: الأنواعُ تُمحى عند الترجمة،
 * فلا يصل `server-only` إلى حزمة المتصفّح.
 *
 * **وما يخصُّ معرضًا يُمرَّر إليه** ولا يُكتَب ههنا: العناوينُ والمسحاتُ والتواريخُ
 * في كلّ معرضٍ مقصودةٌ لغرضه، وهذه أرضيّةٌ تُبنى عليها لا قالبٌ يُملي.
 */
export function sampleQrLink(over: Partial<QrLinkRow> = {}): QrLinkRow {
  const code = over.code ?? "e4trprm";
  return {
    id: "demo",
    code,
    title: "ملصق الملتقى",
    targetUrl: "https://adeeb.club/register",
    /* الوصفةُ تتبع الرمزَ لا العكس: الرمزُ هو ما يُرسَم في المربّع */
    spec: defaultQrSpec(qrShortUrl(code)),
    active: true,
    scanCount: 0,
    ownerId: "demo-owner",
    campaignId: null,
    campaignName: null,
    createdAt: "2026-07-30T09:00:00Z",
    updatedAt: "2026-09-04T09:00:00Z",
    ...over,
  };
}
