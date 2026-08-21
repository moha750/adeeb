import { fmtDate } from "@adeeb/core/dates";
import { color, radius, space, stroke } from "@adeeb/theme-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ClockIcon } from "@/ui/glyphs";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { getNews, type NewsItem } from "@/lib/news";
import { Note, Screen } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * قائمةُ الأخبار المنشورة، الأحدثُ أوّلًا.
 *
 * البابُ الثالثُ من أبواب الزائر: تُقرأ بمفتاح anon بلا حساب، كما تُقرأ الإذاعةُ والأنشطة.
 * والكرتُ هنا **غلافٌ فوق النصّ** لا كرتُ الأنشطة نفسُه: الخبرُ صورةٌ قبل أن يكون موعدًا.
 */
export default function NewsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getNews().then(({ data, error }) => {
      setItems(data);
      setError(error);
    });
  }, []);

  return (
    <Screen title="الأخبار" subtitle="مستجدّاتُ النادي أوّلًا بأوّل">
      {error ? <Note tone="danger">{`تعذّرت القراءة: ${error}`}</Note> : null}
      {!items && !error ? <Note>جارٍ التحميل</Note> : null}
      {items?.length === 0 ? <Note>لا أخبارَ منشورةً بعد</Note> : null}

      {items?.map((n) => (
        <Pressable key={n.id} onPress={() => router.push(`/news/${n.id}`)}>
          <View style={styles.card}>
            {n.cover ? (
              <Image source={{ uri: n.cover }} style={styles.cover} contentFit="cover" transition={140} />
            ) : null}
            <View style={styles.body}>
              <T size="xs" color={color.textMuted}>
                {n.categoryLabel}
              </T>
              <T size="lg" weight="bold" numberOfLines={3}>
                {n.title}
              </T>
              {n.summary ? (
                <T size="sm" color={color.textMuted} numberOfLines={2}>
                  {n.summary}
                </T>
              ) : null}
              <View style={styles.meta}>
                <T size="xs" color={color.textMuted}>
                  {fmtDate(n.publishedAt)}
                </T>
                <View style={styles.read}>
                  <ClockIcon size={14} color={color.textMuted} />
                  <T size="xs" color={color.textMuted}>
                    {`${n.readMinutes} دقائق قراءة`}
                  </T>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    overflow: "hidden",
  },
  cover: { width: "100%", height: 160 },
  body: { padding: space[4], gap: space[1] },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[2],
    marginTop: space[1],
  },
  read: { flexDirection: "row", alignItems: "center", gap: space[1] },
});
