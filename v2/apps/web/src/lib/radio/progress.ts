/**
 * **تكملةُ ما سمعت** — موضعُ الاستماع في جهاز المستمع.
 *
 * الحلقةُ عندنا تبلغ إحدى وعشرين دقيقة، ومن خرج في منتصفها عاد فبدأ من أوّلها.
 * فيُحفَظ الموضعُ ويُستأنَف منه، وهو ما يفعله الخمسةُ الكبار كلُّهم.
 *
 * **ولا يُعلَن الاستئنافُ بشريطٍ ولا رسالة**: المشغّلُ داخلَ الصفحة يعرض الموضعَ
 * والموجةَ **قبل أن يُضغَط**، فالحالُ مرئيّةٌ في نفسها ولا تحتاج من يقولها.
 *
 * والقواعدُ ثلاثٌ، وكلُّها في `shouldResume` كي تُختبَر بلا متصفّح:
 *   • دون نصف دقيقةٍ لم يبدأ الاستماعُ أصلًا، فلا شيءَ يُستأنَف.
 *   • وما قارب النهايةَ حلقةٌ انتهت، ومن عاد إليها يريد إعادتَها لا خاتمتَها.
 *   • والمدّةُ المجهولة (‏`0`) لا يُحكَم عليها بالذيل، فيُستأنَف ما تجاوز الحدَّ الأدنى.
 *
 * والكتابةُ **مخنوقةٌ** بخمس ثوانٍ: `timeupdate` يقع أربعَ مرّاتٍ في الثانية،
 * فالكتابةُ عنده تعني آلافَ نداءاتِ `localStorage` في حلقةٍ واحدة.
 */
import { useSyncExternalStore } from "react";
import {
  PROGRESS_KEY,
  PROGRESS_LIMIT,
  RESUME_MIN_SECONDS,
  RESUME_TAIL_SECONDS,
} from "@adeeb/core";

/** خريطةُ معرّفِ حلقةٍ إلى موضعها. مرتّبةٌ بالإدخال، فأقدمُها أوّلُها. */
type Store = Record<string, number>;

const read = (): Store => {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Store) : {};
  } catch {
    return {}; // متصفّحٌ يمنع التخزين، أو قيمةٌ تلفت. والغيابُ حالٌ صحيحة.
  }
};

const write = (store: Store) => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
  } catch {
    /* مُنع التخزين (تصفّحٌ خاصّ)، فيسمع بلا تكملة ولا يُكسَر شيء */
  }
};

/**
 * أيُستأنَف من هذا الموضع؟ **دالّةٌ خالصةٌ** لا تمسّ المخزن، فهي موضعُ الحكم كلِّه
 * وتُختبَر وحدَها.
 */
export function shouldResume(at: number, duration: number): boolean {
  if (!Number.isFinite(at) || at < RESUME_MIN_SECONDS) return false;
  if (duration > 0 && at >= duration - RESUME_TAIL_SECONDS) return false;
  return true;
}

/** موضعُ حلقةٍ إن استحقّ الاستئناف، وإلّا صفر. */
export function resumeAt(episodeId: string, duration: number): number {
  const at = read()[episodeId] ?? 0;
  return shouldResume(at, duration) ? at : 0;
}

/**
 * يحفظ الموضع. **ولا يُحفَظ ما لا يُستأنَف**: ما دون الحدّ الأدنى وما قارب
 * النهايةَ يُمسَح بدل أن يُكتَب، فلا يمتلئ المخزنُ بمواضعَ لا تُقرأ أبدًا.
 */
export function saveProgress(episodeId: string, at: number, duration: number): void {
  const store = read();
  if (!shouldResume(at, duration)) {
    if (episodeId in store) {
      delete store[episodeId];
      write(store);
    }
    return;
  }
  // الحذفُ قبل الإضافة يرفع الحلقةَ إلى ذيل الترتيب، فتبقى الأقدمُ في رأسه.
  delete store[episodeId];
  store[episodeId] = Math.floor(at);
  const keys = Object.keys(store);
  for (const old of keys.slice(0, Math.max(0, keys.length - PROGRESS_LIMIT))) delete store[old];
  write(store);
}

/** تُمسَح عند الانتهاء: حلقةٌ سُمعت إلى آخرها تبدأ من أوّلها إن عاد إليها. */
export function clearProgress(episodeId: string): void {
  const store = read();
  if (!(episodeId in store)) return;
  delete store[episodeId];
  write(store);
}

/**
 * الموضعُ المحفوظ **للعرض قبل أن يبدأ التشغيل** — فالمشغّلُ داخلَ الصفحة يقول
 * «تُستأنَف من هنا» بموضع مؤشّره لا برسالةٍ تُكتب، وهو أهدأُ إعلانٍ ممكن.
 *
 * ويُقرأ بـ`useSyncExternalStore` لا بحالةٍ في أثر (سابقةُ `LikeEpisode`):
 * `localStorage` لا وجودَ له على الخادم، فلقطتُه هناك صفرٌ؛ ولو قُرئ في الرسم
 * لاختلف ما يُرسَل عمّا يُرسَم فتصرخ الترطيب، ولو نُسخ في أثرٍ لرُسم الشريطُ من
 * أوّله ثمّ قفز.
 *
 * والاشتراكُ لا يُنادى أبدًا: `localStorage` لا يُصدِر حدثًا في تبويبه، والقيمةُ
 * لا تُهمّ بعد أن يبدأ التشغيل (يصير الوقتُ حيًّا من العنصر لا من المخزن).
 */
export function useSavedPosition(episodeId: string, duration: number): number {
  return useSyncExternalStore(
    () => () => {},
    () => resumeAt(episodeId, duration),
    () => 0,
  );
}
