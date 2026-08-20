import { color, radius, shadow, space, stroke } from "@adeeb/theme-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { PauseIcon, PlayIcon } from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MINI_H, TAB_BAR_H, TOUCH } from "@/ui/layout";
import { T } from "@/ui/T";

import { useRadioPlayer } from "./PlayerProvider";
import { toneColor } from "./tones";

/**
 * الشريطُ الملازم.
 *
 * **هو سببُ أن يكون هذا تطبيقًا لا موقعًا مغلَّفًا.** يعيش في جذر التطبيق لا في شاشة،
 * فالصوتُ لا ينقطع وأنت تتنقّل بين الإذاعة والأنشطة وحسابك. ولو سكن شاشةً واحدةً
 * لمات عند أوّل نقرة، وهو بالضبط ما يحدث داخل عرض الويب.
 *
 * ويكفّ عن الظهور حين تكون في صفحة الحلقة نفسِها: هناك مشغّلٌ كاملٌ أمام عينيك،
 * فشريطٌ ثانٍ فوقه تكرارٌ يسرق سطرًا من الشاشة. نفسُ قرار الويب.
 */
export function MiniPlayer() {
  const { current, playing, toggle, time, duration, inlineVisible } = useRadioPlayer();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (!current || inlineVisible) return null;

  const tint = toneColor[current.tone];
  const total = duration || current.seconds || 0;
  const progress = total > 0 ? Math.min(1, time / total) : 0;

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_H }]}>
      <Pressable style={styles.bar} onPress={() => router.push(`/episode/${current.id}`)}>
        {/* خيطُ التقدّم فوق الشريط: يُقرأ بطرف العين بلا أن يأخذ سطرًا */}
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: tint }]} />
        </View>

        <View style={styles.body}>
          {current.coverUrl ? (
            <Image source={{ uri: current.coverUrl }} style={styles.cover} contentFit="cover" transition={120} />
          ) : (
            <View style={[styles.cover, { backgroundColor: tint }]} />
          )}

          <View style={styles.text}>
            <T size="sm" weight="medium" numberOfLines={1}>
              {current.title}
            </T>
            <T size="xs" color={color.textMuted} numberOfLines={1}>
              {current.showTitle}
            </T>
          </View>

          <Pressable
            onPress={toggle}
            hitSlop={10}
            style={styles.btn}
            accessibilityLabel={playing ? "إيقاف" : "تشغيل"}
          >
            {playing ? <PauseIcon size={26} color={tint} /> : <PlayIcon size={26} color={tint} />}
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", insetInlineStart: space[3], insetInlineEnd: space[3] },
  bar: {
    height: MINI_H,
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    overflow: "hidden",
    ...shadow("md"),
  },
  track: { height: 2, backgroundColor: color.neutral[200], flexDirection: "row-reverse" },
  fill: { height: 2 },
  body: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: space[3], gap: space[3] },
  cover: { width: 38, height: 38, borderRadius: radius.sm },
  text: { flex: 1, gap: 2 },
  btn: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" },
});
