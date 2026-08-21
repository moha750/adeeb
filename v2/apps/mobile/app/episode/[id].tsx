import { color, radius, space, stroke } from "@adeeb/theme-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretDownIcon, HeartIcon, YoutubeLogoIcon } from "@/ui/glyphs";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isLiked, toggleLike } from "@/lib/countPlay";
import { getEpisode, type Episode } from "@/lib/radio";
import { PlayerControls } from "@/player/PlayerControls";
import { useRadioPlayer } from "@/player/PlayerProvider";
import { toneColor, toneSoft } from "@/player/tones";
import { TOUCH } from "@/ui/layout";
import { Note } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * صفحةُ الحلقة.
 *
 * وهي **السطحُ الداخليّ** الذي يكفّ عنده الشريطُ الملازم: هنا زمامٌ كاملٌ أمام العين،
 * فشريطٌ مصغّرٌ فوقه تكرارٌ يسرق سطرًا. تُرفَع الرايةُ عند الدخول وتُنزَل عند الخروج،
 * وهو نفسُ قرار الويب (`INLINE_PLAYER`).
 */
export default function EpisodeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { current, play, isCurrent, setInlineVisible } = useRadioPlayer();

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);

  useEffect(() => {
    setInlineVisible(true);
    return () => setInlineVisible(false);
  }, [setInlineVisible]);

  useEffect(() => {
    if (!id) return;
    void getEpisode(id).then(({ data, error }) => {
      setError(error);
      setEpisode(data);
      if (data) {
        setLikes(data.likes);
        setLiked(isLiked(data.id));
      }
    });
  }, [id]);

  // الدخولُ من قائمةٍ لا يشغّل، والدخولُ إلى حلقةٍ عاملةٍ لا يعيدها من أوّلها
  const showing = isCurrent(episode?.id ?? "") ? current : episode;

  if (error) {
    return (
      <Wrap onClose={() => router.back()} top={insets.top}>
        <Note tone="danger">{`تعذّرت القراءة: ${error}`}</Note>
      </Wrap>
    );
  }
  if (!episode || !showing) {
    return (
      <Wrap onClose={() => router.back()} top={insets.top}>
        <Note>جارٍ التحميل</Note>
      </Wrap>
    );
  }

  const tint = toneColor[episode.tone];
  const onLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    const fresh = await toggleLike(episode.id);
    if (fresh !== null) setLikes(fresh);
  };

  return (
    <Wrap onClose={() => router.back()} top={insets.top}>
      <View style={[styles.hero, { backgroundColor: toneSoft[episode.tone] }]}>
        {episode.coverUrl ? (
          <Image source={{ uri: episode.coverUrl }} style={styles.cover} contentFit="cover" transition={140} />
        ) : (
          <View style={[styles.cover, { backgroundColor: tint }]} />
        )}
        <T size="xs" color={color.textMuted}>
          {`${episode.showTitle}، الحلقة ${episode.number}`}
        </T>
        <T size="2xl" weight="bold">
          {episode.title}
        </T>
      </View>

      {isCurrent(episode.id) ? (
        <PlayerControls />
      ) : (
        <Pressable onPress={() => play(episode)} style={[styles.start, { backgroundColor: tint }]}>
          <T size="base" weight="medium" color={color.onPrimary}>
            استمع
          </T>
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable onPress={() => void onLike()} hitSlop={8} style={styles.action} accessibilityLabel="إعجاب">
          <HeartIcon size={22} color={liked ? color.danger_ : color.textMuted} weight={liked ? "fill" : "duotone"} />
          <T size="sm" latin color={color.textMuted}>
            {String(likes)}
          </T>
        </Pressable>

        {episode.youtubeUrl ? (
          <Pressable
            onPress={() => void Linking.openURL(episode.youtubeUrl!)}
            hitSlop={8}
            style={styles.action}
            accessibilityLabel="شاهد على يوتيوب"
          >
            <YoutubeLogoIcon size={22} color={color.textMuted} />
            <T size="sm" color={color.textMuted}>
              يوتيوب
            </T>
          </Pressable>
        ) : null}
      </View>

      {episode.summary ? (
        <View style={styles.block}>
          <T size="sm" leading="relaxed" color={color.textMuted}>
            {episode.summary}
          </T>
        </View>
      ) : null}

      {episode.transcript ? <Transcript text={episode.transcript} /> : null}
    </Wrap>
  );
}

function Transcript({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.block}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.foldHead}>
        <T size="base" weight="medium">
          النصّ المكتوب
        </T>
        <CaretDownIcon size={18} color={color.textMuted} />
      </Pressable>
      {open ? (
        <T size="sm" leading="relaxed" color={color.textMuted}>
          {text}
        </T>
      ) : null}
    </View>
  );
}

function Wrap({ children, onClose, top }: { children: React.ReactNode; onClose: () => void; top: number }) {
  return (
    <View style={[styles.root, { paddingTop: top }]}>
      <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel="إغلاق">
        <CaretDownIcon size={24} color={color.text} />
      </Pressable>
      <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  close: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center", marginInlineStart: space[3] },
  body: { paddingHorizontal: space[5], paddingBottom: space[10], gap: space[4] },
  hero: { padding: space[4], borderRadius: radius.base, gap: space[2], borderWidth: stroke.w, borderColor: color.cardStroke },
  cover: { width: "100%", height: 180, borderRadius: radius.nested },
  start: { paddingVertical: space[4], borderRadius: radius.base, alignItems: "center" },
  actions: { flexDirection: "row", gap: space[5] },
  action: { flexDirection: "row", alignItems: "center", gap: space[2], minHeight: TOUCH },
  block: {
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    padding: space[4],
    gap: space[2],
  },
  foldHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: TOUCH },
});
