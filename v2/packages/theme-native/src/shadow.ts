import type { ViewStyle } from "react-native";

import { shadowTone } from "./tokens.generated";

/**
 * الظلالُ الثلاثة، بالنغمة.
 *
 * في الويب ظلٌّ واحدٌ بلونٍ موسوم: `--shadow-tone` يحمل ثلاثيَّ rgb، والمقاساتُ الثلاثةُ
 * تُركَّب فوقه. نُعيد الشكلَ نفسَه هنا كي لا يتفرّق النظامان.
 *
 * تُستعمل `boxShadow` لا `shadowColor`+`elevation`: الأخيرةُ تُلقي على أندرويد ظلًّا رماديًّا
 * لا يقبل لونًا، فتضيع النغمةُ كلُّها. و`boxShadow` مدعومةٌ في المعماريّة الجديدة على
 * المنصّتين بالقيم نفسِها، فالمصدرُ يبقى واحدًا.
 */

export type ShadowSize = "sm" | "md" | "lg";
export type ShadowTone = keyof typeof shadowTone;

/** المقاساتُ كما في tokens.css (الإزاحة · التمويه · الانتشار · الشفافيّة). */
const SIZES = {
  sm: { offsetY: 2, blurRadius: 6, spreadDistance: -2, alpha: 0.16 },
  md: { offsetY: 8, blurRadius: 20, spreadDistance: -8, alpha: 0.22 },
  lg: { offsetY: 18, blurRadius: 38, spreadDistance: -16, alpha: 0.28 },
} as const;

/**
 *   <View style={[styles.card, shadow("md")]} />
 *   <View style={[styles.card, shadow("lg", "danger")]} />
 */
export function shadow(size: ShadowSize = "md", tone: ShadowTone = "brand"): ViewStyle {
  const { offsetY, blurRadius, spreadDistance, alpha } = SIZES[size];
  const { r, g, b } = shadowTone[tone];

  return {
    boxShadow: [{ offsetX: 0, offsetY, blurRadius, spreadDistance, color: `rgba(${r}, ${g}, ${b}, ${alpha})` }],
  };
}
