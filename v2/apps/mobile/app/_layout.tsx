import { color } from "@adeeb/theme-native";
import { setAudioModeAsync } from "expo-audio";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { I18nManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/auth/AuthProvider";
import { loadPrefs } from "@/lib/prefs";
import { getStation } from "@/lib/radio";
import { MiniPlayer } from "@/player/MiniPlayer";
import { RadioPlayerProvider } from "@/player/PlayerProvider";
import { IconDefaults } from "@/ui/icons";

/**
 * جذرُ التطبيق.
 *
 * **المشغّلُ يعيش هنا لا في شاشة.** هذا هو الفرقُ الذي من أجله بُني التطبيق أصيلًا:
 * تخطيطُ الجذر يبقى مركَّبًا وأنت تتنقّل بين الإذاعة والأنشطة وحسابك، فيبقى الصوت.
 * ولو سكن المشغّلُ شاشةً لانقطع عند أوّل نقرة.
 *
 * والعربيّةُ مفروضةٌ من الطبقة الأصيلة بإضافة `expo-localization`، لا بـ`I18nManager`
 * عند الإقلاع: الأخيرةُ تستلزم إعادةَ تشغيلٍ يراها المستخدِمُ وميضًا في أوّل فتحة.
 */
export default function RootLayout() {
  const [stationName, setStationName] = useState("إذاعة أديب");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!I18nManager.isRTL && __DEV__) {
      console.warn("⚠️ التطبيقُ يعمل من اليسار: إضافةُ expo-localization لم تُطبَّق. أعِد `expo prebuild`.");
    }

    /**
     * الإذاعةُ تُسمَع والشاشةُ مغلقة، ولا يُسكتها مفتاحُ الرنين.
     *
     * و`doNotMix` ليست تشدّدًا: iOS **لا يسلّم شاشةَ القفل** إلّا لمن يدّعي الصوتَ
     * الأوّل. و`duckOthers` تقول للنظام إنّنا صوتٌ ثانويٌّ يخفت لغيره (تنبيهُ ملاحةٍ
     * أو مؤثّرٌ)، فلا يُعطى صاحبُها مركزَ «قيد التشغيل» ولا أزرارَ السمّاعة.
     * جُرّب فلم تظهر شاشةُ القفل، وهذا سببُه.
     *
     * والإذاعةُ حديثٌ يُصغى إليه لا سريرٌ خلفيّ: أن تُسكِت ما قبلها هو الصحيح.
     */
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
      shouldRouteThroughEarpiece: false,
    });

    // التفضيلاتُ تُقرأ مرّةً قبل أوّل رسمة، فلا تُرى قفزةُ مقبض الموسيقى
    void loadPrefs().finally(() => setReady(true));

    void getStation().then((s) => {
      if (s?.name) setStationName(s.name);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <IconDefaults>
          <AuthProvider>
            <RadioPlayerProvider stationName={stationName}>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: color.bg },
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="episode/[id]" options={{ animation: "slide_from_bottom" }} />
                <Stack.Screen name="activity/[id]" options={{ animation: "slide_from_bottom" }} />
              </Stack>
              {ready ? <MiniPlayer /> : null}
            </RadioPlayerProvider>
          </AuthProvider>
        </IconDefaults>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
