import { createAdeebMobileClient, type AdeebSessionStore } from "@adeeb/core";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";

import { env } from "./env";

/**
 * عميلُ Supabase للتطبيق — نفسُ المشروع الذي يخدم الموقع، بمفتاح anon نفسِه.
 * كلُّ ما يُقرأ ويُكتب من هنا يمرّ على RLS، فالتطبيقُ لا يملك امتيازًا لا يملكه المتصفّح.
 */

/**
 * الجلسةُ في `expo-secure-store`: Keychain على iOS وKeystore على أندرويد.
 * وهي رمزُ دخولٍ حقيقيّ، فلا تُترك في `AsyncStorage` المكشوف على جهازٍ مكسور الحماية.
 */
const store: AdeebSessionStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createAdeebMobileClient(env.supabaseUrl, env.supabaseAnonKey, store);

/**
 * تجديدُ الرمز يتبع حياةَ التطبيق لا مؤقّتًا أعمى.
 *
 * `autoRefreshToken` وحدَه يفترض صفحةً حيّةً كصفحة المتصفّح. والتطبيقُ يُجمَّد في الخلفيّة،
 * فيبقى المؤقّتُ معلّقًا ثمّ يستيقظ المستخدِمُ برمزٍ منتهٍ وشاشةٍ فارغة. فيُوقَف عند الخلفيّة
 * ويُستأنَف عند العودة، ووقتَها يُجدَّد فورًا.
 */
AppState.addEventListener("change", (state) => {
  if (state === "active") void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
