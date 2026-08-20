import { color, radius, space, stroke } from "@adeeb/theme-native";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { T } from "./T";

/** حاويةُ شاشةٍ بعنوانٍ، تحترم نتوءَ الشاشة أعلى وشريطَ التبويبات أسفل. */
export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <T size="3xl" weight="bold">
          {title}
        </T>
        {subtitle ? (
          <T size="sm" color={color.textMuted} style={styles.sub}>
            {subtitle}
          </T>
        ) : null}
      </View>

      <Body
        style={styles.body}
        contentContainerStyle={scroll ? { paddingBottom: space[8], gap: space[3] } : undefined}
      >
        {children}
      </Body>
    </View>
  );
}

/** بطاقةٌ بحدّ البطاقات الموحّد. */
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

/** سطرُ حالةٍ لحظةَ التحميل أو الخطأ. */
export function Note({ tone = "muted", children }: { tone?: "muted" | "danger"; children: string }) {
  return (
    <View style={[styles.note, tone === "danger" && styles.noteDanger]}>
      <T size="sm" color={tone === "danger" ? color.danger_ : color.textMuted}>
        {children}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  head: { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[3] },
  sub: { marginTop: space[1] },
  body: { flex: 1, paddingHorizontal: space[5] },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    padding: space[4],
    gap: space[2],
  },
  note: {
    backgroundColor: color.surface2,
    borderRadius: radius.base,
    padding: space[4],
  },
  noteDanger: { backgroundColor: color.dangerSoft },
});
