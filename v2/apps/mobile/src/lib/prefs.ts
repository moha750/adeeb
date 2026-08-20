import { DEVICE_KEY, LIKED_KEY, MUSIC_LEVEL_KEY } from "@adeeb/core";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * تفضيلاتٌ محلّيّةٌ تُقرأ متزامنةً.
 *
 * الويبُ يقرأ `localStorage` في كلّ رسمةٍ بلا كلفة، و`AsyncStorage` وعدٌ لا يُقرأ في
 * الرسم. فلو انتظرنا الوعدَ داخل أثرٍ لرُسم المشغّلُ مرّةً بالافتراضيّ ثمّ أُعيد رسمُه
 * بقيمة صاحبه، فتُرى قفزةُ المقبض. لذلك: نسخةٌ في الذاكرة تُملأ **مرّةً عند الإقلاع**،
 * والقراءةُ بعدها متزامنةٌ كالويب، والكتابةُ تُحدّث النسخةَ فورًا ثمّ تُثبَّت في القرص.
 *
 * والمفاتيحُ نفسُها التي يستعملها الويب، فما تعلّمه المستمعُ هناك يعرفه هنا لو وُحّدا يومًا.
 */

const KEYS = [MUSIC_LEVEL_KEY, DEVICE_KEY, LIKED_KEY] as const;
export type PrefKey = (typeof KEYS)[number];

const cache = new Map<PrefKey, string | null>();
const listeners = new Set<() => void>();
let ready = false;

/** تُنادى مرّةً في جذر التطبيق قبل أوّل رسمة. */
export async function loadPrefs(): Promise<void> {
  if (ready) return;
  const pairs = await AsyncStorage.multiGet(KEYS as unknown as string[]);
  for (const [key, value] of pairs) cache.set(key as PrefKey, value);
  ready = true;
  listeners.forEach((cb) => cb());
}

export function readPref(key: PrefKey): string | null {
  return cache.get(key) ?? null;
}

export function writePref(key: PrefKey, value: string): void {
  cache.set(key, value);
  // الكتابةُ في القرص لا تُنتظَر: النسخةُ في الذاكرة هي المصدرُ أثناء الجلسة،
  // وفشلُ القرص لا يجوز أن يعيد المقبضَ إلى مكانه أمام عينَي المستمع.
  void AsyncStorage.setItem(key, value).catch(() => {});
  listeners.forEach((cb) => cb());
}

export function subscribePrefs(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export const prefsReady = () => ready;
