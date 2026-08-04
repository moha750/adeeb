/**
 * علامةُ أديب — **قناةُ شفّافيّةٍ خامٌّ مضغوطة، لا صورة**. أختُ `pattern.ts` وصفةً وعلّةً:
 * الأصلُ متّجهٌ (`public/brand/logo-vertical-white.svg`) ولا راسمَ SVG على الخادم، وقراءةُ
 * ملفٍّ من القرص ليست مضمونةً داخل حزمة الدالّة — فالوحدةُ المستورَدة وحدها مضمونة.
 *
 * **والمرسومُ هنا العلامةُ وحدها لا الشعارُ كاملًا**: الملفّ المتّجه يحمل تحتها «نادي
 * أَدِيب» و«Adeeb Club»، وهما في أيقونةٍ من ٢٩ بكسلًا لطخةٌ لا تُقرأ.
 *
 * **والقصُّ مقيسٌ لا بالعين**: مُسحت صفوفُ الحبر فبانت **ثلاثُ كتلٍ** يفصلها بياضٌ تامّ —
 * العلامةُ تنتهي عند **٧٧٪** من الارتفاع، ثمّ الاسمان تحتها. فأُخذت الكتلةُ الأولى بحدودها
 * الضيّقة (448×1267 في الأصل) ووُسِّطت في مربّع `LOGO_SIDE`.
 *
 * **وبلا تكميم** بخلاف النقش: النقشُ يُعرَض بشفافيّة ٠٫١٢ فيبتلع خشونةَ الدرجات، والعلامةُ
 * تُرسَم بيضاءَ خالصةً فحوافُّها تُرى. والفرقُ في الحمولة أربعةُ كيلوبايت لا تُذكَر.
 *
 * **وإن غُيّرت العلامة** تُعاد الوصفةُ نفسُها — مكتوبةٌ في `README.md`.
 */

import { inflateSync } from "node:zlib";

/** ضلعُ اللوح المُعبَّأ — ضِعفا أيقونة `@2x`، يكفي لتنعيم التصغير إلى ٢٩ و٥٨ و٨٧. */
export const LOGO_SIDE = 128;

/** `LOGO_SIDE²` بايتَ شفّافيّةٍ مضغوطةً بـ`deflate`. */
const PACKED = "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";

/** يُفكّ مرّةً ويُحفظ — الأيقونة تُبنى ثلاث مرّات في كلّ حزمة. */
let cache: Buffer | null = null;

/** قناةُ شفّافيّة العلامة، بايتًا لكلّ بكسل. */
export function logoAlpha(): Buffer {
  cache ??= inflateSync(Buffer.from(PACKED, "base64"));
  return cache;
}
