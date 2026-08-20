import { color, radius, space, stroke } from "@adeeb/theme-native";
import { useRouter } from "expo-router";
import { AppleLogoIcon, CalendarCheckIcon, CaretLeftIcon, ClipboardTextIcon, IdentificationCardIcon, SignOutIcon, UserIcon, UserMinusIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";

import { appleAvailable, signInWithApple } from "@/auth/appleSignIn";
import { useAuth } from "@/auth/AuthProvider";
import { getMyBookings, type Booking } from "@/lib/booking";
import { cancelDeletion, dueLabel, getMyDeletion, requestDeletion } from "@/lib/deletion";
import { TOUCH } from "@/ui/layout";
import { Note, Screen } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * بابُ الحساب.
 *
 * **والدخولُ بأبل وحدَه اليوم**، لا تكاسلًا: حاجزُ Turnstile مفعَّلٌ على مستوى GoTrue
 * فيردّ الدخولَ بالبريد من أيّ عميل، و`id_token` وحدَه يمرّ. وقوقلُ ينتظر معرِّفَ عميلٍ
 * لنظام iOS يُنشَأ في لوحة قوقل.
 */
export default function MeScreen() {
  const router = useRouter();
  const { session, user, profile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [canApple, setCanApple] = useState(false);

  useEffect(() => {
    void appleAvailable().then(setCanApple);
  }, []);

  if (session === undefined) {
    return (
      <Screen title="حسابي">
        <ActivityIndicator color={color.primary} />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen title="حسابي" subtitle="ادخل لتحجز مقعدك">
        <Note>الإذاعةُ والأنشطةُ تُقرآن بلا حساب. والحسابُ للحجز وعضويّتك.</Note>

        {canApple ? (
          <Pressable
            style={styles.apple}
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              const res = await signInWithApple();
              setBusy(false);
              if (!res.ok && !("cancelled" in res)) Alert.alert("تعذّر الدخول", res.message);
            }}
          >
            <AppleLogoIcon size={22} color={color.onPrimary} weight="fill" />
            <T size="base" weight="medium" color={color.onPrimary}>
              الدخول بحساب أبل
            </T>
          </Pressable>
        ) : (
          <Note tone="danger">هذا الجهاز لا يدعم الدخولَ بأبل.</Note>
        )}
      </Screen>
    );
  }

  return (
    <Screen title="حسابي">
      <View style={styles.card}>
        <View style={styles.who}>
          <View style={styles.avatar}>
            <UserIcon size={26} color={color.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T size="lg" weight="bold">
              {profile?.fullName ?? "بلا اسم بعد"}
            </T>
            <T size="xs" color={color.textMuted} numberOfLines={1}>
              {user?.email ?? ""}
            </T>
          </View>
        </View>

        {profile?.isMember ? (
          <T size="sm" color={color.success_}>
            عضوٌ في نادي أديب
          </T>
        ) : (
          <T size="sm" color={color.textMuted}>
            حسابُ زائر. والعضويّةُ بابُها في الموقع.
          </T>
        )}
      </View>

      {/* بابُ العضويّة لا يُفتح لزائر: لا سجلَّ وراءه فيرى غرفةً فارغةً تُوهمه بنقص */}
      {profile?.isMember ? (
        <Pressable style={styles.room} onPress={() => router.push("/membership")}>
          <IdentificationCardIcon size={22} color={color.primary} />
          <View style={{ flex: 1 }}>
            <T size="base" weight="medium">
              عضويّتي
            </T>
            <T size="xs" color={color.textMuted}>
              منصبُك ومسيرتُك وإنذاراتُك وشهاداتُك
            </T>
          </View>
          <CaretLeftIcon size={18} color={color.textMuted} />
        </Pressable>
      ) : null}

      {profile?.isMember ? (
        <Pressable style={styles.room} onPress={() => router.push("/tasks")}>
          <ClipboardTextIcon size={22} color={color.primary} />
          <View style={{ flex: 1 }}>
            <T size="base" weight="medium">
              مهامّي
            </T>
            <T size="xs" color={color.textMuted}>
              ما أُسنِد إليك، وتسليمُه من هنا
            </T>
          </View>
          <CaretLeftIcon size={18} color={color.textMuted} />
        </Pressable>
      ) : null}

      <MyBookings />

      <DeleteAccount />

      <Pressable style={styles.signOut} onPress={() => void signOut()}>
        <SignOutIcon size={20} color={color.danger_} />
        <T size="sm" weight="medium" color={color.danger_}>
          خروج
        </T>
      </Pressable>
    </Screen>
  );
}

/**
 * بابُ حذف الحساب — شرطُ أبل، ونصُّه نصُّ الويب نفسُه (`v2/ACCOUNT-DELETION.md`).
 *
 * والتأكيدُ بنافذةِ النظام لا بحقلِ كلمةِ مرور: من دخل بأبل لا كلمةَ مرورٍ له تُثبِته،
 * وإثباتُه أنّ الجهازَ في يده وقد فتحه بوجهه. ويُقال له ما يقع كاملًا قبل أن يضغط.
 */
function DeleteAccount() {
  const [due, setDue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const read = () => {
    void getMyDeletion().then((d) => setDue(d.requestedAt ? d.dueAt : null));
  };
  useEffect(read, []);

  if (busy) return <ActivityIndicator color={color.primary} />;

  if (due) {
    return (
      <>
        <Note tone="danger">{`حسابُك يُحذف في ${dueLabel(due) ?? "موعده"}. ولك أن تعدل إلى ذلك اليوم.`}</Note>
        <Pressable
          style={styles.signOut}
          onPress={async () => {
            setBusy(true);
            const res = await cancelDeletion();
            setBusy(false);
            if (res.ok) setDue(null);
            else Alert.alert("تعذّر", res.message);
          }}
        >
          <T size="sm" weight="medium" color={color.primary}>
            ألغِ طلب الحذف
          </T>
        </Pressable>
      </>
    );
  }

  return (
    <Pressable
      style={styles.signOut}
      onPress={() =>
        Alert.alert(
          "حذف الحساب",
          "بعد ثلاثين يومًا يُغلَق حسابُك ولا يُفتَح: لا دخول، ولا صفحةَ علنيّة، ولا رسائل. ويبقى في سجلّ النادي ما شاركتَ فيه. ولك أن تعدل خلال المهلة.",
          [
            { text: "تراجع", style: "cancel" },
            {
              text: "احذف حسابي",
              style: "destructive",
              onPress: async () => {
                setBusy(true);
                const res = await requestDeletion();
                setBusy(false);
                if (res.ok) read();
                else Alert.alert("تعذّر الحذف", res.message);
              },
            },
          ],
        )
      }
    >
      <UserMinusIcon size={20} color={color.danger_} />
      <T size="sm" weight="medium" color={color.danger_}>
        حذف الحساب
      </T>
    </Pressable>
  );
}

/** حجوزاتي — يقرؤها صاحبُها وحدَه بسياسة `reservations_select_own`. */
function MyBookings() {
  const [items, setItems] = useState<Booking[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    void getMyBookings().then(({ data }) => setItems(data));
  }, []);

  if (!items) return null;
  if (items.length === 0) return <Note>لا حجوزَ لك بعد.</Note>;

  return (
    <>
      <T size="lg" weight="bold">
        حجوزاتي
      </T>
      {items.map((b) => (
        <Pressable key={b.id} style={styles.booking} onPress={() => router.push(`/activity/${b.activityId}`)}>
          <CalendarCheckIcon size={22} color={color.primary} />
          <View style={{ flex: 1, gap: 2 }}>
            <T size="base" weight="medium" numberOfLines={1}>
              {b.activityName}
            </T>
            <T size="xs" color={color.textMuted}>
              {`${b.date} الساعة ${b.startTime}`}
            </T>
          </View>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  apple: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    minHeight: TOUCH + 6,
    borderRadius: radius.base,
    backgroundColor: color.text,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    padding: space[4],
    gap: space[3],
  },
  who: { flexDirection: "row", alignItems: "center", gap: space[3] },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: color.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  booking: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    padding: space[3],
  },
  room: {
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
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    minHeight: TOUCH,
    marginTop: space[4],
  },
});
