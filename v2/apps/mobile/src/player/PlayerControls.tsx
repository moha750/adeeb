import { color, radius, space } from "@adeeb/theme-native";
import { SKIP_SECONDS } from "@adeeb/core";
import Slider from "@react-native-community/slider";
import {
  ArrowCounterClockwiseIcon,
  ArrowClockwiseIcon,
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
} from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { TOUCH } from "@/ui/layout";
import { T } from "@/ui/T";

import { useRadioPlayer } from "./PlayerProvider";
import { clock, toneColor } from "./tones";
import { Waveform } from "./Waveform";

/**
 * زمامُ المشغّل الكامل — يعيش في صفحة الحلقة.
 *
 * أدواتُه هي أدواتُ الويب نفسُها إلّا شيئين حذفناهما عمدًا: مقياسُ الصوت والكتم،
 * فهما زرّان في حافّة الجهاز يملكهما النظام.
 *
 * **والمقبضُ لا يظهر إلّا لحلقةٍ تملكه.** الحلقةُ المرفوعةُ بمسارين يُخفَت فيها
 * السريرُ الموسيقيُّ وحدَه ويبقى الكلامُ ثابتًا؛ وما رُفع بمزيجٍ واحدٍ لا سبيل إلى
 * فصله، فإظهارُ مقبضٍ لا يعمل أسوأُ من غيابه.
 */
export function PlayerControls() {
  const { current, playing, failed, hasDial, musicLevel, time, duration, rate, toggle, seek, skip, cycleRate, setMusicLevel } =
    useRadioPlayer();

  if (!current) return null;

  const tint = toneColor[current.tone];
  const total = duration || current.seconds || 0;
  const progress = total > 0 ? Math.min(1, time / total) : 0;
  const peaks = musicLevel > 0 ? current.musicPeaks : current.plainPeaks;

  return (
    <View style={styles.root}>
      <Waveform
        peaks={peaks ?? current.musicPeaks ?? current.plainPeaks}
        progress={progress}
        tint={tint}
        height={56}
        onSeekRatio={(ratio) => seek(ratio * total)}
      />

      <View style={styles.times}>
        <T size="xs" latin color={color.textMuted}>
          {clock(time)}
        </T>
        <T size="xs" latin color={color.textMuted}>
          {clock(total)}
        </T>
      </View>

      {failed ? (
        <View style={styles.failed}>
          <T size="sm" color={color.danger_}>
            تعثّر تحميلُ الصوت. تحقّق من اتّصالك ثمّ أعِد المحاولة.
          </T>
        </View>
      ) : null}

      <View style={styles.row}>
        <Pressable onPress={cycleRate} hitSlop={8} style={styles.side} accessibilityLabel="سرعة التشغيل">
          <T size="sm" weight="medium" latin color={color.secondary}>
            {`${rate}×`}
          </T>
        </Pressable>

        <View style={styles.center}>
          <Pressable onPress={() => skip(-SKIP_SECONDS)} hitSlop={8} style={styles.icon} accessibilityLabel="رجوع عشر ثوانٍ">
            <ArrowCounterClockwiseIcon size={26} color={color.text} />
          </Pressable>

          <Pressable onPress={toggle} style={[styles.play, { backgroundColor: tint }]} accessibilityLabel={playing ? "إيقاف" : "تشغيل"}>
            {playing ? <PauseIcon size={30} color={color.onPrimary} /> : <PlayIcon size={30} color={color.onPrimary} />}
          </Pressable>

          <Pressable onPress={() => skip(SKIP_SECONDS)} hitSlop={8} style={styles.icon} accessibilityLabel="تقدّم عشر ثوانٍ">
            <ArrowClockwiseIcon size={26} color={color.text} />
          </Pressable>
        </View>

        <View style={styles.side} />
      </View>

      {hasDial ? (
        <View style={styles.dial}>
          <Pressable
            onPress={() => setMusicLevel(musicLevel > 0 ? 0 : 1)}
            hitSlop={8}
            style={styles.icon}
            accessibilityLabel={musicLevel > 0 ? "إسكات الموسيقى" : "إعادة الموسيقى"}
          >
            {/* أيقونةٌ واحدةٌ ونغمتُها تقول الحال: لا يوجد في Phosphor «نوتةٌ مشطوبة»،
                وأقربُ بديلٍ (سمّاعةٌ مشطوبة) يعني صمتًا تامًّا — والمقبضُ يُخفت
                السريرَ الموسيقيَّ وحدَه والكلامُ باقٍ، فالبديلُ يكذب. */}
            <MusicNotesIcon size={22} color={musicLevel > 0 ? tint : color.neutral[300]} />
          </Pressable>

          <Slider
            style={styles.slider}
            value={musicLevel}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            onValueChange={setMusicLevel}
            minimumTrackTintColor={tint}
            maximumTrackTintColor={color.neutral[200]}
            thumbTintColor={tint}
          />

          <T size="xs" color={color.textMuted}>
            {musicLevel === 0 ? "بلا موسيقى" : "الموسيقى"}
          </T>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  times: { flexDirection: "row", justifyContent: "space-between" },
  failed: { backgroundColor: color.dangerSoft, borderRadius: radius.sm, padding: space[3] },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  side: { width: 56, alignItems: "center" },
  center: { flexDirection: "row", alignItems: "center", gap: space[4] },
  icon: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" },
  play: {
    width: 64,
    height: 64,
    borderRadius: radius.base,
    alignItems: "center",
    justifyContent: "center",
  },
  dial: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[1] },
  slider: { flex: 1, height: TOUCH },
});
