import { useSyncExternalStore } from "react";

/**
 * **حالُ ديبو في بابَي الحساب** (قرار المالك ٢٠٢٦-١٠-١٨) — النموذجُ يقول ما يجري، واللوحُ
 * (`DeeboStage`) يُري ديبو يعيشه. مخزنٌ صغيرٌ واحد لا سياق: النموذجُ واللوحُ أخَوان في الصفحة لا
 * أبٌ وابن، فيكتب الأوّلُ ويقرأ الثاني بلا تمرير.
 */
export type DeeboMood =
  | "idle" // يحيّي
  | "email" // يُصغي وأنت تكتب بريدك أو رمزك
  | "password" // يُغمض عينيه
  | "busy" // يفكّر ريثما يردّ الخادم
  | "wait" // ينتظر عودتك من قوقل أو وصولَ الرمز
  | "error" // يعتذر
  | "none" // لم يجد لك حسابًا
  | "success"; // يحتفل

let mood: DeeboMood = "idle";
const subs = new Set<() => void>();

export function setDeeboMood(next: DeeboMood): void {
  if (next === mood) return;
  mood = next;
  subs.forEach((f) => f());
}

export function useDeeboMood(): DeeboMood {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => mood,
    () => "idle",
  );
}

/** مهلةُ الاحتفال قبل الانتقال — تكفي لترى ديبو يفرح ولا تؤخّر أحدًا. */
export const CELEBRATE_MS = 650;
