import { fmtDate } from "@adeeb/core/dates";
import { color, radius, space, stroke } from "@adeeb/theme-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraIcon, CaretDownIcon, ClockIcon, EyeIcon, HeartIcon, UserIcon } from "@/ui/glyphs";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getNewsItem, toBlocks, type NewsItem } from "@/lib/news";
import { TOUCH } from "@/ui/layout";
import { Note } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * صفحةُ الخبر.
 *
 * والمتنُ **يُقسَم كما يقسمه الويب**: فقراتٌ يفصلها سطرٌ فارغ، وبنودٌ تبدأ بـ«•» تُجمع
 * قائمةً. والقسمةُ نفسُها في `lib/news`، فلا تُكتب مرّتين ولا يفترق القارئان.
 */
export default function NewsItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [item, setItem] = useState<NewsItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void getNewsItem(id).then(({ data, error }) => {
      setItem(data);
      setError(error ?? (data ? null : "لم يُعثر على الخبر"));
    });
  }, [id]);

  if (error) {
    return (
      <Wrap top={insets.top} onClose={() => router.back()}>
        <Note tone="danger">{error}</Note>
      </Wrap>
    );
  }
  if (!item) {
    return (
      <Wrap top={insets.top} onClose={() => router.back()}>
        <Note>جارٍ التحميل</Note>
      </Wrap>
    );
  }

  return (
    <Wrap top={insets.top} onClose={() => router.back()}>
      <View style={styles.head}>
        <T size="xs" color={color.textMuted}>
          {item.categoryLabel}
        </T>
        <T size="2xl" weight="bold" leading="tight">
          {item.title}
        </T>
        {item.summary ? (
          <T size="base" leading="relaxed" color={color.textMuted}>
            {item.summary}
          </T>
        ) : null}
      </View>

      <View style={styles.facts}>
        <Fact icon={<ClockIcon size={14} color={color.textMuted} />} text={`${item.readMinutes} دقائق قراءة`} />
        <Fact icon={<EyeIcon size={14} color={color.textMuted} />} text={`${item.views} مشاهدة`} />
        {item.likes ? <Fact icon={<HeartIcon size={14} color={color.textMuted} />} text={`${item.likes} إعجاب`} /> : null}
        {item.authors.length ? (
          <Fact icon={<UserIcon size={14} color={color.textMuted} />} text={item.authors.join("، ")} />
        ) : null}
      </View>
      {item.publishedAt ? (
        <T size="xs" color={color.textMuted}>
          {fmtDate(item.publishedAt)}
        </T>
      ) : null}

      {item.cover ? (
        <View>
          <Image source={{ uri: item.cover }} style={styles.cover} contentFit="cover" transition={140} />
          {item.coverPhotographer ? <Lens name={item.coverPhotographer} /> : null}
        </View>
      ) : null}

      {item.content
        ? toBlocks(item.content).map((block, bi) => (
            <View key={bi} style={styles.block}>
              {block.prose.map((p, pi) => (
                <T key={pi} size="base" leading="relaxed">
                  {p}
                </T>
              ))}
              {block.bullets.map((b, li) => (
                <View key={li} style={styles.bullet}>
                  <View style={styles.dot} />
                  <T size="base" leading="relaxed" style={{ flex: 1 }}>
                    {b}
                  </T>
                </View>
              ))}
            </View>
          ))
        : null}

      {item.gallery.length ? (
        <View style={styles.gallery}>
          <T size="lg" weight="bold">
            معرض الصور
          </T>
          {item.gallery.map((src, i) => (
            <View key={src}>
              <Image source={{ uri: src }} style={styles.shot} contentFit="cover" transition={140} />
              {item.galleryPhotographers[i] ? <Lens name={item.galleryPhotographers[i]} /> : null}
            </View>
          ))}
        </View>
      ) : null}

      {item.tags.length ? (
        <View style={styles.tags}>
          {item.tags.map((t) => (
            <View key={t} style={styles.tag}>
              <T size="xs" color={color.textMuted}>
                {t}
              </T>
            </View>
          ))}
        </View>
      ) : null}
    </Wrap>
  );
}

function Fact({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.fact}>
      {icon}
      <T size="xs" color={color.textMuted}>
        {text}
      </T>
    </View>
  );
}

/** نسبةُ الصورة إلى عدسةِ صاحبها، كما ينسبها الموقع. */
function Lens({ name }: { name: string }) {
  return (
    <View style={styles.fact}>
      <CameraIcon size={14} color={color.textMuted} />
      <T size="xs" color={color.textMuted}>
        {`عدسة ${name}`}
      </T>
    </View>
  );
}

function Wrap({ children, onClose, top }: { children: React.ReactNode; onClose: () => void; top: number }) {
  return (
    <View style={styles.root}>
      <View style={{ paddingTop: top }}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel="إغلاق">
          <CaretDownIcon size={24} color={color.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  close: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center", marginInlineStart: space[3] },
  body: { paddingHorizontal: space[5], paddingBottom: space[10], gap: space[3] },
  head: { gap: space[2] },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  fact: { flexDirection: "row", alignItems: "center", gap: space[1], marginTop: space[1] },
  cover: { width: "100%", height: 200, borderRadius: radius.base },
  block: { gap: space[2] },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: space[2] },
  dot: { width: 5, height: 5, borderRadius: 999, backgroundColor: color.textMuted, marginTop: 11 },
  gallery: { gap: space[3], marginTop: space[3] },
  shot: { width: "100%", height: 200, borderRadius: radius.base },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[2] },
  tag: {
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
});
