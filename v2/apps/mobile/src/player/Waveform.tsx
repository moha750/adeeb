import { color, radius } from "@adeeb/theme-native";
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { downsample } from "@/lib/radio";

/**
 * موجةُ الحلقة.
 *
 * الذُّرى محسوبةٌ ومخزَّنةٌ في القاعدة (٤٠٠ خانةٍ بقيمٍ من ٠ إلى ١٠٠)، فالجوّالُ يرسمها
 * ولا يفكّ ترميزَ صوتٍ ولا يحتاج Web Audio. وهي عمودٌ لكلّ خانةٍ كما في الويب،
 * لا مسارُ SVG: أعمدةٌ بسيطةٌ أرخصُ على الرسم وأصدقُ لهذا الشكل.
 *
 * والوثبُ **سحبٌ لا نقرةٌ فقط**: الإصبعُ عريضٌ والشريطُ رفيع، فمن نقر أخطأ ثمّ
 * صحّح بالسحب دون أن يرفع إصبعَه.
 */

const BAR_W = 3;
const BAR_GAP = 2;
const MIN_H = 0.12; // أدنى ارتفاعٍ كي لا يختفي عمودُ الصمت فينقطع الخطّ

export function Waveform({
  peaks,
  progress,
  tint,
  height = 48,
  onSeekRatio,
}: {
  peaks: number[] | null;
  /** من ٠ إلى ١ */
  progress: number;
  tint: string;
  height?: number;
  onSeekRatio?: (ratio: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const bars = width > 0 ? Math.max(1, Math.floor(width / (BAR_W + BAR_GAP))) : 0;
  const values = peaks && bars ? downsample(peaks, bars) : [];

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const seekAt = (x: number) => {
    if (!width || !onSeekRatio) return;
    // الشريطُ يُقرأ من اليمين: الصفحةُ عربيّةٌ والزمنُ يمضي مع القراءة
    onSeekRatio(Math.min(1, Math.max(0, 1 - x / width)));
  };

  const drag = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => seekAt(e.x))
    .onUpdate((e) => seekAt(e.x));

  const body = (
    <View style={[styles.row, { height }]} onLayout={onLayout}>
      {values.map((v, i) => {
        // العمودُ الأوّلُ في اليمين، فالمقطوعُ منه ما مضى من الزمن
        const passed = (i + 1) / values.length <= progress;
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: Math.max(MIN_H, v / 100) * height,
                backgroundColor: passed ? tint : color.neutral[200],
              },
            ]}
          />
        );
      })}
      {values.length === 0 ? <View style={[styles.flat, { backgroundColor: color.neutral[200] }]} /> : null}
    </View>
  );

  if (!onSeekRatio) return body;
  return <GestureDetector gesture={drag}>{body}</GestureDetector>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: BAR_GAP,
    overflow: "hidden",
  },
  bar: { width: BAR_W, borderRadius: radius.xs },
  flat: { height: 2, flex: 1, borderRadius: radius.xs },
});
