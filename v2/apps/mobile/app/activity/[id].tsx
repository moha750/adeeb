import { TYPE_META, type ActivityType } from "@adeeb/core/activities";
import { color, radius, space, stroke } from "@adeeb/theme-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretDownIcon, MapPinIcon, SealCheckIcon } from "phosphor-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { signInWithApple } from "@/auth/appleSignIn";
import { useAuth } from "@/auth/AuthProvider";
import { getActivity, getSeats, type ActivityDetail, type Seats } from "@/lib/activities";
import { bookSeat, cancelBooking, getMyBooking, type Booking } from "@/lib/booking";
import { ProfileForm } from "@/ui/ProfileForm";
import { TOUCH } from "@/ui/layout";
import { Note } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * صفحةُ النشاط والحجز.
 *
 * **والمقاعدُ ثلاثةُ أحوالٍ لا حالان** كما تُخزّنها القاعدة: بلا حدٍّ أصلًا، أو حوضٌ
 * مشترَكٌ بعدّادٍ واحد، أو مقسومٌ بالجنس لكلّ فئةٍ عدّادُها. وإظهارُ «المتبقّي» رقمًا
 * واحدًا في الحال الثالثة يكذب على نصف الناس.
 *
 * وبابُ الحجز يمرّ بثلاث بواباتٍ بالترتيب: حسابٌ ← بيانٌ فيه جنسُك ← مقعدٌ متاح.
 * وكلُّها تُعاد فحصًا في القاعدة، وما هنا تيسيرٌ للفهم لا حراسة.
 */
export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile, refreshProfile } = useAuth();

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [seats, setSeats] = useState<Seats | null>(null);
  const [mine, setMine] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    const [{ data, error }, s] = await Promise.all([getActivity(id), getSeats(id)]);
    setActivity(data);
    setError(error);
    setSeats(s);
    setMine(session ? await getMyBooking(id) : null);
  }, [id, session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (error) return <Wrap top={insets.top} onClose={() => router.back()}><Note tone="danger">{`تعذّرت القراءة: ${error}`}</Note></Wrap>;
  if (!activity) return <Wrap top={insets.top} onClose={() => router.back()}><Note>جارٍ التحميل</Note></Wrap>;

  const typeLabel = TYPE_META[activity.activityType as ActivityType]?.label ?? activity.activityType;

  /** المتبقّي كما يخصّ هذا الشخصَ لا كما يخصّ الجميع. */
  const remaining =
    seats === null
      ? null
      : seats.mode === "unlimited"
        ? null
        : seats.mode === "shared"
          ? seats.totalRemaining
          : profile?.gender === "female"
            ? seats.femaleRemaining
            : profile?.gender === "male"
              ? seats.maleRemaining
              : null;

  const onBook = async () => {
    setBusy(true);
    const res = await bookSeat(activity.id);
    setBusy(false);
    if (!res.ok) Alert.alert("تعذّر الحجز", res.message);
    else await reload();
  };

  const onCancel = () => {
    Alert.alert("إلغاء الحجز", "أتلغي مقعدك في هذه الفعاليّة؟", [
      { text: "تراجع", style: "cancel" },
      {
        text: "ألغِ",
        style: "destructive",
        onPress: async () => {
          if (!mine) return;
          setBusy(true);
          const res = await cancelBooking(mine.id, "إلغاء من التطبيق");
          setBusy(false);
          if (!res.ok) Alert.alert("تعذّر الإلغاء", res.message);
          else await reload();
        },
      },
    ]);
  };

  return (
    <Wrap top={insets.top} onClose={() => router.back()}>
      {activity.coverImageUrl ? (
        <Image source={{ uri: activity.coverImageUrl }} style={styles.cover} contentFit="cover" transition={140} />
      ) : null}

      <View style={styles.head}>
        <T size="xs" color={color.textMuted}>
          {typeLabel}
        </T>
        <T size="2xl" weight="bold">
          {activity.name}
        </T>
        <T size="sm" color={color.textMuted}>
          {`${activity.date} الساعة ${activity.startTime}${activity.endTime ? ` إلى ${activity.endTime}` : ""}`}
        </T>
      </View>

      {activity.location ? (
        <Pressable
          style={styles.place}
          disabled={!activity.locationUrl}
          onPress={() => activity.locationUrl && void Linking.openURL(activity.locationUrl)}
        >
          <MapPinIcon size={20} color={color.primary} />
          <T size="sm" style={{ flex: 1 }}>
            {activity.location}
          </T>
        </Pressable>
      ) : null}

      {activity.description ? (
        <View style={styles.block}>
          <T size="sm" leading="relaxed" color={color.textMuted}>
            {activity.description}
          </T>
        </View>
      ) : null}

      {/* ══ الحجز ══ */}
      {activity.isCancelled ? (
        <Note tone="danger">أُلغيت هذه الفعاليّة.</Note>
      ) : mine ? (
        <View style={styles.booked}>
          <SealCheckIcon size={22} color={color.success_} weight="fill" />
          <T size="base" weight="medium" color={color.success_} style={{ flex: 1 }}>
            مقعدُك محجوز
          </T>
          <Pressable onPress={onCancel} hitSlop={8} disabled={busy}>
            <T size="sm" color={color.danger_}>
              إلغاء
            </T>
          </Pressable>
        </View>
      ) : !session ? (
        <Pressable
          style={styles.cta}
          onPress={async () => {
            const res = await signInWithApple();
            if (!res.ok && !("cancelled" in res)) Alert.alert("تعذّر الدخول", res.message);
          }}
        >
          <T size="base" weight="medium" color={color.onPrimary}>
            ادخل بأبل لتحجز
          </T>
        </Pressable>
      ) : !profile?.gender ? (
        <ProfileForm
          onDone={async () => {
            await refreshProfile();
            await reload();
          }}
        />
      ) : remaining !== null && remaining <= 0 ? (
        <Note tone="danger">اكتملت المقاعد.</Note>
      ) : (
        <>
          {remaining !== null ? (
            <T size="sm" color={color.textMuted}>
              {`المتبقّي ${remaining} مقعدًا`}
            </T>
          ) : null}
          <Pressable style={styles.cta} onPress={() => void onBook()} disabled={busy}>
            <T size="base" weight="medium" color={color.onPrimary}>
              {busy ? "جارٍ الحجز" : "احجز مقعدي"}
            </T>
          </Pressable>
        </>
      )}
    </Wrap>
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
  cover: { width: "100%", height: 180, borderRadius: radius.base },
  head: { gap: space[1] },
  place: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: TOUCH,
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    paddingHorizontal: space[3],
  },
  block: {
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    padding: space[4],
  },
  booked: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    backgroundColor: color.successSoft,
    borderRadius: radius.base,
    padding: space[4],
  },
  cta: {
    minHeight: TOUCH + 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.base,
    backgroundColor: color.primary,
  },
});
