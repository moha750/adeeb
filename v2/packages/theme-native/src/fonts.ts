import { Platform, type TextStyle } from "react-native";

import { leading as leadingScale, text as textScale, weight as weightScale } from "./tokens.generated";

/**
 * خطوطُ الهويّة في React Native.
 *
 * ثلاثةُ فروقٍ عن الويب تُفسّر شكلَ هذا الملفّ:
 *
 * ١) **لا `fontWeight`.** أسماءُ العائلات المحفورةُ في ملفّاتنا غيرُ متّسقة (الفاتحُ عائلةٌ
 *    قائمةٌ بذاتها، والعاديُّ والعريضُ عائلةٌ واحدة). فلو طلبنا وزنًا لاختار النظامُ أقربَ ما
 *    يجد ثمّ **زوّر** الباقي (faux bold) — وهو العطلُ الموثَّق في رسّام الأوراق. فكلُّ وزنٍ
 *    هنا عائلةٌ باسمها الصريح، ولا يُمرَّر `fontWeight` أبدًا.
 *
 * ٢) **لا `unicode-range`.** في الويب أُعيد تعريفُ الأرقام الغربيّة داخل عائلة Lyon مشيرةً
 *    إلى ملفّات Eras، فتخرج الأرقامُ بـEras والعربيّةُ بـLyon في سطرٍ واحد. وRN لا يملك هذا،
 *    فالحلُّ تقسيمُ النصّ إلى مقاطعَ وتغليفُ الأرقام بخطّها. انظر `splitDigits`.
 *
 * ٣) **`lineHeight` بالنقاط لا بالنسبة.** في CSS `--leading-*` نسبة، وRN يريد رقمًا مطلقًا،
 *    فيُضرب هنا مرّةً واحدةً بدل أن يُحسَب في كلّ نداء.
 */

/**
 * أسماءُ الخطّ تختلف بين المنصّتين، ولا حيلةَ في ذلك:
 *   **iOS** يقرأ اسمَ PostScript المحفورَ داخل الملفّ، ولا يُغيَّر إلّا بتعديل الملفّ نفسِه.
 *   **أندرويد** يقرأ اسمَ مورد XML الذي تولّده إضافةُ `expo-font` باشتقاقٍ من الاسم الذي
 *   نمرّره: تُحوّل السنامَ إلى شرطاتٍ سفليّةٍ وتُصغّر وتسبقه بـ`xml_`
 *   («LyonArabicDisplay-Regular» ← `xml_lyon_arabic_display_regular`).
 *
 * فالفرقُ محصورٌ في هذا الجدول وحدَه، والشاشاتُ تنادي `type()` ولا ترى منه شيئًا.
 * وأيُّ تعديلٍ في `FONTS` داخل `app.config.ts` يُقابله تعديلٌ هنا؛ لا ثالثَ لهما.
 */
export const fontFamily = {
  /** Lyon Arabic — العناوينُ والنصُّ العربيّ */
  arabic: {
    300: Platform.select({ android: "xml_lyon_arabic_display_light", default: "LyonArabicDisplay-Light" }),
    400: Platform.select({ android: "xml_lyon_arabic_display_regular", default: "LyonArabicDisplay-Regular" }),
    500: Platform.select({ android: "xml_lyon_arabic_display_medium", default: "LyonArabicDisplay-Medium" }),
    700: Platform.select({ android: "xml_lyon_arabic_display_bold", default: "LyonArabicDisplay-Bold" }),
    900: Platform.select({ android: "xml_lyon_arabic_display_black", default: "LyonArabicDisplay-Black" }),
  },
  /** ITC Eras — اللاتينيّ والأرقامُ الغربيّة */
  latin: {
    300: Platform.select({ android: "xml_eras_itc_light", default: "ErasITC-Light" }),
    500: Platform.select({ android: "xml_eras_itc_medium", default: "ErasITC-Medium" }),
    600: Platform.select({ android: "xml_eras_itc_demi", default: "ErasITC-Demi" }),
    700: Platform.select({ android: "xml_eras_itc_bold", default: "ErasITC-Bold" }),
  },
} as const;

export type ArabicWeight = keyof typeof fontFamily.arabic;
export type LatinWeight = keyof typeof fontFamily.latin;
export type TextSize = keyof typeof textScale;
export type Leading = keyof typeof leadingScale;

/** أقربُ وزنٍ موجودٍ في Eras لوزنٍ عربيّ (Eras لا يملك 400 ولا 900). */
const LATIN_FALLBACK: Record<ArabicWeight, LatinWeight> = {
  300: 300,
  400: 500,
  500: 500,
  700: 700,
  900: 700,
};

export type TypeOptions = {
  size?: TextSize;
  weight?: keyof typeof weightScale;
  leading?: Leading;
  /** نصٌّ لاتينيٌّ أو رقميٌّ خالص: يُكتب بـEras مباشرةً */
  latin?: boolean;
  color?: string;
};

const WEIGHT_VALUE: Record<keyof typeof weightScale, ArabicWeight> = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700,
  black: 900,
};

/**
 * المصدرُ الوحيدُ لتنسيق النصّ. لا يُكتب `fontFamily` ولا `fontSize` في شاشةٍ مباشرةً.
 *
 *   <Text style={type({ size: "lg", weight: "bold" })}>عنوان</Text>
 */
export function type(options: TypeOptions = {}): TextStyle {
  const { size = "base", weight = "regular", leading = "normal", latin = false, color } = options;
  const w = WEIGHT_VALUE[weight];
  const fontSize = textScale[size];

  return {
    fontFamily: latin ? fontFamily.latin[LATIN_FALLBACK[w]] : fontFamily.arabic[w],
    fontSize,
    lineHeight: Math.round(fontSize * leadingScale[leading]),
    ...(color ? { color } : null),
    // لا fontWeight: انظر الملاحظة ١ أعلاه
  };
}

/** مقطعُ نصٍّ واحدُ الخطّ. */
export type TextRun = { text: string; latin: boolean };

/**
 * يقسم النصّ إلى مقاطعَ لاتينيّةٍ وعربيّة، كي تُكتب الأرقامُ والحروفُ اللاتينيّة بـEras
 * ويبقى ما حولها بـLyon — بديلُ `unicode-range` الذي يفعله الويب في ورقة الخطوط.
 *
 * تُعدّ لاتينيّةً: الأرقامُ الغربيّة، والحروفُ اللاتينيّة، وعلامةُ النسبة، وما يلتصق بها من
 * نقطةٍ وفاصلةٍ وشرطةٍ ونقطتين (كي لا ينكسر «12:30» ولا «2026-08-18» إلى مقاطعَ متناثرة).
 */
export function splitDigits(input: string): TextRun[] {
  const LATIN = /[0-9A-Za-z%+\-.,:/]/;
  const runs: TextRun[] = [];

  for (const ch of input) {
    const latin = LATIN.test(ch);
    const last = runs[runs.length - 1];
    if (last && last.latin === latin) last.text += ch;
    else runs.push({ text: ch, latin });
  }

  // مقطعٌ لاتينيٌّ بلا رقمٍ ولا حرفٍ (علاماتُ ترقيمٍ وحدها بين كلمتين عربيّتين) يعود عربيًّا
  return runs
    .map((run) => (run.latin && !/[0-9A-Za-z]/.test(run.text) ? { ...run, latin: false } : run))
    .reduce<TextRun[]>((acc, run) => {
      const last = acc[acc.length - 1];
      if (last && last.latin === run.latin) last.text += run.text;
      else acc.push({ ...run });
      return acc;
    }, []);
}
