"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

const PREFIX = "adeeb:draft:";
/** سكوتُ الكاتب قبل الحفظ — أقصرُ من أن يضيع شيء، وأطولُ من أن يُكتب المخزنُ كلَّ ضغطة. */
const HUSH = 750;

/* المسّ بالمخزن يرمي في التصفّح الخاصّ وعند امتلاء الحصّة: المسوّدةُ رفاهيةٌ لا تُسقط النموذج. */
const read = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* لا شيء */ } };

/**
 * مسوّدةٌ محلّيّة لحقلٍ طويل — تنجو من إغلاق الصفحة وانقطاع الشبكة والكهرباء، لأنّها لا تعبر
 * الشبكة أصلًا: `localStorage` على جهاز الكاتب. وحدُّها من ذلك: **تلزم الجهاز والمتصفّح**،
 * فمن بدأ على جوّاله لا يجدها على حاسوبه (تلك مسوّدةٌ خادميّة، وثمنُها جدولٌ ودورةُ حياةٍ ثانية).
 *
 * **المخزن يُقرأ بـ`useSyncExternalStore` لا بأثرٍ يضع حالة:** الخادمُ لا يملك مخزنًا، فلقطتُه
 * `null` ثمّ يُعاد الرسمُ بعد الترطيب بما وُجد — لا فرقَ في الترطيب ولا رسمٌ متتالٍ (والقاعدة
 * الحاكمة: `setState` داخل أثرٍ ممنوعة، فالاستعادةُ **اشتقاقٌ** عند صاحب النموذج لا نسخٌ إليه).
 *
 * `value = null` تعني «لم يُكتب شيءٌ بعد» فلا يُحفَظ — وبها يُؤمَن سباقُ الترطيب: لو حُفظ الحاضرُ
 * قبل أن تصل لقطةُ المخزن لمحا المسوّدةَ التي جاء يستعيدها. و`key = null` يعطّلها كلَّها
 * (وضعُ المعاينة في `/ui` لا يخلّف أثرًا في جهاز المتصفّح).
 *
 * ولا يُخزَّن فارغٌ ولا نسخةٌ ممّا عند الخادم (`baseline`): المسوّدةُ ما زاد عن المحفوظ لا صداه.
 */
export function useDraft(key: string | null, value: string | null, baseline = "") {
  const listeners = useRef<Set<() => void>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subscribe = useCallback((cb: () => void) => {
    const set = listeners.current;
    set.add(cb);
    return () => { set.delete(cb); };
  }, []);

  const found = useSyncExternalStore(
    subscribe,
    useCallback(() => (key ? read(PREFIX + key) : null), [key]),
    () => null,
  );

  useEffect(() => {
    if (!key || value === null) return;
    // لا يُخزَّن فارغٌ ولا نسخةٌ ممّا عند الخادم (`baseline`): المسوّدةُ ما زاد عن المحفوظ لا صداه
    timer.current = setTimeout(() => write(PREFIX + key, value.trim() && value !== baseline ? value : ""), HUSH);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [key, value, baseline]);

  /**
   * تُنسي المسوّدة: تُمحى من المخزن ويسقط خبرُها. تُستدعى عند الإرسال الناجح وعند التجاهل.
   * وتُبطِل الكتابةَ المعلّقة أوّلًا — كتابةٌ مؤجَّلةٌ من آخر ضغطةٍ تبعث ما مُحي لو تُركت.
   */
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (key) write(PREFIX + key, "");
    listeners.current.forEach((cb) => cb());
  }, [key]);

  return { found, clear };
}
