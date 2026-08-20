import { color, radius, space, stroke } from "@adeeb/theme-native";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { createMyProfile } from "@/lib/booking";
import { TOUCH } from "@/ui/layout";
import { T } from "@/ui/T";

/**
 * بيانُ الزائر أوّلَ مرّة.
 *
 * **والجنسُ ليس حقلًا فضوليًّا**: الفعاليّةُ المقسومةُ تحجز به، والقاعدةُ ترفض الحجزَ
 * بـ`GENDER_REQUIRED` لمن لا جنسَ له. فهو شرطُ حجزٍ لا استمارةُ تعريف.
 *
 * والتحقّقُ هنا تيسيرٌ لا حراسة: `create_my_account_profile` تُعيد فحصَ الاسمِ عربيًّا
 * والجوّالِ صيغةً، وترفع `NAME_NOT_ARABIC` و`PHONE_INVALID`. فالرسالةُ تأتي من القاعدة
 * مترجمةً بـ`bookError`، ولا نُعيد كتابةَ قواعدها هنا فتفترقا.
 */
export function ProfileForm({ onDone }: { onDone: () => void | Promise<void> }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!fullName.trim() || !phone.trim() || !gender) {
      Alert.alert("بياناتٌ ناقصة", "أكمِل الاسمَ والجوّالَ والفئة.");
      return;
    }
    setBusy(true);
    const res = await createMyProfile({ fullName: fullName.trim(), phone: phone.trim(), gender });
    setBusy(false);
    if (!res.ok) Alert.alert("تعذّر الحفظ", res.message);
    else await onDone();
  };

  return (
    <View style={styles.card}>
      <T size="base" weight="bold">
        أكمِل بياناتك لتحجز
      </T>

      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="الاسم الثلاثيّ بالعربيّة"
        placeholderTextColor={color.neutral[400]}
        textAlign="right"
      />

      {/* الجوّالُ أرقامٌ لاتينيّة، فيُكتب من اليسار وإن كانت الشاشةُ عربيّة */}
      <TextInput
        style={[styles.input, styles.latin]}
        value={phone}
        onChangeText={setPhone}
        placeholder="05xxxxxxxx"
        placeholderTextColor={color.neutral[400]}
        keyboardType="phone-pad"
        textAlign="left"
      />

      <View style={styles.genders}>
        {(
          [
            { value: "male", label: "رجل" },
            { value: "female", label: "امرأة" },
          ] as const
        ).map((g) => (
          <Pressable
            key={g.value}
            onPress={() => setGender(g.value)}
            style={[styles.gender, gender === g.value && styles.genderOn]}
          >
            <T size="sm" weight="medium" color={gender === g.value ? color.onPrimary : color.text}>
              {g.label}
            </T>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.cta} onPress={() => void submit()} disabled={busy}>
        <T size="base" weight="medium" color={color.onPrimary}>
          {busy ? "جارٍ الحفظ" : "احفظ واحجز"}
        </T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    padding: space[4],
    gap: space[3],
  },
  input: {
    minHeight: TOUCH,
    borderRadius: radius.sm,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    backgroundColor: color.surface2,
    paddingHorizontal: space[3],
    fontFamily: "LyonArabicDisplay-Regular",
    fontSize: 16,
    color: color.text,
  },
  latin: { fontFamily: "ErasITC-Medium" },
  genders: { flexDirection: "row", gap: space[2] },
  gender: {
    flex: 1,
    minHeight: TOUCH,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    backgroundColor: color.surface2,
  },
  genderOn: { backgroundColor: color.primary, borderColor: color.primary },
  cta: {
    minHeight: TOUCH,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.base,
    backgroundColor: color.primary,
  },
});
