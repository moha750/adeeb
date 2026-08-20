import { fontFamily, splitDigits, type, type TypeOptions } from "@adeeb/theme-native";
import { Text as RNText, type TextProps } from "react-native";

/**
 * نصُّ أديب. لا يُستعمل `<Text>` الخام في شاشة.
 *
 * يفعل شيئين لا يفعلهما `<Text>`:
 *   ١) يأخذ خطَّه ومقاسَه من `type()` وحدَه، فلا يُكتب `fontFamily` في شاشة.
 *   ٢) يغلّف الأرقامَ والحروفَ اللاتينيّة بـEras ويبقي العربيّةَ بـLyon في السطر نفسِه —
 *      وهو ما يفعله الويبُ بـ`unicode-range` ولا يملكه RN.
 *
 *   <T size="lg" weight="bold">الحلقة 3 من منعطف</T>
 */
export function T({
  size,
  weight,
  leading,
  color,
  latin,
  style,
  children,
  ...rest
}: TypeOptions & TextProps) {
  const base = type({ size, weight, leading, color, latin });

  // نصٌّ لاتينيٌّ خالصٌ بإعلانٍ صريح، أو محتوًى ليس سلسلةَ نصّ: يُعرض كما هو بلا تقسيم
  if (latin || typeof children !== "string") {
    return (
      <RNText style={[base, style]} {...rest}>
        {children}
      </RNText>
    );
  }

  const runs = splitDigits(children);
  if (runs.length <= 1) {
    return (
      <RNText style={[base, style]} {...rest}>
        {children}
      </RNText>
    );
  }

  const latinFamily = type({ size, weight, leading, latin: true }).fontFamily;

  return (
    <RNText style={[base, style]} {...rest}>
      {runs.map((run, i) =>
        run.latin ? (
          <RNText key={i} style={{ fontFamily: latinFamily }}>
            {run.text}
          </RNText>
        ) : (
          run.text
        )
      )}
    </RNText>
  );
}

export { fontFamily };
