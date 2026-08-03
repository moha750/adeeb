/**
 * وصفُ البطاقة — **مصدرٌ واحدٌ للمعاينة وللملفّ الموقَّع معًا**.
 *
 * هذا هو حجرُ الزاوية في هذا المجلّد: `cardFace()` يبني حقولَ البطاقة مرّةً، فترسمها
 * الصفحةُ في المتصفّح ويكتبها `pkpass/route.ts` في `pass.json` — فما يراه المالك في
 * المعاينة **هو** ما يصل جهازَه، لا شيءٌ يشبهه. (نفسُ مبدأ `lib/qr.ts`: راسمٌ واحدٌ
 * لا راسمان يفترقان يومًا.)
 *
 * وترتيبُ الحقول ومواضعُها ليست ذوقًا: هي مواضعُ Apple Wallet لبطاقة المتجر
 * (`storeCard`) — ترويسةٌ في الأعلى، ثمّ حقلٌ رئيس، ثمّ صفّان، ثمّ الباركود.
 */

import { arDate, arNum, nextTier, TIERS, tierOf, type DemoMember } from "./demo";

/** حقلٌ واحدٌ كما يعرّفه PassKit: مفتاحٌ وتسميةٌ وقيمة. */
export type PassField = { key: string; label?: string; value: string };

/** وجهُ البطاقة وظهرُها — بلغة PassKit لا بلغتنا، فلا ترجمةَ بين الطبقتين. */
export type CardFace = {
  logoText: string;
  headerFields: PassField[];
  primaryFields: PassField[];
  secondaryFields: PassField[];
  auxiliaryFields: PassField[];
  backFields: PassField[];
  /** حمولةُ الباركود — الرابط الذي يُفتَح عند المسح. */
  barcode: string;
};

/** وجهةُ الباركود. **وهميّةٌ في المعاينة** — لا صفحةَ بهذا المسار اليوم. */
export const cardUrl = (serial: string): string => `https://adeeb.club/card/${serial}`;

/* ألوان البطاقة من رموز الهوية لا من الذاكرة: كحليّ‑700 سطحًا، وفولاذيّ‑200 للتسميات. */
export const PASS_COLORS = {
  background: "rgb(39,64,96)", // --navy-700 #274060
  foreground: "rgb(255,255,255)",
  label: "rgb(188,207,224)", // --steel-200 #bccfe0
} as const;

/** يبني وجهَ البطاقة من عضو — انظر رأس الملفّ. */
export function cardFace(m: DemoMember): CardFace {
  const tier = tierOf(m.points);
  const next = nextTier(m.points);

  return {
    logoText: "أَدِيب",
    headerFields: [{ key: "points", label: "الرصيد", value: arNum(m.points) }],
    primaryFields: [{ key: "tier", label: "الرتبة", value: tier.name }],
    secondaryFields: [
      { key: "holder", label: "العضو", value: m.name },
      { key: "unit", label: "الوحدة", value: m.unit },
    ],
    auxiliaryFields: [
      { key: "since", label: "عضوٌ منذ", value: arDate(m.joined) },
      {
        key: "next",
        label: next ? `إلى «${next.tier.name}»` : "السلّم",
        value: next ? `${arNum(next.remaining)} نقطة` : "بلغَ قمّتَه",
      },
    ],
    backFields: [
      { key: "position", label: "المسمّى", value: m.position },
      { key: "serial", label: "رقم البطاقة", value: m.serial },
      { key: "perk", label: `ما تفتحه «${tier.name}»`, value: tier.perk },
      {
        key: "ladder",
        label: "سلّم الرتب",
        value: TIERS.map((t) => `${t.name} — ${arNum(t.from)} نقطة فأكثر`).join("\n"),
      },
      {
        key: "how",
        label: "كيف تُجمَع النقاط",
        value:
          "تُرصَد نقاطُك على ما تُنجزه في أديب — ورشةٌ تُقدّمها، أو خبرٌ تكتبه، أو أمسيةٌ تُديرها. " +
          "يرصدها مسؤولُ وحدتك باسمه، فيبقى لكلّ نقطةٍ سببٌ مكتوب.",
      },
      {
        key: "notice",
        label: "تنبيه",
        value: "هذه بطاقةُ معاينةٍ ببياناتٍ وهميّة، صدرت لتجربة النظام قبل إقراره. لا تُخوّل حاملَها شيئًا.",
      },
    ],
    barcode: cardUrl(m.serial),
  };
}

/**
 * `pass.json` كاملًا — يُكتب في الحزمة كما هو.
 * المعرّفان (`passTypeIdentifier` و`teamIdentifier`) من البيئة لأنّهما يخصّان حساب
 * أبل لا الكود.
 */
export function passJson(
  m: DemoMember,
  ids: { passTypeIdentifier: string; teamIdentifier: string },
): Record<string, unknown> {
  const face = cardFace(m);
  return {
    formatVersion: 1,
    passTypeIdentifier: ids.passTypeIdentifier,
    teamIdentifier: ids.teamIdentifier,
    serialNumber: m.serial,
    organizationName: "نادي أَدِيب",
    description: "بطاقة ولاء نادي أديب",
    logoText: face.logoText,
    backgroundColor: PASS_COLORS.background,
    foregroundColor: PASS_COLORS.foreground,
    labelColor: PASS_COLORS.label,
    // البطاقة عربيّة، وiOS يعكس تخطيطها تلقائيًّا حين تكون لغةُ الجهاز عربيّة.
    storeCard: {
      headerFields: face.headerFields,
      primaryFields: face.primaryFields,
      secondaryFields: face.secondaryFields,
      auxiliaryFields: face.auxiliaryFields,
      backFields: face.backFields,
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: face.barcode,
        messageEncoding: "iso-8859-1",
        altText: m.serial,
      },
    ],
  };
}
