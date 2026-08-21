import { color, space, stroke } from "@adeeb/theme-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

import { useAuth } from "@/auth/AuthProvider";
import { env } from "@/lib/env";
import { ArrowClockwiseIcon, CaretLeftIcon } from "@/ui/glyphs";
import { TOUCH } from "@/ui/layout";
import { Note } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * الغرفُ الإداريّة — **ويبيّةٌ محقونةٌ أوّلًا**، وهو قرارٌ مكتوبٌ في `MOBILE-APP-PLAN.md`.
 *
 * وسببُه أنّ ترحيلَ ٢٠٢٦-٠٨-٠٦ نزع صلاحيّةَ التنفيذ عن **تسعٍ وثلاثين دالّةً** تأخذ
 * `p_actor`، فصارت كلُّ كتابةٍ إداريّةٍ تمرّ بفعلٍ خادميّ. فالغرفةُ الأصيلةُ تحتاج طبقةَ
 * واجهةٍ برمجيّةٍ جديدةً بالكامل، والعرضُ يعطيك البوّابةَ كلَّها اليوم بتصميم اللوحة
 * المُقَرّ، ثمّ تُهاجَر غرفةً غرفةً بترتيب الاستعمال الذي يقيسه التطبيق لا بترتيبٍ نخمّنه.
 *
 * **والجلسةُ تُحمَل ولا تُطلَب**: رمزُك من Keychain يمرّ إلى `/app-bridge` في جزء العنوان،
 * فتكتبه الصفحةُ كوكيزَ بالعميل الرسميّ. فلا دخولَ ثانٍ، ولا رمزَ يُرسَل إلى خادمٍ في
 * استعلامٍ يُسجَّل.
 *
 * وما خرج عن نطاق الموقع يُفتح في متصفّح النظام لا هنا: هذا عرضُ غرفةٍ لا متصفّحٌ عامّ.
 */
export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const ref = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [canBack, setCanBack] = useState(false);

  /**
   * العنوانُ يُشتقّ من الجلسة في الرسم لا في أثر: ليس حالةً تُخزَّن بل حسابٌ من مُدخَل،
   * وتخزينُه يعني رسمتين ووميضًا بينهما. (وقاعدةُ eslint تمنع الإسنادَ في الأثر لهذا.)
   */
  const access = session?.access_token;
  const refresh = session?.refresh_token;
  const uri =
    access && refresh
      ? `${env.siteUrl}/app-bridge#${new URLSearchParams({
          access_token: access,
          refresh_token: refresh,
          next: "/dashboard",
        }).toString()}`
      : null;

  // زرُّ الرجوع الأصيل في أندرويد يرجع داخل الغرفة قبل أن يخرج منها
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canBack) return false;
      ref.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, [canBack]);

  /** الخروجُ من نطاق الموقع يُسلَّم إلى النظام: بريدٌ أو خريطةٌ أو موقعُ جهةٍ أخرى. */
  const gate = useCallback((req: WebViewNavigation) => {
    const url = req.url ?? "";
    if (url.startsWith(env.siteUrl) || url.startsWith("about:")) return true;
    void Linking.openURL(url);
    return false;
  }, []);

  if (!session) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space[4], paddingHorizontal: space[5] }]}>
        <Note>ادخل بحسابك لتفتح غرفَ الإدارة.</Note>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable
          style={styles.btn}
          disabled={!canBack}
          onPress={() => ref.current?.goBack()}
          accessibilityLabel="رجوع"
        >
          <CaretLeftIcon size={20} color={canBack ? color.text : color.textMuted} />
        </Pressable>
        <T size="sm" weight="medium" style={{ flex: 1 }}>
          الإدارة
        </T>
        <Pressable style={styles.btn} onPress={() => ref.current?.reload()} accessibilityLabel="تحديث">
          <ArrowClockwiseIcon size={20} color={color.text} />
        </Pressable>
      </View>

      {uri ? (
        <WebView
          ref={ref}
          source={{ uri }}
          style={styles.web}
          // الكوكيزُ تُشارَك وتبقى، وإلّا كتب الجسرُ جلسةً تضيع عند أوّل انتقال
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          originWhitelist={[`${env.siteUrl}/*`]}
          onShouldStartLoadWithRequest={gate}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(s) => setCanBack(s.canGoBack)}
          startInLoadingState={false}
          allowsBackForwardNavigationGestures
        />
      ) : null}

      {loading ? (
        <View style={styles.veil}>
          <ActivityIndicator color={color.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: space[3],
    borderBottomWidth: stroke.w,
    borderBottomColor: color.cardStroke,
    backgroundColor: color.surface,
  },
  btn: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" },
  web: { flex: 1, backgroundColor: color.bg },
  veil: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.bg,
  },
});
