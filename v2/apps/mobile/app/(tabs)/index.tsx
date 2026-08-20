import { color, radius, space, stroke } from "@adeeb/theme-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { PauseIcon, PlayIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getEpisodes, getShows, getStation, type Episode, type Show, type Station } from "@/lib/radio";
import { useRadioPlayer } from "@/player/PlayerProvider";
import { clock, toneColor, toneSoft } from "@/player/tones";
import { MINI_H, TOUCH } from "@/ui/layout";
import { Note } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * محطّةُ الإذاعة.
 *
 * **الحلقةُ تُضغَط فتبدأ، وما بعدها في الصفّ يتبعها بلا نقرة.** وهذا ما يجعل هذا
 * القسمَ محطّةً تُذاع لا صفحةً تُفتح: `play(episode, rest)` يسلّم المشغّلَ بقيّةَ
 * القائمة، فتنتهي الحلقةُ فتليها أختُها.
 */
export default function StationScreen() {
  const [station, setStation] = useState<Station | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void getStation().then(setStation);
    void getShows().then(({ data }) => setShows(data));
    void getEpisodes().then(({ data, error }) => {
      setEpisodes(data);
      setError(error);
    });
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <T size="3xl" weight="bold">
          {station?.name ?? "الإذاعة"}
        </T>
        {station?.tagline ? (
          <T size="sm" color={color.textMuted}>
            {station.tagline}
          </T>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: MINI_H + space[6] }]}>
        {error ? <Note tone="danger">{`تعذّرت القراءة: ${error}`}</Note> : null}

        {shows.length > 0 ? (
          <>
            <T size="lg" weight="bold" style={styles.section}>
              البرامج
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {shows.map((show) => (
                <View key={show.id} style={[styles.showCard, { backgroundColor: toneSoft[show.tone] }]}>
                  {show.logoUrl ? (
                    <Image source={{ uri: show.logoUrl }} style={styles.showLogo} contentFit="cover" transition={120} />
                  ) : (
                    <View style={[styles.showLogo, { backgroundColor: toneColor[show.tone] }]} />
                  )}
                  <T size="sm" weight="bold" numberOfLines={1}>
                    {show.title}
                  </T>
                  {show.tagline ? (
                    <T size="xs" color={color.textMuted} numberOfLines={2}>
                      {show.tagline}
                    </T>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        <T size="lg" weight="bold" style={styles.section}>
          أحدث الحلقات
        </T>

        {!episodes && !error ? <Note>جارٍ التحميل</Note> : null}
        {episodes?.length === 0 ? <Note>لا حلقاتٍ منشورةً بعد</Note> : null}

        {episodes?.map((episode, i) => (
          <EpisodeRow key={episode.id} episode={episode} rest={episodes.slice(i + 1)} />
        ))}
      </ScrollView>
    </View>
  );
}

function EpisodeRow({ episode, rest }: { episode: Episode; rest: Episode[] }) {
  const { play, isCurrent, playing } = useRadioPlayer();
  const router = useRouter();

  const active = isCurrent(episode.id);
  const tint = toneColor[episode.tone];

  return (
    <Pressable style={styles.row} onPress={() => router.push(`/episode/${episode.id}`)}>
      <Pressable
        onPress={() => play(episode, rest)}
        hitSlop={8}
        style={[styles.rowBtn, { backgroundColor: active ? tint : color.surface2 }]}
        accessibilityLabel={active && playing ? "إيقاف" : "تشغيل"}
      >
        {active && playing ? (
          <PauseIcon size={22} color={color.onPrimary} />
        ) : (
          <PlayIcon size={22} color={active ? color.onPrimary : tint} />
        )}
      </Pressable>

      <View style={styles.rowText}>
        <T size="base" weight="medium" numberOfLines={1}>
          {episode.title}
        </T>
        <T size="xs" color={color.textMuted} numberOfLines={1}>
          {`${episode.showTitle}، الحلقة ${episode.number}`}
        </T>
      </View>

      {episode.seconds ? (
        <T size="xs" latin color={color.textMuted}>
          {clock(episode.seconds)}
        </T>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  head: { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[2], gap: space[1] },
  body: { paddingHorizontal: space[5], gap: space[2] },
  section: { marginTop: space[4], marginBottom: space[1] },
  strip: { gap: space[3], paddingBottom: space[1] },
  showCard: {
    width: 140,
    padding: space[3],
    gap: space[2],
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
  },
  showLogo: { width: "100%", height: 84, borderRadius: radius.nested },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    padding: space[3],
  },
  rowBtn: { width: TOUCH, height: TOUCH, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 2 },
});
