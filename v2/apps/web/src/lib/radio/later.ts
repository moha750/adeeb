"use client";

/**
 * **«اسمع لاحقًا»** — ما أجّله المستمع، محفوظًا **في جهازه** (قرارُ المالك
 * ٢٠٢٦-٠٨-٢٨: الجهازُ أوّلًا، ويهاجر إلى الحساب مع المتابعة).
 *
 * ولمَ لا حسابٌ من أوّل يوم؟ لأنّ الحساب **يُضاف ولا يُشترَط** في هذه المحطّة:
 * جمهورُ الإذاعة أكثرُه ليس أعضاءَ النادي، وجدارٌ عند فعلٍ صغيرٍ كهذا يعني أن
 * تعمل الميزةُ لأقلّيّة. وهي حجّةُ «تكملة ما سمعت» نفسُها، وقد صحّت هناك.
 *
 * ══ ولماذا معرّفاتٌ لا صفوفٌ كاملة ══
 * لو خُزّن الصفُّ كاملًا (عنوانٌ وغلافٌ ومدّة) لهرم: يبدّل المحرّرُ عنوانَ حلقةٍ
 * فيبقى القديمُ في جيب المستمع إلى الأبد. فيُخزَّن المعرّفُ وحدَه، ويُنخَل به
 * حوضٌ يرسله الخادمُ طازجًا — وهو نمطُ `ContinueRail` نفسُه في هذا القسم.
 *
 * ══ والحدُّ أربعون ══
 * قائمةٌ بلا حدٍّ تصير مقبرة: يؤجّل المستمعُ مئةً فلا يعود إلى واحدة. والأقدمُ
 * يسقط عند الامتلاء، فالمؤجَّلُ الحديثُ أقربُ إلى أن يُسمَع.
 *
 * **وخالصةُ المنطق** (`readIds`/`toggleIn`) تُختبَر بلا متصفّح.
 */
import { useSyncExternalStore } from "react";
import { LATER_KEY, LATER_LIMIT } from "@adeeb/core";

/** أحدثُ ما أُجّل أوّلًا. */
export function toggleIn(ids: string[], id: string, limit = LATER_LIMIT): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return [id, ...ids].slice(0, limit);
}

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(LATER_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return []; // متصفّحٌ يمنع التخزين، أو قيمةٌ تلفت. والغيابُ حالٌ صحيحة.
  }
};

const write = (ids: string[]) => {
  try {
    localStorage.setItem(LATER_KEY, JSON.stringify(ids));
  } catch {
    /* تصفّحٌ خاصّ: يعمل الزرُّ في الجلسة ولا يُحفَظ */
  }
};

/* مشتركون في الذاكرة: الزرُّ في صفّ الحلقة والرفُّ في الواجهة يريان الحالَ نفسَه
   في اللحظة نفسِها، ولا ينتظر أحدُهما إعادةَ تحميل. و`storage` للتبويبات الأخرى. */
const listeners = new Set<() => void>();
let snapshot: string[] | null = null;

const notify = () => listeners.forEach((f) => f());

function subscribe(f: () => void) {
  listeners.add(f);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LATER_KEY) {
      snapshot = null;
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(f);
    window.removeEventListener("storage", onStorage);
  };
}

/** لقطةٌ مستقرّة: `useSyncExternalStore` يقارن بالمرجع، فقراءةٌ جديدةٌ كلَّ مرّة تدور بلا نهاية. */
function getSnapshot(): string[] {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

/** الخادمُ لا مخزنَ عنده، ولقطتُه ثابتةٌ فلا تصرخ الترطيب. */
const EMPTY: string[] = [];
const getServerSnapshot = () => EMPTY;

/** كلُّ ما أُجّل، الأحدثُ أوّلًا. */
export function useLater(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** أمؤجَّلةٌ هي؟ */
export function useIsLater(episodeId: string): boolean {
  return useLater().includes(episodeId);
}

/** يؤجّلها أو يرفع التأجيل. */
export function toggleLater(episodeId: string) {
  snapshot = toggleIn(getSnapshot(), episodeId);
  write(snapshot);
  notify();
}
