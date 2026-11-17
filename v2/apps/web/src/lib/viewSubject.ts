import type { ViewSubject } from "@adeeb/core/tracking";

/**
 * **سجلُّ ما تعرضه الصفحةُ الآن** — بين `<ViewSubject>` الذي تضعه الصفحة، و`VisitTracker` الذي
 * يحمل الزيارة (٢٠٢٦-١١-١٧). انظر `ViewSubject` في `@adeeb/core/tracking` للقصّة.
 *
 * **مفتاحُه المسار** (`usePathname` في الطرفين): فالمتتبّعُ يسأل عن موضوع المسار الذي يسجّله، لا عن
 * «آخر ما أُعلن»، فلا تُنسب زيارةُ صفحةٍ إلى موضوع الصفحة التي قبلها في تنقّلٍ سريع.
 *
 * **والإعلانُ قد يسبق الزيارةَ أو يلحقها:** يسبقها في العادة (مؤثّرُ الصفحة يجري قبل مؤثّر المتتبّع،
 * والمتتبّعُ يتأخّر ٤٠٠ مللي ثانية)، ويلحقها إن تدفّقت الصفحةُ أو بطُؤ تصييرُها. فللسجلّ سؤالٌ
 * (`viewSubjectOf`) وإصغاءٌ (`onViewSubject`)، ويستعمل المتتبّعُ الاثنين.
 */

type Listener = (path: string, subject: ViewSubject) => void;

const declared = new Map<string, ViewSubject>();
const listeners = new Set<Listener>();

/** تُعلن الصفحةُ ما تعرضه. يعيد دالّةَ السحب، تُنادى عند مغادرتها. */
export function declareViewSubject(path: string, subject: ViewSubject): () => void {
  declared.set(path, subject);
  listeners.forEach((l) => {
    try {
      l(path, subject);
    } catch {
      /* مُصغٍ معطوبٌ لا يُسقط الصفحة */
    }
  });
  return () => {
    // لا يسحب إلّا إعلانَه هو: صفحةٌ جديدةٌ على المسار نفسه أعلنت بعده فلا يمحوها خروجُ القديمة.
    if (declared.get(path) === subject) declared.delete(path);
  };
}

/** ما أعلنته صفحةُ هذا المسار، أو `null`. */
export function viewSubjectOf(path: string): ViewSubject | null {
  return declared.get(path) ?? null;
}

/** يُصغي لكلّ إعلانٍ قادم. يعيد دالّةَ الكفّ. */
export function onViewSubject(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
