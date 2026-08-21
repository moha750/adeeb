import { verifyUrl } from "@adeeb/core/certificates";
import { color, radius, space, stroke } from "@adeeb/theme-native";
import { useRouter } from "expo-router";
import { ArrowSquareOutIcon, CaretDownIcon, CertificateIcon, SealCheckIcon, WarningIcon } from "@/ui/glyphs";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMyMembership, type Membership } from "@/lib/membership";
import { TOUCH } from "@/ui/layout";
import { Note } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * عضويّتي.
 *
 * وهي أوّلُ غرفةٍ من غرف العضو تنزل إلى التطبيق، وتقول ثلاثةً: **من أنت في أديب اليوم**
 * (رتبةٌ ووحدةٌ وحالة)، **وكيف صرتَ إليه** (المسيرةُ محطّاتٍ من الانضمام إلى آخر منصب)،
 * **وما عليك ولك** (إنذاراتٌ سارية، وشهاداتٌ صارت ملكَك تُنزّلها متى شئت).
 *
 * ولا شيءَ ههنا يُحسَب في الشاشة: المدّةُ والجملةُ والرتبةُ ومفرداتُ الحالة كلُّها من
 * النواة، فما تقرؤه هنا هو نفسُه ما تقرؤه في اللوحة بلا حرفٍ يفترق.
 */
export default function MembershipScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Membership | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void getMyMembership().then((res) => {
      if (!alive) return;
      setData(res.data);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Wrap top={insets.top} onClose={() => router.back()}>
      {loading ? <ActivityIndicator color={color.primary} /> : null}
      {error ? <Note tone="danger">{`تعذّرت القراءة: ${error}`}</Note> : null}
      {!loading && !error && !data ? <Note>لا سجلّ عضويّةٍ لحسابك.</Note> : null}

      {data ? (
        <>
          {/* ══ من أنت اليوم ══ */}
          <View style={styles.card}>
            <T size="2xl" weight="bold">
              {data.name}
            </T>
            {data.role ? (
              <T size="base" color={color.primary}>
                {data.role}
              </T>
            ) : null}
            <View style={styles.facts}>
              <Chip tone={data.status === "active" ? "ok" : "muted"} text={data.statusLabel} />
              {data.joined ? <Chip tone="muted" text={`انضممتَ ${data.joined}`} /> : null}
              {data.duration ? <Chip tone="muted" text={`منذ ${data.duration}`} /> : null}
            </View>
          </View>

          {/* ══ المسيرة ══ */}
          {data.journey.length ? (
            <View style={styles.block}>
              <T size="lg" weight="bold">
                مسيرتي
              </T>
              {data.journey.map((stop) => (
                <View key={stop.key} style={styles.stop}>
                  {/* الخيطُ والنقطة: المحطّةُ القائمةُ تُملأ، وما مضى يبقى مرسومًا لا ممحوًّا */}
                  <View style={styles.rail}>
                    <View style={[styles.dot, stop.current && styles.dotOn]} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T size="base" weight="medium">
                      {stop.title}
                    </T>
                    {stop.scope ? (
                      <T size="sm" color={color.textMuted}>
                        {stop.scope}
                      </T>
                    ) : null}
                    <T size="xs" color={color.textMuted}>
                      {stop.date}
                    </T>
                  </View>
                  {stop.current ? <SealCheckIcon size={18} color={color.success_} weight="fill" /> : null}
                </View>
              ))}
            </View>
          ) : null}

          {/* ══ الإنذارات ══ */}
          {data.warnings.length ? (
            <View style={styles.block}>
              <T size="lg" weight="bold">
                إنذاراتي
              </T>
              <T size="xs" color={color.textMuted}>
                {`${data.warnings.length} من ${data.warningLimit}، وبلوغُ الحدّ يسحب العضويّة`}
              </T>
              {data.warnings.map((w) => (
                <View key={w.id} style={styles.warn}>
                  <WarningIcon size={18} color={color.danger_} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T size="sm" weight="medium">
                      {`الإنذار ${w.ordinal}: ${w.category}`}
                    </T>
                    <T size="sm" color={color.textMuted}>
                      {w.reason}
                    </T>
                    <T size="xs" color={color.textMuted}>
                      {w.date}
                    </T>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* ══ الشهادات ══ */}
          {data.certificates.length ? (
            <View style={styles.block}>
              <T size="lg" weight="bold">
                شهاداتي
              </T>
              {/*
                الورقةُ نفسُها تُرسَم على قماش المتصفّح (قالبٌ ٣٥٠٨×٢٤٨٠)، ولا رسّامَ له في
                الأصيل. فلا يُعاد بناؤه ههنا: يُفتح **عنوانُها العلنيّ** فيرى صاحبُها
                شهادتَه موثَّقةً ويشاركها كما هي، ويبقى تنزيلُ الورقة في اللوحة.
              */}
              {data.certificates.map((c) => (
                <Pressable key={c.id} style={styles.cert} onPress={() => void Linking.openURL(verifyUrl(c.serial))}>
                  <CertificateIcon size={20} color={color.primary} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T size="base" weight="medium">
                      {c.positionTitle}
                    </T>
                    <T size="sm" color={color.textMuted}>
                      {`${c.periodFrom} إلى ${c.periodTo}`}
                    </T>
                    <T size="xs" color={color.textMuted} latin>
                      {c.serial}
                    </T>
                  </View>
                  <ArrowSquareOutIcon size={18} color={color.textMuted} />
                </Pressable>
              ))}
              <T size="xs" color={color.textMuted}>
                اضغط شهادةً لتفتح صفحةَ التحقّق العلنيّة بها
              </T>
            </View>
          ) : null}
        </>
      ) : null}
    </Wrap>
  );
}

function Chip({ text, tone }: { text: string; tone: "ok" | "muted" }) {
  return (
    <View style={[styles.chip, tone === "ok" && styles.chipOk]}>
      <T size="xs" color={tone === "ok" ? color.success_ : color.textMuted}>
        {text}
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

const card = {
  backgroundColor: color.surface,
  borderRadius: radius.base,
  borderWidth: stroke.w,
  borderColor: color.cardStroke,
  padding: space[4],
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  close: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center", marginInlineStart: space[3] },
  body: { paddingHorizontal: space[5], paddingBottom: space[10], gap: space[3] },
  card: { ...card, gap: space[2] },
  block: { ...card, gap: space[3] },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  chip: {
    backgroundColor: color.surface2,
    borderRadius: radius.full,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  chipOk: { backgroundColor: color.successSoft },
  stop: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  rail: { width: 12, alignItems: "center", paddingTop: 6 },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    backgroundColor: color.surface,
  },
  dotOn: { backgroundColor: color.success_, borderColor: color.success_ },
  warn: { flexDirection: "row", alignItems: "flex-start", gap: space[2] },
  cert: { flexDirection: "row", alignItems: "center", gap: space[2], minHeight: TOUCH },
});
