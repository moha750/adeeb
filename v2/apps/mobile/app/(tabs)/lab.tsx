import { TRACK_DEV_KEY } from "@adeeb/core/tracking";
import { color, radius, shadow, space, stroke } from "@adeeb/theme-native";
import { Image } from "expo-image";
import { PauseIcon, PlayIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { readPref, writePref } from "@/lib/prefs";
import { getEpisodes, type Episode } from "@/lib/radio";
import { clock, toneColor } from "@/player/tones";
import { MINI_H, TOUCH } from "@/ui/layout";
import { Note } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * معرضُ التصميم — نظيرُ `/ui` في الويب، داخل التطبيق.
 *
 * سببُه قانونُ المستودع: **القرارُ البصريُّ يُعرَض لا يُشرَح.** الشاشاتُ الحاليّة نزلت
 * ذرّاتُها من النظام المُقَرّ (لونًا وخطًّا وزاويةً وحدًّا) لكنّ تخطيطَها تأليفٌ لم يُقَرّ،
 * فتُعرَض بدائلُه على الجهاز جنبًا إلى جنبٍ ويُشار إلى الفائز.
 *
 * وكلُّ بديلٍ هنا **مشتقٌّ لا مخترَع**: لا لونَ خارج الرموز، ولا مقاسَ من الهواء.
 * الفرقُ بينها في الترتيب والوزن والفراغ وحدها.
 *
 * (حلّ محلَّ مختبر قياس الصوت، وقد أدّى غرضَه: النمطُ حُسم بالطبقتين.)
 */

type Variant = { key: string; name: string; note: string };

const ROWS: Variant[] = [
  { key: "a", name: "الحاليّ", note: "بطاقةٌ محاطة، زرُّ التشغيل في الصدارة" },
  { key: "b", name: "صفٌّ عارٍ", note: "بلا إطار، فاصلٌ رفيع، والعنوانُ أكبر" },
  { key: "c", name: "غلافٌ يتصدّر", note: "صورةُ البرنامج تسبق، والتشغيلُ في الذيل" },
];

const BARS: Variant[] = [
  { key: "a", name: "الحاليّ", note: "بطاقةٌ عائمةٌ بظلٍّ وهامشين" },
  { key: "b", name: "ملتصق", note: "يمتدّ للحافّتين ويجلس على شريط التبويبات" },
  { key: "c", name: "غلافٌ كبير", note: "غلافٌ ٤٨، وسطران، وزرٌّ دائريّ" },
];

export default function DesignLab() {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void getEpisodes(1).then(({ data }) => setEpisode(data[0] ?? null));
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <T size="3xl" weight="bold">
          المعرض
        </T>
        <T size="sm" color={color.textMuted}>
          انظر وقل رقمًا
        </T>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <TrackSwitch />

        {!episode ? <Note>جارٍ التحميل</Note> : null}

        {episode ? (
          <>
            <Section title="صفُّ الحلقة" hint="يتكرّر في المحطّة والأنشطة والحجوزات، فهو أكثرُ ما تراه" />
            {ROWS.map((v, i) => (
              <Labelled key={v.key} index={i + 1} name={v.name} note={v.note}>
                <EpisodeRowVariant variant={v.key} episode={episode} />
              </Labelled>
            ))}

            <Section title="الشريط الملازم" hint="توقيعُ التطبيق: يرافقك بين التبويبات" />
            {BARS.map((v, i) => (
              <Labelled key={v.key} index={i + 1} name={v.name} note={v.note}>
                <MiniVariant variant={v.key} episode={episode} />
              </Labelled>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * بابُ الاختبار المقصود: يفتح تسجيلَ الزيارات وأنت على جهاز التطوير.
 *
 * وهو مغلقٌ افتراضًا لأنّ إحصاءَ الموقع سجلُّ جمهورٍ لا سجلُّ عمل: كلُّ إعادةِ تحميلٍ
 * أثناء البناء زيارةٌ كاذبةٌ تُفسد المتوسّطات. والويبُ يفتحه بمفتاحٍ في `sessionStorage`،
 * وههنا بإصبعك. (هذا التبويبُ لا يظهر في نسخة الإنتاج أصلًا.)
 */
function TrackSwitch() {
  const [on, setOn] = useState(() => readPref(TRACK_DEV_KEY) === "1");

  return (
    <Pressable
      style={styles.track}
      onPress={() => {
        const next = !on;
        setOn(next);
        writePref(TRACK_DEV_KEY, next ? "1" : "0");
      }}
    >
      <View style={{ flex: 1, gap: space[1] }}>
        <T size="base" weight="medium">
          سجّل زياراتي في الإحصاء الحيّ
        </T>
        <T size="xs" color={color.textMuted}>
          {on ? "مفتوح: ما تفتحه الآن يُكتب في إحصاء الموقع" : "مغلق: التطويرُ لا يُحسب زيارة"}
        </T>
      </View>
      <View style={[styles.pill, on && styles.pillOn]}>
        <T size="xs" weight="medium" color={on ? color.onPrimary : color.textMuted}>
          {on ? "مفتوح" : "مغلق"}
        </T>
      </View>
    </Pressable>
  );
}

function Section({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={styles.section}>
      <T size="xl" weight="bold">
        {title}
      </T>
      <T size="xs" color={color.textMuted}>
        {hint}
      </T>
    </View>
  );
}

function Labelled({ index, name, note, children }: { index: number; name: string; note: string; children: React.ReactNode }) {
  return (
    <View style={styles.slot}>
      <View style={styles.slotHead}>
        <View style={styles.num}>
          <T size="xs" weight="bold" latin color={color.onPrimary}>
            {String(index)}
          </T>
        </View>
        <T size="sm" weight="medium">
          {name}
        </T>
        <T size="xs" color={color.textMuted} style={{ flex: 1 }} numberOfLines={1}>
          {note}
        </T>
      </View>
      {children}
    </View>
  );
}

/* ═══════════════ صفُّ الحلقة ═══════════════ */

function EpisodeRowVariant({ variant, episode }: { variant: string; episode: Episode }) {
  const tint = toneColor[episode.tone];

  if (variant === "b") {
    return (
      <View style={rowB.wrap}>
        <View style={rowB.row}>
          <View style={{ flex: 1, gap: space[1] }}>
            <T size="lg" weight="bold" numberOfLines={1}>
              {episode.title}
            </T>
            <T size="xs" color={color.textMuted}>
              {`${episode.showTitle}  ·  ${clock(episode.seconds ?? 0)}`}
            </T>
          </View>
          <Pressable style={[rowB.play, { borderColor: tint }]}>
            <PlayIcon size={20} color={tint} />
          </Pressable>
        </View>
        <View style={rowB.rule} />
      </View>
    );
  }

  if (variant === "c") {
    return (
      <View style={rowC.card}>
        {episode.coverUrl ? (
          <Image source={{ uri: episode.coverUrl }} style={rowC.cover} contentFit="cover" />
        ) : (
          <View style={[rowC.cover, { backgroundColor: tint }]} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <T size="base" weight="bold" numberOfLines={1}>
            {episode.title}
          </T>
          <T size="xs" color={color.textMuted} numberOfLines={1}>
            {`${episode.showTitle}، الحلقة ${episode.number}`}
          </T>
          <T size="xs" latin color={color.textMuted}>
            {clock(episode.seconds ?? 0)}
          </T>
        </View>
        <Pressable style={[rowC.play, { backgroundColor: tint }]}>
          <PlayIcon size={20} color={color.onPrimary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={rowA.card}>
      <View style={[rowA.btn, { backgroundColor: color.surface2 }]}>
        <PlayIcon size={22} color={tint} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T size="base" weight="medium" numberOfLines={1}>
          {episode.title}
        </T>
        <T size="xs" color={color.textMuted} numberOfLines={1}>
          {`${episode.showTitle}، الحلقة ${episode.number}`}
        </T>
      </View>
      <T size="xs" latin color={color.textMuted}>
        {clock(episode.seconds ?? 0)}
      </T>
    </View>
  );
}

/* ═══════════════ الشريط الملازم ═══════════════ */

function MiniVariant({ variant, episode }: { variant: string; episode: Episode }) {
  const tint = toneColor[episode.tone];
  const cover = episode.coverUrl ? (
    <Image source={{ uri: episode.coverUrl }} style={variant === "c" ? miniC.cover : miniA.cover} contentFit="cover" />
  ) : (
    <View style={[variant === "c" ? miniC.cover : miniA.cover, { backgroundColor: tint }]} />
  );

  if (variant === "b") {
    return (
      <View style={miniB.bar}>
        <View style={miniB.track}>
          <View style={[miniB.fill, { width: "38%", backgroundColor: tint }]} />
        </View>
        <View style={miniA.body}>
          {cover}
          <View style={{ flex: 1, gap: 2 }}>
            <T size="sm" weight="medium" numberOfLines={1}>
              {episode.title}
            </T>
            <T size="xs" color={color.textMuted} numberOfLines={1}>
              {episode.showTitle}
            </T>
          </View>
          <View style={miniA.btn}>
            <PauseIcon size={26} color={tint} />
          </View>
        </View>
      </View>
    );
  }

  if (variant === "c") {
    return (
      <View style={miniC.bar}>
        {cover}
        <View style={{ flex: 1, gap: 2 }}>
          <T size="sm" weight="bold" numberOfLines={1}>
            {episode.title}
          </T>
          <T size="xs" color={color.textMuted} numberOfLines={1}>
            {`${episode.showTitle}  ·  ${clock(episode.seconds ?? 0)}`}
          </T>
        </View>
        <View style={[miniC.round, { backgroundColor: tint }]}>
          <PauseIcon size={22} color={color.onPrimary} />
        </View>
      </View>
    );
  }

  return (
    <View style={miniA.bar}>
      <View style={miniB.track}>
        <View style={[miniB.fill, { width: "38%", backgroundColor: tint }]} />
      </View>
      <View style={miniA.body}>
        {cover}
        <View style={{ flex: 1, gap: 2 }}>
          <T size="sm" weight="medium" numberOfLines={1}>
            {episode.title}
          </T>
          <T size="xs" color={color.textMuted} numberOfLines={1}>
            {episode.showTitle}
          </T>
        </View>
        <View style={miniA.btn}>
          <PauseIcon size={26} color={tint} />
        </View>
      </View>
    </View>
  );
}

/* ═══════════════ الأنماط ═══════════════ */

const card = {
  backgroundColor: color.surface,
  borderRadius: radius.base,
  borderWidth: stroke.w,
  borderColor: color.cardStroke,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  head: { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[2], gap: space[1] },
  body: { paddingHorizontal: space[5], paddingBottom: space[16], gap: space[3] },
  section: { marginTop: space[6], gap: space[1] },
  slot: { gap: space[2] },
  slotHead: { flexDirection: "row", alignItems: "center", gap: space[2] },
  track: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    minHeight: TOUCH,
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    padding: space[4],
  },
  pill: {
    borderRadius: radius.full,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  pillOn: { backgroundColor: color.primary, borderColor: color.primary },
  num: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});

const rowA = StyleSheet.create({
  card: { ...card, flexDirection: "row", alignItems: "center", gap: space[3], padding: space[3] },
  btn: { width: TOUCH, height: TOUCH, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
});

const rowB = StyleSheet.create({
  wrap: { gap: space[3] },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[1] },
  play: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: radius.full,
    borderWidth: stroke.w,
    alignItems: "center",
    justifyContent: "center",
  },
  rule: { height: 1, backgroundColor: color.border },
});

const rowC = StyleSheet.create({
  card: { ...card, flexDirection: "row", alignItems: "center", gap: space[3], padding: space[2] },
  cover: { width: 56, height: 56, borderRadius: radius.nested },
  play: { width: TOUCH, height: TOUCH, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
});

const miniA = StyleSheet.create({
  bar: { ...card, height: MINI_H, overflow: "hidden", ...shadow("md") },
  body: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: space[3], gap: space[3] },
  cover: { width: 38, height: 38, borderRadius: radius.sm },
  btn: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" },
});

const miniB = StyleSheet.create({
  bar: {
    height: MINI_H,
    backgroundColor: color.surface,
    borderTopWidth: stroke.w,
    borderColor: color.cardStroke,
    marginHorizontal: -space[5],
    overflow: "hidden",
  },
  track: { height: 3, backgroundColor: color.neutral[200], flexDirection: "row-reverse" },
  fill: { height: 3 },
});

const miniC = StyleSheet.create({
  bar: { ...card, flexDirection: "row", alignItems: "center", gap: space[3], padding: space[2], ...shadow("md") },
  cover: { width: 48, height: 48, borderRadius: radius.nested },
  round: { width: TOUCH, height: TOUCH, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
});
